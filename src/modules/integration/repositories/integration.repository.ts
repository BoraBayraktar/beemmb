import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type {
  AdminIntegrationListQuery,
  DispatchIntegrationJobsInput,
  RetryDeadLetterInput,
} from "@/modules/integration/contracts/integration.contract";

function buildIdempotencyKey(args: {
  channel: string;
  jobType: string;
  entityType: string;
  entityId: string;
  suffix?: string;
}) {
  return `${args.channel}:${args.jobType}:${args.entityType}:${args.entityId}${args.suffix ? `:${args.suffix}` : ""}`;
}

function toJsonInput(value: Prisma.JsonValue | Record<string, unknown> | null | undefined) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export class IntegrationRepository {
  async listJobs(args: Required<Pick<AdminIntegrationListQuery, "page" | "pageSize">> & Pick<AdminIntegrationListQuery, "channel" | "jobType" | "status">) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        ...(args.channel ? { channel: args.channel } : {}),
        ...(args.jobType ? { jobType: args.jobType } : {}),
        ...(args.status ? { status: args.status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async countJobs(args: Pick<AdminIntegrationListQuery, "channel" | "jobType" | "status">) {
    return prisma.integrationSyncJob.count({
      where: {
        deleted: false,
        ...(args.channel ? { channel: args.channel } : {}),
        ...(args.jobType ? { jobType: args.jobType } : {}),
        ...(args.status ? { status: args.status } : {}),
      },
    });
  }

  async dispatchJobs(input: DispatchIntegrationJobsInput) {
    const tenantId = requireTenantId();
    const jobs: Array<{ job: Awaited<ReturnType<typeof prisma.integrationSyncJob.findFirst>>; deduplicated: boolean }> = [];

    for (const entityId of input.entityIds) {
      const idempotencyKey = buildIdempotencyKey({
        channel: input.channel,
        jobType: input.jobType,
        entityType: input.entityType,
        entityId,
        suffix: input.idempotencySuffix,
      });

      const existing = await prisma.integrationSyncJob.findFirst({
        where: {
          idempotencyKey,
        },
      });

      if (existing && !existing.deleted) {
        jobs.push({ job: existing, deduplicated: true });
        continue;
      }

      const job = await prisma.integrationSyncJob.upsert({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
        update: {
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: new Date(),
          maxAttempts: input.maxAttempts ?? 3,
          payload: input.payload ? (input.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
          lastError: null,
          processedAt: null,
        },
        create: {
          tenantId,
          idempotencyKey,
          channel: input.channel,
          jobType: input.jobType,
          entityType: input.entityType,
          entityId,
          payload: input.payload ? (input.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
          maxAttempts: input.maxAttempts ?? 3,
          nextAttemptAt: new Date(),
          status: "PENDING",
        },
      });

      jobs.push({ job, deduplicated: false });
    }

    return jobs;
  }

  async reserveJobs(limit: number) {
    const now = new Date();
    const candidates = await prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        status: {
          in: ["PENDING", "FAILED"],
        },
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });

    const reserved = [];

    for (const item of candidates) {
      const updatedCount = await prisma.integrationSyncJob.updateMany({
        where: {
          id: item.id,
          status: item.status,
        },
        data: {
          status: "PROCESSING",
          attemptCount: {
            increment: 1,
          },
          lastAttemptAt: now,
        },
      });

      if (updatedCount.count === 1) {
        const refreshed = await prisma.integrationSyncJob.findUnique({ where: { id: item.id } });
        if (refreshed) {
          reserved.push(refreshed);
        }
      }
    }

    return reserved;
  }

  async markJobSuccess(args: {
    id: string;
    externalReference?: string | null;
    responsePayload?: Prisma.JsonValue | Record<string, unknown> | null;
  }) {
    return prisma.integrationSyncJob.update({
      where: { id: args.id },
      data: {
        status: "SUCCESS",
        processedAt: new Date(),
        externalReference: args.externalReference ?? null,
        responsePayload: toJsonInput(args.responsePayload ?? null),
        lastError: null,
      },
    });
  }

  async markJobFailure(args: {
    id: string;
    lastError: string;
    attemptCount: number;
    maxAttempts: number;
    retryDelayMinutes: number;
  }) {
    const isDeadLetter = args.attemptCount >= args.maxAttempts;

    const job = await prisma.integrationSyncJob.update({
      where: { id: args.id },
      data: {
        status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
        lastError: args.lastError,
        nextAttemptAt: isDeadLetter
          ? new Date(Date.now() + args.retryDelayMinutes * 60000)
          : new Date(Date.now() + args.retryDelayMinutes * 60000),
      },
    });

    if (isDeadLetter) {
      await prisma.integrationDeadLetter.upsert({
        where: {
          jobId: job.id,
        },
        update: {
          channel: job.channel,
          jobType: job.jobType,
          entityType: job.entityType,
          entityId: job.entityId,
          payload: toJsonInput(job.payload),
          lastError: args.lastError,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          resolved: false,
          resolvedAt: null,
          resolvedByUserId: null,
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
        create: {
          tenantId: job.tenantId,
          jobId: job.id,
          channel: job.channel,
          jobType: job.jobType,
          entityType: job.entityType,
          entityId: job.entityId,
          payload: toJsonInput(job.payload),
          lastError: args.lastError,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
        },
      });
    }

    return job;
  }

  async markJobObservedFailure(args: {
    id: string;
    lastError: string;
    retryDelayMinutes: number;
    responsePayload?: Prisma.JsonValue | Record<string, unknown> | null;
  }) {
    const current = await prisma.integrationSyncJob.findUnique({
      where: { id: args.id },
    });

    if (!current) {
      return null;
    }

    const nextAttemptCount = current.attemptCount + 1;
    const isDeadLetter = nextAttemptCount >= current.maxAttempts;
    const now = new Date();

    const job = await prisma.integrationSyncJob.update({
      where: { id: args.id },
      data: {
        status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
        attemptCount: nextAttemptCount,
        lastAttemptAt: now,
        lastError: args.lastError,
        nextAttemptAt: new Date(now.getTime() + args.retryDelayMinutes * 60000),
        ...(args.responsePayload !== undefined ? { responsePayload: toJsonInput(args.responsePayload) } : {}),
      },
    });

    if (isDeadLetter) {
      await prisma.integrationDeadLetter.upsert({
        where: {
          jobId: job.id,
        },
        update: {
          channel: job.channel,
          jobType: job.jobType,
          entityType: job.entityType,
          entityId: job.entityId,
          payload: toJsonInput(job.payload),
          lastError: args.lastError,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          resolved: false,
          resolvedAt: null,
          resolvedByUserId: null,
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
        create: {
          tenantId: job.tenantId,
          jobId: job.id,
          channel: job.channel,
          jobType: job.jobType,
          entityType: job.entityType,
          entityId: job.entityId,
          payload: toJsonInput(job.payload),
          lastError: args.lastError,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
        },
      });
    }

    return job;
  }

  async listDeadLetters() {
    return prisma.integrationDeadLetter.findMany({
      where: {
        deleted: false,
        resolved: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async retryDeadLetter(input: RetryDeadLetterInput) {
    const deadLetter = await prisma.integrationDeadLetter.findFirst({
      where: {
        jobId: input.jobId,
        deleted: false,
      },
      include: {
        job: true,
      },
    });

    if (!deadLetter) {
      return null;
    }

    await prisma.integrationDeadLetter.update({
      where: {
        id: deadLetter.id,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: input.resolvedByUserId,
      },
    });

    const payloadRecord = (deadLetter.job.payload as Record<string, unknown> | null) ?? {};
    const cleanedPayload = {
      ...payloadRecord,
      forceFail: false,
    } as Prisma.InputJsonValue;

    return prisma.integrationSyncJob.update({
      where: {
        id: deadLetter.jobId,
      },
      data: {
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        payload: cleanedPayload,
      },
    });
  }

  async findJobById(id: string) {
    return prisma.integrationSyncJob.findFirst({
      where: {
        id,
        deleted: false,
      },
    });
  }

  async updateJobResponsePayload(args: {
    id: string;
    responsePayload: Prisma.JsonValue | Record<string, unknown> | null;
    externalReference?: string | null;
  }) {
    return prisma.integrationSyncJob.update({
      where: {
        id: args.id,
      },
      data: {
        responsePayload: toJsonInput(args.responsePayload),
        ...(args.externalReference !== undefined ? { externalReference: args.externalReference } : {}),
      },
    });
  }

  async listPendingTrendyolBatchCheckJobs(args: { limit: number; staleBefore: Date }) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: "TRENDYOL",
        jobType: {
          in: ["PRODUCT_SYNC", "STOCK_SYNC", "PRICE_SYNC"],
        },
        status: "SUCCESS",
        externalReference: {
          not: null,
        },
        OR: [
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              equals: Prisma.JsonNull,
            },
          },
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              lt: args.staleBefore.toISOString(),
            },
          },
        ],
      },
      orderBy: {
        processedAt: "asc",
      },
      take: args.limit,
    });
  }

  async listPendingN11TaskCheckJobs(args: { limit: number; staleBefore: Date }) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: "N11",
        jobType: {
          in: ["PRODUCT_SYNC", "STOCK_SYNC", "PRICE_SYNC"],
        },
        status: "SUCCESS",
        externalReference: {
          not: null,
        },
        OR: [
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              equals: Prisma.JsonNull,
            },
          },
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              lt: args.staleBefore.toISOString(),
            },
          },
        ],
      },
      orderBy: {
        processedAt: "asc",
      },
      take: args.limit,
    });
  }

  async listPendingHepsiburadaUploadCheckJobs(args: { limit: number; staleBefore: Date }) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: "HEPSIBURADA",
        jobType: {
          in: ["STOCK_SYNC", "PRICE_SYNC"],
        },
        status: "SUCCESS",
        externalReference: {
          not: null,
        },
        OR: [
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              equals: Prisma.JsonNull,
            },
          },
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              lt: args.staleBefore.toISOString(),
            },
          },
        ],
      },
      orderBy: {
        processedAt: "asc",
      },
      take: args.limit,
    });
  }

  async listPendingPazaramaBatchCheckJobs(args: { limit: number; staleBefore: Date }) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: "PAZARAMA",
        jobType: "PRODUCT_SYNC",
        status: "SUCCESS",
        externalReference: {
          not: null,
        },
        OR: [
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              equals: Prisma.JsonNull,
            },
          },
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              lt: args.staleBefore.toISOString(),
            },
          },
        ],
      },
      orderBy: {
        processedAt: "asc",
      },
      take: args.limit,
    });
  }

  async listPendingPazaramaListingBatchCheckJobs(args: { limit: number; staleBefore: Date }) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: "PAZARAMA",
        jobType: {
          in: ["STOCK_SYNC", "PRICE_SYNC"],
        },
        status: "SUCCESS",
        externalReference: {
          not: null,
        },
        OR: [
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              equals: Prisma.JsonNull,
            },
          },
          {
            responsePayload: {
              path: ["batchCheckedAt"],
              lt: args.staleBefore.toISOString(),
            },
          },
        ],
      },
      orderBy: {
        processedAt: "asc",
      },
      take: args.limit,
    });
  }

  async listRecentStockSyncJobs(limit: number) {
    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        jobType: "STOCK_SYNC",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  async countStockSyncJobsByStatus() {
    const grouped = await prisma.integrationSyncJob.groupBy({
      by: ["status"],
      where: {
        deleted: false,
        jobType: "STOCK_SYNC",
      },
      _count: {
        _all: true,
      },
    });

    return Object.fromEntries(grouped.map((item) => [item.status, item._count._all])) as Record<string, number>;
  }

  async countStockSyncJobsByChannel() {
    const grouped = await prisma.integrationSyncJob.groupBy({
      by: ["channel"],
      where: {
        deleted: false,
        jobType: "STOCK_SYNC",
        channel: {
          in: ["TRENDYOL", "N11", "PAZARAMA", "HEPSIBURADA"],
        },
      },
      _count: {
        _all: true,
      },
    });

    return Object.fromEntries(grouped.map((item) => [item.channel, item._count._all])) as Record<string, number>;
  }
}
