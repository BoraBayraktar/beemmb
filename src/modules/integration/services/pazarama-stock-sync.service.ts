import { z } from "zod";

import { PazaramaClient } from "@/modules/integration/connectors/pazarama.client";
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

function hasFailedOperation(result: Awaited<ReturnType<PazaramaClient["getListingBatchResult"]>>) {
  return (result.data?.data ?? []).some((item) => {
    const statuses = [item.status, item.price?.status, item.stock?.status].filter((value): value is number => typeof value === "number");
    return statuses.some((status) => status === 1 || status === 2);
  });
}

function readFailureReason(result: Awaited<ReturnType<PazaramaClient["getListingBatchResult"]>>) {
  const reasons = (result.data?.data ?? [])
    .flatMap((item) => [item.operationStatusText, item.price?.operationDetail, item.stock?.operationDetail])
    .filter((value): value is string => Boolean(value?.trim()));

  return Array.from(new Set(reasons)).join(" | ") || "PAZARAMA_LISTING_BATCH_FAILED";
}

export class PazaramaStockSyncService {
  constructor(
    private readonly repository = new MarketplaceIntegrationRepository(),
    private readonly integrationRepository = new IntegrationRepository(),
  ) {}

  async syncProduct(input: { productId: string; jobType: "PRICE_SYNC" | "STOCK_SYNC"; payload?: Record<string, unknown> | null }) {
    const parsed = stockSyncPayloadSchema.parse(input.payload ?? {});
    const [config] = await this.repository.listActiveConfigsByChannel("PAZARAMA");

    if (!config) {
      throw new Error("PAZARAMA_CONFIG_NOT_FOUND");
    }

    const target = await this.repository.findProductStockSyncTarget({
      channel: "PAZARAMA",
      productId: input.productId,
      warehouseCode: parsed.warehouseCode,
    });

    if (!target) {
      throw new Error("PAZARAMA_STOCK_SYNC_PRODUCT_NOT_FOUND");
    }

    const mapping = target.inventoryIntegrationMappings[0] ?? null;
    const code = mapping?.externalSku?.trim() || target.barcode?.trim();

    if (!code) {
      throw new Error("PAZARAMA_STOCK_SYNC_CODE_REQUIRED");
    }

    const quantity = target.status === "ACTIVE" && target.salesEnabled
      ? resolveAvailableQuantity(target)
      : 0;
    const salePrice = decimalToNumber(target.price);
    const compareAtPrice = decimalToNumber(target.compareAtPrice);
    const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;
    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("PAZARAMA_CONFIG_INCOMPLETE");
    }

    const client = new PazaramaClient({
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });
    const result = input.jobType === "PRICE_SYNC"
      ? await client.updatePrices({
          items: [
            {
              code,
              listPrice,
              salePrice,
            },
          ],
        })
      : await client.updateStocks({
          items: [
            {
              code,
              stockCount: quantity,
            },
          ],
        });
    const dataId = result.data ?? null;

    return {
      providerKey: "pazarama",
      externalReference: dataId ?? code,
      responsePayload: {
        ...result,
        dataId,
        productId: target.id,
        sku: target.sku,
        code,
        quantity,
        salePrice,
        listPrice,
        trigger: parsed.trigger ?? null,
        reference: parsed.reference ?? null,
        warehouseCode: mapping?.externalWarehouseCode ?? parsed.warehouseCode ?? null,
      },
    };
  }

  async getListingBatchResultForJob(jobId: string) {
    const job = await this.integrationRepository.findJobById(jobId);

    if (!job) {
      throw new Error("INTEGRATION_JOB_NOT_FOUND");
    }

    if (job.channel !== "PAZARAMA" || !["STOCK_SYNC", "PRICE_SYNC"].includes(job.jobType)) {
      throw new Error("PAZARAMA_LISTING_BATCH_JOB_UNSUPPORTED");
    }

    const responsePayload = job.responsePayload && typeof job.responsePayload === "object"
      ? job.responsePayload as Record<string, unknown>
      : {};
    const dataId = typeof responsePayload.dataId === "string" ? responsePayload.dataId : job.externalReference;

    if (!dataId) {
      throw new Error("PAZARAMA_LISTING_BATCH_ID_NOT_FOUND");
    }

    const [config] = await this.repository.listActiveConfigsByChannel("PAZARAMA");

    if (!config) {
      throw new Error("PAZARAMA_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("PAZARAMA_CONFIG_INCOMPLETE");
    }

    const client = new PazaramaClient({
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });
    const result = await client.getListingBatchResult(dataId);
    const nextPayload = {
      ...responsePayload,
      dataId,
      batchCheckedAt: new Date().toISOString(),
      batchResult: result,
    };

    if (hasFailedOperation(result)) {
      await this.integrationRepository.markJobObservedFailure({
        id: job.id,
        lastError: readFailureReason(result),
        retryDelayMinutes: 15,
        responsePayload: nextPayload,
      });
    } else {
      await this.integrationRepository.updateJobResponsePayload({
        id: job.id,
        externalReference: dataId,
        responsePayload: nextPayload,
      });
    }

    return {
      jobId: job.id,
      batchRequestId: dataId,
      result,
    };
  }

  async followUpPendingListingBatches(input: { limit?: number; minCheckIntervalMinutes?: number } = {}) {
    const parsed = batchFollowUpSchema.parse(input);
    const staleBefore = new Date(Date.now() - parsed.minCheckIntervalMinutes * 60000);
    const jobs = await this.integrationRepository.listPendingPazaramaListingBatchCheckJobs({
      limit: parsed.limit,
      staleBefore,
    });

    let checked = 0;
    let failed = 0;
    const items: Array<{ jobId: string; dataId: string | null; ok: boolean; errorMessage: string | null }> = [];

    for (const job of jobs) {
      try {
        const result = await this.getListingBatchResultForJob(job.id);
        checked += 1;
        items.push({
          jobId: job.id,
          dataId: result.batchRequestId,
          ok: true,
          errorMessage: null,
        });
      } catch (error) {
        failed += 1;
        items.push({
          jobId: job.id,
          dataId: job.externalReference,
          ok: false,
          errorMessage: error instanceof Error ? error.message : "PAZARAMA_LISTING_BATCH_FOLLOW_UP_FAILED",
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

export const pazaramaStockSyncService = new PazaramaStockSyncService();
