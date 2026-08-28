import { z } from "zod";

import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";
import { requireTenantId } from "@/lib/tenant-context";
import { documentDispatchLifecycleService } from "@/modules/documents/services/document-dispatch-lifecycle.service";
import type {
  AdminIntegrationJobItem,
  AdminIntegrationJobListResult,
  AdminIntegrationListQuery,
  DispatchIntegrationJobsInput,
  DispatchIntegrationJobsResult,
  IntegrationDeadLetterItem,
  IntegrationDeadLetterListResult,
  IntegrationChannel,
  IntegrationEntityType,
  IntegrationJobType,
  ProcessIntegrationQueueInput,
  ProcessIntegrationQueueResult,
  RetryDeadLetterInput,
  StockSyncDashboardResult,
} from "@/modules/integration/contracts/integration.contract";
import type { ChannelConnector } from "@/modules/integration/connectors/channel.connector";
import { EDocsMockConnector } from "@/modules/integration/connectors/edocs-mock.connector";
import { BankSandboxConnector } from "@/modules/integration/connectors/bank-sandbox.connector";
import { HepsiburadaConnector } from "@/modules/integration/connectors/hepsiburada.connector";
import { N11Connector } from "@/modules/integration/connectors/n11.connector";
import { PazaramaConnector } from "@/modules/integration/connectors/pazarama.connector";
import { TrendyolConnector } from "@/modules/integration/connectors/trendyol.connector";
import { financeBankIntegrationService } from "@/modules/finance/services/finance-bank-integration.service";
import { IntegrationRepository } from "@/modules/integration/repositories/integration.repository";

const integrationChannelSchema = z.enum(["TRENDYOL", "N11", "PAZARAMA", "HEPSIBURADA", "EDOCS_MOCK", "BANK_SANDBOX"]);
const integrationJobTypeSchema = z.enum([
  "PRODUCT_SYNC",
  "PRICE_SYNC",
  "STOCK_SYNC",
  "ORDER_IMPORT",
  "ORDER_STATUS_SYNC",
  "DOCUMENT_OUTBOUND",
  "DOCUMENT_STATUS_SYNC",
  "BANK_STATEMENT_SYNC",
]);
const integrationEntityTypeSchema = z.enum([
  "PRODUCT",
  "MARKETPLACE_ACCOUNT",
  "MARKETPLACE_PACKAGE",
  "ORDER",
  "BUSINESS_DOCUMENT",
  "FINANCIAL_ACCOUNT",
]);

const listQuerySchema = z.object({
  channel: integrationChannelSchema.optional(),
  jobType: integrationJobTypeSchema.optional(),
  status: z.enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD_LETTER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const dispatchSchema = z.object({
  channel: integrationChannelSchema,
  jobType: integrationJobTypeSchema,
  entityType: integrationEntityTypeSchema,
  entityIds: z.array(z.string().trim().min(1)).min(1).max(100),
  maxAttempts: z.coerce.number().int().min(1).max(10).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencySuffix: z.string().trim().min(1).max(120).optional(),
});

const processSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const retrySchema = z.object({
  jobId: z.string().trim().min(1),
  resolvedByUserId: z.string().trim().min(1),
});

const connectors: Record<"TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK" | "BANK_SANDBOX", ChannelConnector> = {
  TRENDYOL: new TrendyolConnector(),
  N11: new N11Connector(),
  PAZARAMA: new PazaramaConnector(),
  HEPSIBURADA: new HepsiburadaConnector(),
  EDOCS_MOCK: new EDocsMockConnector(),
  BANK_SANDBOX: new BankSandboxConnector(),
};

async function invalidateIntegrationCache() {
  await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "integrations"));
}

