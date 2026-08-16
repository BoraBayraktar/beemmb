import { z } from "zod";

import { PazaramaClient } from "@/modules/integration/connectors/pazarama.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { syncOrderShipmentFromPackageStatus } from "@/modules/integration/services/marketplace-package-shipment-sync.service";

const PAZARAMA_STATUS_PREPARING = 12;
const PAZARAMA_STATUS_SHIPPED = 5;

const connectorStatusSyncPayloadSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("Picking"),
  }),
  z.object({
    status: z.literal("Invoiced"),
    cargoCompanyId: z.string().trim().min(1).max(120),
    shippingTrackingNumber: z.string().trim().min(1).max(120),
    trackingUrl: z.string().trim().url().optional(),
    shipmentNumber: z.string().trim().min(1).max(120).optional(),
    // Pazarama'nın kendi kargo firma ID sistemi (yukarıdaki cargoCompanyId) ile beemmb'nin
    // dahili CarrierCompany kaydı farklı kimlik alanlarıdır; bu alan yalnızca bildirim
    // başarılı olduktan sonra eşleşen Order kaydına doğru kargo firmasını yazmak için kullanılır.
    carrierCompanyId: z.string().trim().min(1).optional(),
  }),
]);

function resolveOrderNumber(value: string) {
  const orderNumber = Number(value);

  if (!Number.isFinite(orderNumber)) {
    throw new Error("PAZARAMA_ORDER_NUMBER_INVALID");
  }

  return orderNumber;
}

export class PazaramaPackageStatusService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async syncPackageStatus(input: { packageId: string; payload?: Record<string, unknown> | null }) {
    const parsed = connectorStatusSyncPayloadSchema.parse(input.payload ?? {});
    const item = await this.repository.findPackageForOutbound(input.packageId);

    if (!item) {
      throw new Error("MARKETPLACE_PACKAGE_NOT_FOUND");
    }

    if (item.channel !== "PAZARAMA") {
      throw new Error("MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL");
    }

    const apiKey = integrationSecretCryptoService.decrypt(item.config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(item.config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("PAZARAMA_CONFIG_INCOMPLETE");
    }

    const orderNumber = resolveOrderNumber(item.externalOrderNumber);
    const orderItemIds = item.lines.map((line) => line.externalLineId).filter(Boolean);

    if (orderItemIds.length === 0) {
      throw new Error("PAZARAMA_PACKAGE_LINE_ITEM_REQUIRED");
    }

    const client = new PazaramaClient({
      apiKey,
      apiSecret,
      endpointUrl: item.config.endpointUrl,
    });

    if (parsed.status === "Invoiced") {
      const result = await client.bulkUpdateOrderStatus({
        orderNumber,
        orderItemIds,
        updateShipmentDto: {
          cargoCompanyId: parsed.cargoCompanyId,
          deliveryType: 1,
          shipmentNumber: parsed.shipmentNumber,
          shippingTrackingNumber: parsed.shippingTrackingNumber,
          status: PAZARAMA_STATUS_SHIPPED,
          subStatus: 0,
          trackingUrl: parsed.trackingUrl,
        },
      });

      await this.repository.updatePackageExternalStatus({
        packageId: item.id,
        packageStatus: parsed.status,
      });

      await syncOrderShipmentFromPackageStatus({
        matchedOrderId: item.matchedOrderId,
        targetStatus: "Invoiced",
        carrierCompanyId: parsed.carrierCompanyId,
        cargoTrackingNumber: parsed.shippingTrackingNumber,
      });

      return {
        providerKey: "pazarama",
        externalReference: item.externalPackageId,
        responsePayload: {
          documentStatus: "SENT",
          pazaramaStatus: "Shipped",
          orderNumber,
          orderItemCount: orderItemIds.length,
          result,
        },
      };
    }

    const results = await Promise.all(orderItemIds.map((orderItemId) => client.updateOrderStatus({
      orderNumber,
      item: {
        orderItemId,
        status: PAZARAMA_STATUS_PREPARING,
      },
    })));

    await this.repository.updatePackageExternalStatus({
      packageId: item.id,
      packageStatus: parsed.status,
    });

    await syncOrderShipmentFromPackageStatus({
      matchedOrderId: item.matchedOrderId,
      targetStatus: "Picking",
    });

    return {
      providerKey: "pazarama",
      externalReference: item.externalPackageId,
      responsePayload: {
        documentStatus: "SENT",
        pazaramaStatus: "Preparing",
        orderNumber,
        orderItemCount: orderItemIds.length,
        results,
      },
    };
  }
}

export const pazaramaPackageStatusService = new PazaramaPackageStatusService();
