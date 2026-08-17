import { z } from "zod";

import { N11_COLLECTION_REQUEST_SHIPMENT_COMPANIES, N11Client } from "@/modules/integration/connectors/n11.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { n11OrderImportService } from "@/modules/integration/services/n11-order-import.service";

const createCollectionRequestSchema = z.object({
  packageId: z.string().trim().min(1),
  shipmentCompany: z.enum(N11_COLLECTION_REQUEST_SHIPMENT_COMPANIES),
  boxQuantity: z.coerce.number().int().positive(),
  desi: z.coerce.number().positive(),
});

export class N11CollectionRequestService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async createCollectionRequest(input: unknown) {
    const parsed = createCollectionRequestSchema.parse(input);
    const targetPackage = await this.repository.findPackageForSplit(parsed.packageId);

    if (!targetPackage) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (targetPackage.channel !== "N11") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    if (targetPackage.packageStatus !== "Picking") {
      throw new Error("N11_COLLECTION_REQUEST_STATUS_INVALID");
    }

    if (targetPackage.lines.length === 0) {
      throw new Error("MARKETPLACE_PACKAGE_NO_LINES");
    }

    const apiKey = integrationSecretCryptoService.decrypt(targetPackage.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(targetPackage.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const client = new N11Client({
      sellerId: targetPackage.config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: targetPackage.config.endpointUrl,
    });

    // N11 dokumanina gore: pakette yer alan TUM siparis kalemleri istekte gonderilmelidir,
    // aksi halde "Eksik ya da uygun olmayan siparis ogesi bulunmaktadir" hatasi alinir.
    const result = await client.createCollectionRequest(targetPackage.lines.map((line) => ({
      id: targetPackage.externalPackageId,
      orderLineId: line.externalLineId,
      boxQuantity: parsed.boxQuantity,
      desi: parsed.desi,
      shipmentCompany: parsed.shipmentCompany,
    })));

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

export const n11CollectionRequestService = new N11CollectionRequestService();