function mapJob(item: {
  id: string;
  idempotencyKey: string;
  channel: IntegrationChannel;
  jobType: IntegrationJobType;
  entityType: IntegrationEntityType;
  entityId: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastAttemptAt: Date | null;
  processedAt: Date | null;
  externalReference: string | null;
  payload: unknown;
  responsePayload: unknown;
  lastError: string | null;
  createdAt: Date;
}): AdminIntegrationJobItem {
  return {
    id: item.id,
    idempotencyKey: item.idempotencyKey,
    channel: item.channel,
    jobType: item.jobType,
    entityType: item.entityType,
    entityId: item.entityId,
    status: item.status,
    attemptCount: item.attemptCount,
    maxAttempts: item.maxAttempts,
    nextAttemptAt: item.nextAttemptAt.toISOString(),
    lastAttemptAt: item.lastAttemptAt ? item.lastAttemptAt.toISOString() : null,
    processedAt: item.processedAt ? item.processedAt.toISOString() : null,
    externalReference: item.externalReference,
    payload: item.payload && typeof item.payload === "object"
      ? item.payload as Record<string, unknown>
      : null,
    responsePayload: item.responsePayload && typeof item.responsePayload === "object"
      ? item.responsePayload as Record<string, unknown>
      : null,
    lastError: item.lastError,
    createdAt: item.createdAt.toISOString(),
  };
}

function mapDeadLetter(item: {
  id: string;
  jobId: string;
  channel: IntegrationChannel;
  jobType: IntegrationJobType;
  entityType: IntegrationEntityType;
  entityId: string;
  lastError: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  resolved: boolean;
}): IntegrationDeadLetterItem {
  return {
    id: item.id,
    jobId: item.jobId,
    channel: item.channel,
    jobType: item.jobType,
    entityType: item.entityType,
    entityId: item.entityId,
    lastError: item.lastError,
    attemptCount: item.attemptCount,
    maxAttempts: item.maxAttempts,
    createdAt: item.createdAt.toISOString(),
    resolved: item.resolved,
  };
}

export class IntegrationService {
  constructor(private readonly repository: IntegrationRepository) {}

