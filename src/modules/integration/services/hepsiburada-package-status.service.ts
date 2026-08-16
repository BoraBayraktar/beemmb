import { z } from "zod";

import { HepsiburadaClient } from "@/modules/integration/connectors/hepsiburada.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { syncOrderShipmentFromPackageStatus } from "@/modules/integration/services/marketplace-package-shipment-sync.service";

const connectorStatusSyncPayloadSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("Picking"),
    barcode: z.string().trim().min(1).max(120).optional(),
    cargoCompany: z.string().trim().min(1).max(120).optional(),
    carrier: z.string().trim().min(1).max(120).optional(),
    creationReason: z.string().trim().min(1).max(120).optional(),
    deci: z.coerce.number().nonnegative().optional(),
    parcelQuantity: z.coerce.number().int().nonnegative().optional(),
    warehouse: z.object({
      shippingAddressLabel: z.string().trim().min(1).max(120).optional(),
      shippingModel: z.string().trim().min(1).max(120).optional(),
    }).optional(),
  }),
  z.object({
    status: z.literal("Invoiced"),
    invoiceLink: z.string().trim().url(),
    invoiceArrangementDate: z.string().trim().min(1).max(80).optional(),
    invoiceRowNumber: z.string().trim().min(1).max(80).optional(),
    invoiceSerialNumber: z.string().trim().min(1).max(80).optional(),
  }),
]);

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolvePackageNumber(payload: Record<string, unknown>, fallback: string) {
  return readString(payload.packageNumber)
    ?? readString(payload.packageNo)
    ?? readString(payload.id)
    ?? readString(payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>).packageNumber : null)
    ?? fallback;
}

export class HepsiburadaPackageStatusService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async syncPackageStatus(input: { packageId: string; payload?: Record<string, unknown> | null }) {
    const parsed = connectorStatusSyncPayloadSchema.parse(input.payload ?? {});
    const item = await this.repository.findPackageForOutbound(input.packageId);

    if (!item) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (item.channel !== "HEPSIBURADA") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    const apiKey = integrationSecretCryptoService.decrypt(item.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(item.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !item.config.userAgent) {
      throw new Error("HEPSIBURADA_CONFIG_INCOMPLETE");
    }

    const client = new HepsiburadaClient({
      merchantId: item.config.sellerId,
      apiKey,
      apiSecret,
      userAgent: item.config.userAgent,
      endpointUrl: item.config.endpointUrl,
    });

    if (parsed.status === "Invoiced") {
      const result = await client.sendInvoiceLink({
        packageNumber: item.externalPackageId,
        arrangementDate: parsed.invoiceArrangementDate,
        invoiceLink: parsed.invoiceLink,
        rowNumber: parsed.invoiceRowNumber,
        serialNumber: parsed.invoiceSerialNumber,
      });

      await this.repository.updatePackageExternalStatus({
        packageId: item.id,
        packageStatus: parsed.status,
      });

      await syncOrderShipmentFromPackageStatus({
        matchedOrderId: item.matchedOrderId,
        targetStatus: parsed.status,
      });

      return {
        providerKey: "hepsiburada",
        externalReference: item.externalPackageId,
        responsePayload: {
          documentStatus: "SENT",
          hepsiburadaStatus: parsed.status,
          packageNumber: item.externalPackageId,
          invoiceLink: parsed.invoiceLink,
          result,
        },
      };
    }

    const lineItemIds = item.lines.map((line) => line.externalLineId).filter(Boolean);

    if (lineItemIds.length === 0) {
      throw new Error("HEPSIBURADA_PACKAGE_LINE_ITEM_REQUIRED");
    }

    const packageableWith = await client.listPackageableWith(lineItemIds[0]);
    const result = await client.createPackage({
      barcode: parsed.barcode,
      cargoCompany: parsed.cargoCompany,
      carrier: parsed.carrier,
      creationReason: parsed.creationReason,
      deci: parsed.deci,
      parcelQuantity: parsed.parcelQuantity,
      warehouse: parsed.warehouse,
      lineItemRequests: item.lines.map((line) => ({
        id: line.externalLineId,
        quantity: line.quantity,
      })),
    });

    const packageNumber = resolvePackageNumber(result, item.externalPackageId);

    await this.repository.updatePackageExternalStatus({
      packageId: item.id,
      packageStatus: parsed.status,
    });

    await syncOrderShipmentFromPackageStatus({
      matchedOrderId: item.matchedOrderId,
      targetStatus: parsed.status,
    });

    return {
      providerKey: "hepsiburada",
      externalReference: packageNumber,
      responsePayload: {
        documentStatus: "SENT",
        hepsiburadaStatus: parsed.status,
        packageNumber,
        lineItemCount: lineItemIds.length,
        packageableWith,
        result,
      },
    };
  }
}

export const hepsiburadaPackageStatusService = new HepsiburadaPackageStatusService();
