import { z } from "zod";

import { TrendyolClient } from "@/modules/integration/connectors/trendyol.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { trendyolOrderImportService } from "@/modules/integration/services/trendyol-order-import.service";

export const TRENDYOL_UNSUPPLIED_REASON_IDS = [500, 501, 502, 504, 505, 506] as const;

const cancelUnsuppliedItemsSchema = z.object({
  packageId: z.string().trim().min(1),
  lines: z.array(z.object({
    lineId: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
  reasonId: z.coerce.number().int().refine((value) => (TRENDYOL_UNSUPPLIED_REASON_IDS as readonly number[]).includes(value), {
    message: "Geçersiz tedarik edememe nedeni",
  }),
});

export class TrendyolUnsuppliedService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async cancelUnsuppliedItems(input: unknown) {
    const parsed = cancelUnsuppliedItemsSchema.parse(input);
    const targetPackage = await this.repository.findPackageForSplit(parsed.packageId);

    if (!targetPackage) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (targetPackage.channel !== "TRENDYOL") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    if (targetPackage.packageStatus === "Invoiced" || targetPackage.packageStatus === "Shipped" || targetPackage.packageStatus === "Delivered" || targetPackage.packageStatus === "Cancelled") {
      throw new Error("TRENDYOL_PACKAGE_UNSUPPLIED_STATUS_INVALID");
    }

    const apiKey = integrationSecretCryptoService.decrypt(targetPackage.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(targetPackage.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !targetPackage.config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const lineMap = new Map(targetPackage.lines.map((line) => [line.id, line]));
    const lines = parsed.lines.map((entry) => {
      const line = lineMap.get(entry.lineId);

      if (!line) {
        throw new Error("MARKETPLACE_LINE_NOT_FOUND");
      }

      if (entry.quantity > line.quantity) {
        throw new Error("TRENDYOL_PACKAGE_UNSUPPLIED_QUANTITY_INVALID");
      }

      return {
        lineId: line.externalLineId,
        quantity: entry.quantity,
      };
    });

    const client = new TrendyolClient({
      sellerId: targetPackage.config.sellerId,
      apiKey,
      apiSecret,
      userAgent: targetPackage.config.userAgent,
      storeFrontCode: targetPackage.config.storeFrontCode,
      endpointUrl: targetPackage.config.endpointUrl,
    });

    const result = await client.cancelUnsuppliedItems({
      packageId: targetPackage.externalPackageId,
      lines,
      reasonId: parsed.reasonId,
    });

    await trendyolOrderImportService.importShipmentPackages({
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

export const trendyolUnsuppliedService = new TrendyolUnsuppliedService();