  async listJobs(query: AdminIntegrationListQuery): Promise<AdminIntegrationJobListResult> {
    const parsed = listQuerySchema.parse(query);
    const [items, total] = await Promise.all([
      this.repository.listJobs(parsed),
      this.repository.countJobs(parsed),
    ]);

    return {
      items: items.map(mapJob),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async dispatchJobs(input: DispatchIntegrationJobsInput): Promise<DispatchIntegrationJobsResult> {
    const parsed = dispatchSchema.parse(input);
    const jobs = await this.repository.dispatchJobs(parsed);

    const accepted = jobs.filter((item) => !item.deduplicated).length;
    const deduplicated = jobs.filter((item) => item.deduplicated).length;

    const result = {
      accepted,
      deduplicated,
      jobs: jobs.map((item) => mapJob(item.job!)),
    };
    await invalidateIntegrationCache();
    return result;
  }

  async processQueue(input: ProcessIntegrationQueueInput): Promise<ProcessIntegrationQueueResult> {
    // NOT: IntegrationSyncJob artik tenant-scoped (Faz 1 / Dalga 15). reserveJobs
    // sadece cagiran route'un tenant context'indeki job'lari rezerve eder --
    // yani bir cagrida donen `reserved` dizisindeki tum job'lar AYNI tenant'a
    // aittir (cagiran admin'in kendi tenant'i). Bu yuzden asagidaki
    // documentDispatchLifecycleService cagrilari icin ayrica per-job
    // runWithTenantContext gerekmiyor: hepsi zaten dogru context altinda
    // calisiyor. Bu davranis kasitli ve dogrudur -- bir admin'in bu route'u
    // tetiklemesi yalnizca kendi tenant'inin kuyrugunu isler, baska bir
    // tenant'in job'larina asla erisemez.
    const parsed = processSchema.parse(input);
    const reserved = await this.repository.reserveJobs(parsed.limit);

    let success = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const job of reserved) {
      try {
        const connector = connectors[job.channel];
        const dispatchResult = await connector.dispatch({
          id: job.id,
          channel: job.channel,
          jobType: job.jobType,
          entityType: job.entityType,
          entityId: job.entityId,
          payload: (job.payload as Record<string, unknown> | null) ?? null,
        });

        let externalReference = dispatchResult?.externalReference ?? null;
        let responsePayload = dispatchResult?.responsePayload ?? null;

        if (job.channel === "BANK_SANDBOX" && job.jobType === "BANK_STATEMENT_SYNC" && job.entityType === "FINANCIAL_ACCOUNT") {
          const importResult = await financeBankIntegrationService.importSandboxStatementFromConnectorResult({
            financialAccountId: job.entityId,
            integrationJobId: job.id,
            responsePayload,
          });

          externalReference = importResult.import.id;
          responsePayload = {
            ...(responsePayload ?? {}),
            bankStatementImportId: importResult.import.id,
            suggestedCount: importResult.import.suggestedCount,
            unmatchedCount: importResult.import.unmatchedCount,
          };
        }

        await this.repository.markJobSuccess({
          id: job.id,
          externalReference,
          responsePayload,
        });

        if (job.entityType === "BUSINESS_DOCUMENT" && job.jobType === "DOCUMENT_OUTBOUND") {
          await documentDispatchLifecycleService.markSuccess({
            documentId: job.entityId,
            integrationJobId: job.id,
            providerKey: dispatchResult?.providerKey ?? "unknown-provider",
            externalReference: dispatchResult?.externalReference ?? null,
            responsePayload: dispatchResult?.responsePayload ?? null,
          });
        }

        if (job.entityType === "BUSINESS_DOCUMENT" && job.jobType === "DOCUMENT_STATUS_SYNC") {
          const nextStatus = dispatchResult?.responsePayload?.documentStatus;
          await documentDispatchLifecycleService.markStatusSynced({
            documentId: job.entityId,
            externalSystemStatus: nextStatus === "FAILED"
              ? "FAILED"
              : nextStatus === "QUEUED"
                ? "QUEUED"
                : nextStatus === "NOT_SENT"
                  ? "NOT_SENT"
                  : "SENT",
            externalReference: dispatchResult?.externalReference ?? undefined,
          });
        }

        success += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN_CONNECTOR_ERROR";
        const next = await this.repository.markJobFailure({
          id: job.id,
          lastError: message,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          retryDelayMinutes: 1,
        });

        if (job.entityType === "BUSINESS_DOCUMENT" && job.jobType === "DOCUMENT_OUTBOUND") {
          await documentDispatchLifecycleService.markFailure({
            documentId: job.entityId,
            integrationJobId: job.id,
            providerKey: job.channel === "EDOCS_MOCK" ? "mock-edocs-provider" : "unknown-provider",
            errorMessage: message,
            responsePayload: null,
          });
        }

        if (next.status === "DEAD_LETTER") {
          deadLetter += 1;
        } else {
          failed += 1;
        }
      }
    }

    const result = {
      processed: reserved.length,
      success,
      failed,
      deadLetter,
    };
    await invalidateIntegrationCache();
    return result;
  }

  async listDeadLetters(): Promise<IntegrationDeadLetterListResult> {
    const items = await this.repository.listDeadLetters();
    return {
      items: items.map(mapDeadLetter),
    };
  }

  async retryDeadLetter(input: RetryDeadLetterInput) {
    const parsed = retrySchema.parse(input);
    const retried = await this.repository.retryDeadLetter(parsed);

    if (!retried) {
      throw new Error("Dead letter not found");
    }

    const result = mapJob(retried);
    await invalidateIntegrationCache();
    return result;
  }

  async getStockSyncDashboard(): Promise<StockSyncDashboardResult> {
    const [recentJobs, counts, channelCounts] = await Promise.all([
      this.repository.listRecentStockSyncJobs(12),
      this.repository.countStockSyncJobsByStatus(),
      this.repository.countStockSyncJobsByChannel(),
    ]);

    return {
      pendingCount: counts.PENDING ?? 0,
      processingCount: counts.PROCESSING ?? 0,
      failedCount: counts.FAILED ?? 0,
      deadLetterCount: counts.DEAD_LETTER ?? 0,
      successCount: counts.SUCCESS ?? 0,
      channelCounts: {
        trendyol: channelCounts.TRENDYOL ?? 0,
        n11: channelCounts.N11 ?? 0,
        pazarama: channelCounts.PAZARAMA ?? 0,
        hepsiburada: channelCounts.HEPSIBURADA ?? 0,
      },
      recentJobs: recentJobs.map(mapJob),
    };
  }
}

export const integrationService = new IntegrationService(new IntegrationRepository());
