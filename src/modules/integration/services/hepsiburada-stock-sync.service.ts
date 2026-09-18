import { z } from "zod";

import { HepsiburadaClient } from "@/modules/integration/connectors/hepsiburada.client";
import { IntegrationRepository } from "@/modules/integration/repositories/integration.repository";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

const stockSyncPayloadSchema = z.object({
  warehouseCode: z.string().trim().min(1).max(120).optional().nullable(),
  trigger: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(180).optional(),
});

const uploadFollowUpSchema = z.object({
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

function readUploadId(value: Record<string, unknown>) {
  const id = value.id ?? value.Id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

function readUploadStatus(value: Record<string, unknown>) {
  const status = value.status ?? value.Status;
  return typeof status === "string" && status.trim().length > 0 ? status.trim() : null;
}

function readUploadErrors(value: Record<string, unknown>) {
  return value.errors ?? value.Errors ?? null;
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

export class HepsiburadaStockSyncService {
  constructor(
    private readonly repository = new MarketplaceIntegrationRepository(),
    private readonly integrationRepository = new IntegrationRepository(),
  ) {}

  async syncProduct(input: { productId: string; payload?: Record<string, unknown> | null }) {
    const parsed = stockSyncPayloadSchema.parse(input.payload ?? {});
    const [config] = await this.repository.listActiveConfigsByChannel("HEPSIBURADA");

    if (!config) {
      throw new Error("HEPSIBURADA_CONFIG_NOT_FOUND");
    }

    const target = await this.repository.findProductStockSyncTarget({
      channel: "HEPSIBURADA",
      productId: input.productId,
      warehouseCode: parsed.warehouseCode,
    });

    if (!target) {
      throw new Error("HEPSIBURADA_STOCK_SYNC_PRODUCT_NOT_FOUND");
    }

    const mapping = target.inventoryIntegrationMappings[0] ?? null;
    const merchantSku = mapping?.externalSku?.trim() || target.sku?.trim();
    const hepsiburadaSku = mapping?.externalProductId?.trim() || null;

    if (!merchantSku) {
      throw new Error("HEPSIBURADA_STOCK_SYNC_MERCHANT_SKU_REQUIRED");
    }

    const quantity = target.status === "ACTIVE" && target.salesEnabled
      ? resolveAvailableQuantity(target)
      : 0;
    const salePrice = decimalToNumber(target.price);
    const compareAtPrice = decimalToNumber(target.compareAtPrice);
    const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;
    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("HEPSIBURADA_CONFIG_INCOMPLETE");
    }

    const client = new HepsiburadaClient({
      merchantId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      endpointUrl: config.endpointUrl,
    });
    const priceUpload = await client.uploadPrice({
      merchantSku,
      hepsiburadaSku,
      price: salePrice,
    });
    const stockUpload = await client.uploadStock({
      merchantSku,
      hepsiburadaSku,
      availableStock: quantity,
    });

    return {
      providerKey: "hepsiburada",
      externalReference: readUploadId(stockUpload) ?? readUploadId(priceUpload) ?? merchantSku,
      responsePayload: {
        priceUpload,
        stockUpload,
        priceUploadId: readUploadId(priceUpload),
        stockUploadId: readUploadId(stockUpload),
        productId: target.id,
        sku: target.sku,
        merchantSku,
        hepsiburadaSku,
        quantity,
        salePrice,
        listPrice,
        trigger: parsed.trigger ?? null,
        reference: parsed.reference ?? null,
        warehouseCode: mapping?.externalWarehouseCode ?? parsed.warehouseCode ?? null,
        endpointUrl: config.endpointUrl ?? null,
      },
    };
  }

  async getUploadResultForJob(jobId: string) {
    const job = await this.integrationRepository.findJobById(jobId);

    if (!job) {
      throw new Error("INTEGRATION_JOB_NOT_FOUND");
    }

    if (job.channel !== "HEPSIBURADA" || !["STOCK_SYNC", "PRICE_SYNC"].includes(job.jobType)) {
      throw new Error("HEPSIBURADA_UPLOAD_JOB_UNSUPPORTED");
    }

    const responsePayload = job.responsePayload && typeof job.responsePayload === "object"
      ? job.responsePayload as Record<string, unknown>
      : {};
    const priceUploadId = typeof responsePayload.priceUploadId === "string" ? responsePayload.priceUploadId : null;
    const stockUploadId = typeof responsePayload.stockUploadId === "string" ? responsePayload.stockUploadId : null;

    if (!priceUploadId && !stockUploadId) {
      throw new Error("HEPSIBURADA_UPLOAD_ID_NOT_FOUND");
    }

    const [config] = await this.repository.listActiveConfigsByChannel("HEPSIBURADA");

    if (!config) {
      throw new Error("HEPSIBURADA_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("HEPSIBURADA_CONFIG_INCOMPLETE");
    }

    const client = new HepsiburadaClient({
      merchantId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      endpointUrl: config.endpointUrl,
    });
    const priceResult = priceUploadId ? await client.getPriceUploadResult(priceUploadId) : null;
    const stockResult = stockUploadId ? await client.getStockUploadResult(stockUploadId) : null;
    const priceStatus = priceResult ? readUploadStatus(priceResult) : null;
    const stockStatus = stockResult ? readUploadStatus(stockResult) : null;
    const priceErrors = priceResult ? readUploadErrors(priceResult) : null;
    const stockErrors = stockResult ? readUploadErrors(stockResult) : null;
    const nextPayload = {
      ...responsePayload,
      batchCheckedAt: new Date().toISOString(),
      batchResult: {
        priceUploadId,
        stockUploadId,
        priceResult,
        stockResult,
      },
      priceUploadStatus: priceStatus,
      stockUploadStatus: stockStatus,
      priceUploadErrors: priceErrors,
      stockUploadErrors: stockErrors,
    };

    await this.integrationRepository.updateJobResponsePayload({
      id: job.id,
      externalReference: stockUploadId ?? priceUploadId ?? job.externalReference,
      responsePayload: nextPayload,
    });

    return {
      jobId: job.id,
      batchRequestId: stockUploadId ?? priceUploadId ?? job.externalReference ?? job.id,
      result: nextPayload.batchResult,
    };
  }

  async followUpPendingUploads(input: { limit?: number; minCheckIntervalMinutes?: number } = {}) {
    const parsed = uploadFollowUpSchema.parse(input);
    const staleBefore = new Date(Date.now() - parsed.minCheckIntervalMinutes * 60000);
    const jobs = await this.integrationRepository.listPendingHepsiburadaUploadCheckJobs({
      limit: parsed.limit,
      staleBefore,
    });

    let checked = 0;
    let failed = 0;
    const items: Array<{
      jobId: string;
      uploadId: string | null;
      ok: boolean;
      errorMessage: string | null;
    }> = [];

    for (const job of jobs) {
      try {
        const result = await this.getUploadResultForJob(job.id);
        checked += 1;
        items.push({
          jobId: job.id,
          uploadId: result.batchRequestId,
          ok: true,
          errorMessage: null,
        });
      } catch (error) {
        failed += 1;
        items.push({
          jobId: job.id,
          uploadId: job.externalReference,
          ok: false,
          errorMessage: error instanceof Error ? error.message : "HEPSIBURADA_UPLOAD_FOLLOW_UP_FAILED",
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

export const hepsiburadaStockSyncService = new HepsiburadaStockSyncService();
