import { z } from "zod";

import { N11_CANCEL_REASON_IDS, N11Client } from "@/modules/integration/connectors/n11.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { n11OrderImportService } from "@/modules/integration/services/n11-order-import.service";

const splitPackageSchema = z.object({
  packageId: z.string().trim().min(1),
  splits: z.array(z.object({
    lineId: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
  cancellations: z.array(z.object({
    lineId: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    cancelReasonId: z.coerce.number().int().refine((value) => (N11_CANCEL_REASON_IDS as readonly number[]).includes(value), {
      message: "Gecersiz iptal nedeni",
    }),
  })).optional(),
});

export class N11PackageSplitService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async splitPackage(input: unknown) {
    const parsed = splitPackageSchema.parse(input);
    const targetPackage = await this.repository.findPackageForSplit(parsed.packageId);

    if (!targetPackage) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (targetPackage.channel !== "N11") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    if (targetPackage.packageStatus !== "Picking") {
      throw new Error("N11_PACKAGE_SPLIT_STATUS_INVALID");
    }

    const apiKey = integrationSecretCryptoService.decrypt(targetPackage.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(targetPackage.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const lineMap = new Map(targetPackage.lines.map((line) => [line.id, line]));
    const cancellations = parsed.cancellations ?? [];

    const combinedQuantityByLineId = new Map<string, number>();
    for (const split of parsed.splits) {
      combinedQuantityByLineId.set(split.lineId, (combinedQuantityByLineId.get(split.lineId) ?? 0) + split.quantity);
    }
    for (const cancellation of cancellations) {
      combinedQuantityByLineId.set(cancellation.lineId, (combinedQuantityByLineId.get(cancellation.lineId) ?? 0) + cancellation.quantity);
    }

    for (const [lineId, combinedQuantity] of combinedQuantityByLineId) {
      const line = lineMap.get(lineId);

      if (!line) {
        throw new Error("MARKETPLACE_LINE_NOT_FOUND");
      }

      if (combinedQuantity > line.quantity) {
        throw new Error("N11_PACKAGE_SPLIT_QUANTITY_INVALID");
      }
    }

    const packageDetails = parsed.splits.map((split) => ({
      orderLineId: lineMap.get(split.lineId)!.externalLineId,
      quantities: split.quantity,
    }));
    const cancelledItems = cancellations.map((cancellation) => ({
      orderLineId: lineMap.get(cancellation.lineId)!.externalLineId,
      quantity: cancellation.quantity,
      cancelReasonId: cancellation.cancelReasonId,
    }));

    const client = new N11Client({
      sellerId: targetPackage.config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: targetPackage.config.endpointUrl,
    });

    const result = await client.splitPackageByQuantity([
      {
        packageDetails,
      },
    ], cancelledItems);

    await n11OrderImportService.importShipmentPackages({
      configId: targetPackage.configId,
      payload: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        maxPages: 10,
      },
    });

    return {
      ok: true,
      refreshedPackageId: parsed.packageId,
      responsePayload: result,
    };
  }
}

export const n11PackageSplitService = new N11PackageSplitService();
