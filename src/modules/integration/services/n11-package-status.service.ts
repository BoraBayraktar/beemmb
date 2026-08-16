import { z } from "zod";

import { N11Client } from "@/modules/integration/connectors/n11.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { syncOrderShipmentFromPackageStatus } from "@/modules/integration/services/marketplace-package-shipment-sync.service";

const connectorStatusSyncPayloadSchema = z.object({
  status: z.literal("Picking"),
});

export class N11PackageStatusService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async syncPackageStatus(input: { packageId: string; payload?: Record<string, unknown> | null }) {
    const parsed = connectorStatusSyncPayloadSchema.parse(input.payload ?? {});
    const item = await this.repository.findPackageForOutbound(input.packageId);

    if (!item) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (item.channel !== "N11") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    const apiKey = integrationSecretCryptoService.decrypt(item.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(item.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const client = new N11Client({
      sellerId: item.config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: item.config.endpointUrl,
    });

    const result = await client.updateOrderLinesToPicking(item.lines.map((line) => line.externalLineId));

    await this.repository.updatePackageExternalStatus({
      packageId: item.id,
      packageStatus: parsed.status,
    });

    await syncOrderShipmentFromPackageStatus({
      matchedOrderId: item.matchedOrderId,
      targetStatus: parsed.status,
    });

    return {
      providerKey: "n11",
      externalReference: item.externalPackageId,
      responsePayload: {
        documentStatus: "SENT",
        n11Status: parsed.status,
        ...result,
      },
    };
  }
}

export const n11PackageStatusService = new N11PackageStatusService();
