import { z } from "zod";

import { N11Client, type N11ShipmentPackage, type N11ShipmentPackageLine } from "@/modules/integration/connectors/n11.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

const importPayloadSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.string().trim().min(1).max(80).optional().default("Created"),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  maxPages: z.coerce.number().int().min(1).max(100).optional(),
});

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRawObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeLine(line: N11ShipmentPackageLine, index: number) {
  const externalLineId = String(line.orderLineId ?? line.stockCode ?? line.barcode ?? index);
  const quantity = Math.max(Math.trunc(readNumber(line.quantity) ?? 1), 1);
  const unitPrice = readNumber(line.sellerInvoiceAmount) ?? readNumber(line.price);

  return {
    externalLineId,
    merchantSku: readString(line.stockCode),
    barcode: readString(line.barcode),
    productName: readString(line.productName) ?? "N11 urunu",
    quantity,
    unitPrice,
    currency: "TRY",
    rawPayload: line,
  };
}

function normalizePackage(configId: string, item: N11ShipmentPackage) {
  const externalPackageId = readString(item.id == null ? null : String(item.id)) ?? readString(item.orderNumber == null ? null : String(item.orderNumber));
  const externalOrderNumber = readString(item.orderNumber == null ? null : String(item.orderNumber)) ?? externalPackageId;

  if (!externalPackageId || !externalOrderNumber) {
    throw new Error("N11_PACKAGE_MISSING_ID");
  }

  const lastModifiedDate = readNumber(item.lastModifiedDate);

  return {
    channel: "N11" as const,
    configId,
    externalPackageId,
    externalOrderNumber,
    packageStatus: readString(item.shipmentPackageStatus) ?? "UNKNOWN",
    orderDate: lastModifiedDate ? new Date(lastModifiedDate) : null,
    lastModifiedDate: lastModifiedDate ? new Date(lastModifiedDate) : null,
    customerName: readString(item.customerfullName),
    customerEmail: readString(item.customerEmail),
    shipmentAddress: normalizeRawObject(item.shippingAddress),
    invoiceAddress: normalizeRawObject(item.billingAddress),
    cargoProviderName: readString(item.cargoProviderName),
    cargoTrackingNumber: readString(item.cargoTrackingNumber),
    externalCargoCompanyId: item.shipmentCompanyId == null ? null : String(item.shipmentCompanyId),
    cargoSenderNumber: item.cargoSenderNumber == null ? null : String(item.cargoSenderNumber),
    cargoTrackingLink: readString(item.cargoTrackingLink),
    shipmentMethod: item.shipmentMethod == null ? null : String(item.shipmentMethod),
    rawPayload: item,
    lines: (item.lines ?? []).map(normalizeLine),
  };
}

export class N11OrderImportService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async importShipmentPackages(input: { configId: string; payload?: Record<string, unknown> | null }) {
    const config = await this.repository.findActiveConfigById(input.configId);

    if (!config || config.channel !== "N11") {
      throw new Error("N11_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const payload = importPayloadSchema.parse(input.payload ?? {});
    const now = new Date();
    const endDate = payload.endDate ? new Date(payload.endDate) : now;
    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : new Date((config.lastCursorAt ?? new Date(now.getTime() - config.syncWindowMinutes * 60000)).getTime() - 5 * 60000);

    const client = new N11Client({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });

    const packages = await client.getShipmentPackages({
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

export const n11OrderImportService = new N11OrderImportService();
