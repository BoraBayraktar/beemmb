import { z } from "zod";

import { N11Client } from "@/modules/integration/connectors/n11.client";
import { IntegrationRepository } from "@/modules/integration/repositories/integration.repository";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

const stockSyncPayloadSchema = z.object({
  warehouseCode: z.string().trim().min(1).max(120).optional().nullable(),
  trigger: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(180).optional(),
});

const taskFollowUpSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minCheckIntervalMinutes: z.coerce.number().int().min(1).max(1440).default(15),
});

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readReason(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => readString(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  return null;
}

function normalizeTaskStatus(value: unknown) {
  const normalized = readString(value)?.toUpperCase() ?? null;

  if (!normalized) {
    return { raw: null, state: "UNKNOWN" as const };
  }

  if (
    normalized.includes("FAIL")
    || normalized.includes("ERROR")
    || normalized.includes("REJECT")
    || normalized.includes("CANCEL")
  ) {
    return { raw: normalized, state: "FAILED" as const };
  }

  if (
    normalized.includes("SUCCESS")
    || normalized.includes("COMPLETED")
    || normalized.includes("DONE")
    || normalized.includes("FINISHED")
  ) {
    return { raw: normalized, state: "SUCCESS" as const };
  }

  if (
    normalized.includes("PENDING")
    || normalized.includes("QUEUE")
    || normalized.includes("PROCESS")
    || normalized.includes("START")
    || normalized.includes("PROGRESS")
    || normalized.includes("WAIT")
  ) {
    return { raw: normalized, state: "PENDING" as const };
  }

  return { raw: normalized, state: "UNKNOWN" as const };
}

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

export class N11StockSyncService {
  constructor(
    private readonly repository = new MarketplaceIntegrationRepository(),
    private readonly integrationRepository = new IntegrationRepository(),
  ) {}

  async syncProduct(input: { productId: string; payload?: Record<string, unknown> | null }) {
    const parsed = stockSyncPayloadSchema.parse(input.payload ?? {});
    const [config] = await this.repository.listActiveConfigsByChannel("N11");

    if (!config) {
      throw new Error("N11_CONFIG_NOT_FOUND");
    }

    const target = await this.repository.findProductStockSyncTarget({
      channel: "N11",
      productId: input.productId,
      warehouseCode: parsed.warehouseCode,
    });

    if (!target) {
      throw new Error("N11_STOCK_SYNC_PRODUCT_NOT_FOUND");
    }

    const mapping = target.inventoryIntegrationMappings[0] ?? null;
    const stockCode = mapping?.externalSku?.trim() || target.sku?.trim();

    if (!stockCode) {
      throw new Error("N11_STOCK_SYNC_STOCK_CODE_REQUIRED");
    }

    const salePrice = decimalToNumber(target.price);
    const compareAtPrice = decimalToNumber(target.compareAtPrice);
    const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;
    const quantity = target.status === "ACTIVE" && target.salesEnabled
      ? resolveAvailableQuantity(target)
      : 0;

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const client = new N11Client({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });

    const result = await client.updateProductPriceAndStock({
      integrator: config.displayName,
      skus: [
        {
          stockCode,
          listPrice,
          salePrice,
          quantity,
          currencyType: "TL",
        },
      ],
    });

    return {
      providerKey: "n11",
      externalReference: typeof result.id === "number" || typeof result.id === "string" ? String(result.id) : stockCode,
      responsePayload: {
        ...result,
        taskId: typeof result.id === "number" || typeof result.id === "string" ? String(result.id) : null,
        productId: target.id,
        sku: target.sku,
        stockCode,
        quantity,
        salePrice,
        listPrice,
        trigger: parsed.trigger ?? null,
        reference: parsed.reference ?? null,
        warehouseCode: mapping?.externalWarehouseCode ?? parsed.warehouseCode ?? null,
      },
    };
  }

  async getTaskResultForJob(jobId: string) {
    const job = await this.integrationRepository.findJobById(jobId);

    if (!job) {
      throw new Error("INTEGRATION_JOB_NOT_FOUND");
    }

    if (job.channel !== "N11" || !["STOCK_SYNC", "PRICE_SYNC", "PRODUCT_SYNC"].includes(job.jobType)) {
      throw new Error("N11_TASK_JOB_UNSUPPORTED");
    }

    const responsePayload = job.responsePayload && typeof job.responsePayload === "object"
      ? job.responsePayload as Record<string, unknown>
      : {};
    const taskId = typeof responsePayload.taskId === "string"
      ? responsePayload.taskId
      : typeof job.externalReference === "string"
        ? job.externalReference
        : null;

    if (!taskId) {
      throw new Error("N11_TASK_ID_NOT_FOUND");
    }

    const [config] = await this.repository.listActiveConfigsByChannel("N11");

    if (!config) {
      throw new Error("N11_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const client = new N11Client({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });

    const result = await client.getTaskDetails(taskId);
    const normalizedStatus = normalizeTaskStatus(result.status);
    const reason = readReason((result as { reasons?: unknown }).reasons)
      ?? readReason((result as { reason?: unknown }).reason)
      ?? readReason((result as { message?: unknown }).message);
    const nextPayload = {
      ...responsePayload,
      taskId,
      batchCheckedAt: new Date().toISOString(),
      batchResult: result,
      taskDetailStatus: normalizedStatus.raw,
      taskDetailState: normalizedStatus.state,
      taskDetailReason: reason,
    };

    if (normalizedStatus.state === "FAILED") {
      const failureMessage = reason ?? normalizedStatus.raw ?? "N11_TASK_RESULT_FAILED";
      const failedJob = await this.integrationRepository.markJobObservedFailure({
        id: job.id,
        lastError: failureMessage,
        retryDelayMinutes: 15,
        responsePayload: nextPayload,
      });

      return {
        jobId: job.id,
        batchRequestId: taskId,
        result,
        jobStatus: failedJob?.status ?? "FAILED",
        failureMessage,
      };
    }

    await this.integrationRepository.updateJobResponsePayload({
      id: job.id,
      externalReference: taskId,
      responsePayload: nextPayload,
    });

    return {
      jobId: job.id,
      batchRequestId: taskId,
      result,
      jobStatus: job.status,
      failureMessage: null,
    };
  }

  async followUpPendingTasks(input: { limit?: number; minCheckIntervalMinutes?: number } = {}) {
    const parsed = taskFollowUpSchema.parse(input);
    const staleBefore = new Date(Date.now() - parsed.minCheckIntervalMinutes * 60000);
    const jobs = await this.integrationRepository.listPendingN11TaskCheckJobs({
      limit: parsed.limit,
      staleBefore,
    });

    let checked = 0;
    let failed = 0;
    const items: Array<{
      jobId: string;
      taskId: string | null;
      ok: boolean;
      errorMessage: string | null;
    }> = [];

    for (const job of jobs) {
      try {
        const result = await this.getTaskResultForJob(job.id);
        checked += 1;
        items.push({
          jobId: job.id,
          taskId: result.batchRequestId,
          ok: result.jobStatus !== "FAILED" && result.jobStatus !== "DEAD_LETTER",
          errorMessage: result.failureMessage,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "N11_TASK_FOLLOW_UP_FAILED";
        await this.integrationRepository.markJobObservedFailure({
          id: job.id,
          lastError: errorMessage,
          retryDelayMinutes: 15,
          responsePayload: {
            ...(job.responsePayload && typeof job.responsePayload === "object"
              ? job.responsePayload as Record<string, unknown>
              : {}),
            taskId: job.externalReference,
            batchCheckedAt: new Date().toISOString(),
            taskDetailState: "FAILED",
            taskDetailReason: errorMessage,
          },
        });
        failed += 1;
        items.push({
          jobId: job.id,
          taskId: job.externalReference,
          ok: false,
          errorMessage,
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

export const n11StockSyncService = new N11StockSyncService();
