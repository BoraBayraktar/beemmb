import { z } from "zod";

import { TrendyolClient } from "@/modules/integration/connectors/trendyol.client";
import { IntegrationRepository } from "@/modules/integration/repositories/integration.repository";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

const stockSyncPayloadSchema = z.object({
  warehouseCode: z.string().trim().min(1).max(120).optional().nullable(),
  trigger: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(180).optional(),
});

const batchFollowUpSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minCheckIntervalMinutes: z.coerce.number().int().min(1).max(1440).default(15),
});

function decimalToNumber(value: { toNumber?: () => number; toString: () => string } | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value.toString());
}

function resolveAvailableQuantity(target: NonNullable<Awaited<ReturnType<MarketplaceIntegrationRepository["findProductStockSyncTarget"]>>>) {
  const mapping = target.inventoryIntegrationMappings[0] ?? null;
  const levels = target.inventoryItem?.inventoryLevels ?? [];
  const scopedLevels = mapping?.warehouseId
    ? levels.filter((level) => level.warehouseId === mapping.warehouseId)
    : levels;

  if (scopedLevels.length === 0) {
    // InventoryLevel hiç oluşmamışsa (kuramsal, bkz. syncVariantInventoryStates) 0 döner.
    return 0;
  }

  return Math.max(0, scopedLevels.reduce((total, level) => total + level.onHand - level.reserved, 0));
}

export class TrendyolStockSyncService {
  constructor(
    private readonly repository = new MarketplaceIntegrationRepository(),
    private readonly integrationRepository = new IntegrationRepository(),
  ) {}

  async syncProduct(input: { productId: string; payload?: Record<string, unknown> | null }) {
    const parsed = stockSyncPayloadSchema.parse(input.payload ?? {});
    const [config] = await this.repository.listActiveConfigsByChannel("TRENDYOL");

    if (!config) {
      throw new Error("TRENDYOL_CONFIG_NOT_FOUND");
    }

    const target = await this.repository.findProductStockSyncTarget({
      channel: "TRENDYOL",
      productId: input.productId,
      warehouseCode: parsed.warehouseCode,
    });

    if (!target) {
      throw new Error("TRENDYOL_STOCK_SYNC_PRODUCT_NOT_FOUND");
    }

    const mapping = target.inventoryIntegrationMappings[0] ?? null;
    const barcode = mapping?.externalSku?.trim() || target.barcode?.trim();

    if (!barcode) {
      throw new Error("TRENDYOL_STOCK_SYNC_BARCODE_REQUIRED");
    }

    const salePrice = decimalToNumber(target.price);
    const compareAtPrice = decimalToNumber(target.compareAtPrice);
    const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;
    const quantity = target.status === "ACTIVE" && target.salesEnabled
      ? resolveAvailableQuantity(target)
      : 0;
    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const client = new TrendyolClient({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      storeFrontCode: config.storeFrontCode,
      endpointUrl: config.endpointUrl,
    });
    const result = await client.updatePriceAndInventory({
      items: [
        {
          barcode,
          quantity,
          salePrice,
          listPrice,
        },
      ],
    });

    return {
      providerKey: "trendyol",
      externalReference: result.batchRequestId ?? barcode,
      responsePayload: {
        ...result,
        batchRequestId: result.batchRequestId,
        productId: target.id,
        sku: target.sku,
        barcode,
        quantity,
        salePrice,
        listPrice,
        trigger: parsed.trigger ?? null,
        reference: parsed.reference ?? null,
        warehouseCode: mapping?.externalWarehouseCode ?? parsed.warehouseCode ?? null,
      },
    };
  }

  async getBatchResultForJob(jobId: string) {
    const job = await this.integrationRepository.findJobById(jobId);

    if (!job) {
      throw new Error("INTEGRATION_JOB_NOT_FOUND");
    }

    if (job.channel !== "TRENDYOL" || !["PRODUCT_SYNC", "STOCK_SYNC", "PRICE_SYNC"].includes(job.jobType)) {
      throw new Error("TRENDYOL_BATCH_JOB_UNSUPPORTED");
    }

    const responsePayload = job.responsePayload && typeof job.responsePayload === "object"
      ? job.responsePayload as Record<string, unknown>
      : {};
    const batchRequestId = typeof responsePayload.batchRequestId === "string"
      ? responsePayload.batchRequestId
      : job.externalReference;

    if (!batchRequestId) {
      throw new Error("TRENDYOL_BATCH_REQUEST_ID_NOT_FOUND");
    }

    const [config] = await this.repository.listActiveConfigsByChannel("TRENDYOL");

    if (!config) {
      throw new Error("TRENDYOL_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const client = new TrendyolClient({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      endpointUrl: config.endpointUrl,
      storeFrontCode: config.storeFrontCode,
    });
    const result = await client.getBatchRequestResult(batchRequestId);
    const nextPayload = {
      ...responsePayload,
      batchRequestId,
      batchCheckedAt: new Date().toISOString(),
      batchResult: result,
    };

    await this.integrationRepository.updateJobResponsePayload({
      id: job.id,
      externalReference: batchRequestId,
      responsePayload: nextPayload,
    });

    return {
      jobId: job.id,
      batchRequestId,
      result,
    };
  }

  async followUpPendingBatches(input: { limit?: number; minCheckIntervalMinutes?: number } = {}) {
    const parsed = batchFollowUpSchema.parse(input);
    const staleBefore = new Date(Date.now() - parsed.minCheckIntervalMinutes * 60000);
    const jobs = await this.integrationRepository.listPendingTrendyolBatchCheckJobs({
      limit: parsed.limit,
      staleBefore,
    });

    let checked = 0;
    let failed = 0;
    const items: Array<{
      jobId: string;
      batchRequestId: string | null;
      ok: boolean;
      errorMessage: string | null;
    }> = [];

    for (const job of jobs) {
      try {
        const result = await this.getBatchResultForJob(job.id);
        checked += 1;
        items.push({
          jobId: job.id,
          batchRequestId: result.batchRequestId,
          ok: true,
          errorMessage: null,
        });
      } catch (error) {
        failed += 1;
        items.push({
          jobId: job.id,
          batchRequestId: job.externalReference,
          ok: false,
          errorMessage: error instanceof Error ? error.message : "TRENDYOL_BATCH_FOLLOW_UP_FAILED",
        });
      }
    }

    return {
      scanned: jobs.length,
      checked,
      failed,
      items,
    };
  }
}

export const trendyolStockSyncService = new TrendyolStockSyncService();
