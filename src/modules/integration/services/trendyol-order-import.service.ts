import { z } from "zod";

import { TrendyolClient, type TrendyolShipmentPackage, type TrendyolShipmentPackageLine } from "@/modules/integration/connectors/trendyol.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

const importPayloadSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.string().trim().min(1).max(80).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  maxPages: z.coerce.number().int().min(1).max(100).optional(),
});

export type TrendyolOrderImportInput = {
  configId: string;
  payload?: Record<string, unknown> | null;
};

export type TrendyolOrderImportResult = {
  importedPackages: number;
  readyForOrder: number;
  needsReview: number;
  cursorAt: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fromTrendyolTimestamp(value: unknown) {
  const timestamp = readNumber(value);

  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRawObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeLine(line: TrendyolShipmentPackageLine, index: number) {
  const externalLineId = String(line.id ?? line.barcode ?? line.merchantSku ?? line.sku ?? index);
  const quantity = Math.max(Math.trunc(readNumber(line.quantity) ?? 1), 1);
  const unitPrice = readNumber(line.amount) ?? readNumber(line.price);

  return {
    externalLineId,
    merchantSku: readString(line.merchantSku) ?? readString(line.sku),
    barcode: readString(line.barcode),
    productName: readString(line.productName) ?? "Trendyol ürünü",
    quantity,
    unitPrice,
    currency: readString(line.currencyCode) ?? "TRY",
    rawPayload: line,
  };
}

function normalizePackage(configId: string, item: TrendyolShipmentPackage) {
  const externalPackageId = String(item.id ?? item.orderNumber ?? "");
  const externalOrderNumber = readString(item.orderNumber) ?? externalPackageId;
  const customerName = [readString(item.customerFirstName), readString(item.customerLastName)]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!externalPackageId || !externalOrderNumber) {
    throw new Error("TRENDYOL_PACKAGE_MISSING_ID");
  }

  return {
    channel: "TRENDYOL" as const,
    configId,
    externalPackageId,
    externalOrderNumber,
    packageStatus: readString(item.status) ?? "UNKNOWN",
    orderDate: fromTrendyolTimestamp(item.orderDate),
    lastModifiedDate: fromTrendyolTimestamp(item.packageLastModifiedDate),
    customerName: customerName || null,
    customerEmail: readString(item.customerEmail),
    shipmentAddress: normalizeRawObject(item.shipmentAddress),
    invoiceAddress: normalizeRawObject(item.invoiceAddress),
    cargoProviderName: readString(item.cargoProviderName),
    cargoTrackingNumber: readString(item.cargoTrackingNumber),
    rawPayload: item,
    lines: (item.lines ?? []).map(normalizeLine),
  };
}

export class TrendyolOrderImportService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async importShipmentPackages(input: TrendyolOrderImportInput): Promise<TrendyolOrderImportResult> {
    const config = await this.repository.findActiveConfigById(input.configId);

    if (!config || config.channel !== "TRENDYOL") {
      throw new Error("TRENDYOL_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const payload = importPayloadSchema.parse(input.payload ?? {});
    const now = new Date();
    const endDate = payload.endDate ? new Date(payload.endDate) : now;
    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : new Date((config.lastCursorAt ?? new Date(now.getTime() - config.syncWindowMinutes * 60000)).getTime() - 5 * 60000);

    const client = new TrendyolClient({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      endpointUrl: config.endpointUrl,
    });

    // Periyodik senkronizasyon (cron/manuel "şimdi senkronize et") tam bir zaman penceresini taradığından,
    // Trendyol'un 10.000 kayıtlık page/size penceresine takılmamak için cursor tabanlı stream endpoint'i kullanılır.
    const packages = await client.getShipmentPackagesStream({
      startDate,
      endDate,
      status: payload.status,
      pageSize: payload.pageSize,
      maxPages: payload.maxPages,
    });

    let readyForOrder = 0;
    let needsReview = 0;
    let cursorAt: Date | null = null;

    for (const item of packages) {
      const normalized = normalizePackage(config.id, item);
      const saved = await this.repository.upsertPackage(normalized);

      if (saved.importStatus === "READY_FOR_ORDER") {
        readyForOrder += 1;
      } else {
        needsReview += 1;
      }

      if (normalized.lastModifiedDate && (!cursorAt || normalized.lastModifiedDate > cursorAt)) {
        cursorAt = normalized.lastModifiedDate;
      }
    }

    await this.repository.markConfigSynced({
      id: config.id,
      cursorAt: cursorAt ?? endDate,
      syncedAt: now,
    });

    return {
      importedPackages: packages.length,
      readyForOrder,
      needsReview,
      cursorAt: (cursorAt ?? endDate).toISOString(),
    };
  }
}

export const trendyolOrderImportService = new TrendyolOrderImportService();
