import { z } from "zod";

import { TrendyolClient } from "@/modules/integration/connectors/trendyol.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { syncOrderShipmentFromPackageStatus } from "@/modules/integration/services/marketplace-package-shipment-sync.service";

const connectorStatusSyncPayloadSchema = z.object({
  status: z.enum(["Picking", "Invoiced"]),
  invoiceNumber: z.string().trim().min(1).max(120).optional(),
}).refine((value) => value.status !== "Invoiced" || Boolean(value.invoiceNumber), {
  message: "Invoice number is required for Invoiced status",
});

export class TrendyolPackageStatusService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async syncPackageStatus(input: { packageId: string; payload?: Record<string, unknown> | null }) {
    const parsed = connectorStatusSyncPayloadSchema.parse(input.payload ?? {});
    const item = await this.repository.findPackageForOutbound(input.packageId);

    if (!item) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (item.channel !== "TRENDYOL") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    const apiKey = integrationSecretCryptoService.decrypt(item.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(item.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !item.config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const client = new TrendyolClient({
      sellerId: item.config.sellerId,
      apiKey,
      apiSecret,
      userAgent: item.config.userAgent,
      storeFrontCode: item.config.storeFrontCode,
      endpointUrl: item.config.endpointUrl,
    });
    const result = await client.updatePackageStatus({
      packageId: item.externalPackageId,
      status: parsed.status,
      invoiceNumber: parsed.invoiceNumber,
      lines: item.lines.map((line) => ({
        lineId: line.externalLineId,
        quantity: line.quantity,
      })),
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
      providerKey: "trendyol",
      externalReference: item.externalPackageId,
      responsePayload: {
        documentStatus: "SENT",
        trendYolStatus: parsed.status,
        ...result,
      },
    };
  }
}

export const trendyolPackageStatusService = new TrendyolPackageStatusService();
