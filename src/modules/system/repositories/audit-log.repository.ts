import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AuditLogEntityType,
  AuditLogAction,
} from "@/modules/system/contracts/audit-log.contract";
import { sha256 } from "@/modules/system/services/audit-integrity.service";

export class AuditLogRepository {
  async create(input: {
    entityType: AuditLogEntityType;
    entityId?: string | null;
    action: AuditLogAction;
    actorUserId?: string | null;
    actorType?: string;
    tenantId?: string | null;
    module?: string | null;
    route?: string | null;
    operation?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    summary?: string | null;
    metadata?: Record<string, unknown> | null;
    occurredAt?: Date | string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const previous = await tx.auditLog.findFirst({
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          chainHash: true,
        },
      });
      const now = new Date();
      const occurredAt = input.occurredAt ? new Date(input.occurredAt) : now;
      const payload = {
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType ?? "USER",
        tenantId: input.tenantId ?? null,
        module: input.module ?? null,
        route: input.route ?? null,
        operation: input.operation ?? null,
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        summary: input.summary ?? null,
        metadata: input.metadata ?? null,
        occurredAt: occurredAt.toISOString(),
        serverReceivedAt: now.toISOString(),
      };
      const payloadHash = sha256(payload);
      const previousHash = previous?.chainHash ?? null;
      const chainHash = sha256({
        payloadHash,
        previousHash,
      });

      return tx.auditLog.create({
        data: {
          ...payload,
          metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
          payloadHash,
          previousHash,
          chainHash,
          hashAlgorithm: "SHA-256",
          occurredAt,
          serverReceivedAt: now,
          timezone: "Europe/Istanbul",
        },
      });
    });
  }

  async list(args: {
    search?: string;
    entityType?: AuditLogEntityType;
    action?: AuditLogAction;
    actorUserId?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: string;
    page: number;
    pageSize: number;
  }) {
    const createdAtFilter = args.startDate || args.endDate
      ? {
          ...(args.startDate ? { gte: new Date(`${args.startDate}T00:00:00.000Z`) } : {}),
          ...(args.endDate ? { lte: new Date(`${args.endDate}T23:59:59.999Z`) } : {}),
        }
      : undefined;

    return prisma.auditLog.findMany({
      where: {
        ...(args.search
          ? {
              OR: [
                { summary: { contains: args.search, mode: "insensitive" as const } },
                { entityId: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(args.entityType ? { entityType: args.entityType } : {}),
        ...(args.action ? { action: args.action } : {}),
        ...(args.actorUserId ? { actorUserId: args.actorUserId } : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(args.tenantId ? { tenantId: args.tenantId } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async count(args: {
    search?: string;
    entityType?: AuditLogEntityType;
    action?: AuditLogAction;
    actorUserId?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: string;
  }) {
    const createdAtFilter = args.startDate || args.endDate
      ? {
          ...(args.startDate ? { gte: new Date(`${args.startDate}T00:00:00.000Z`) } : {}),
          ...(args.endDate ? { lte: new Date(`${args.endDate}T23:59:59.999Z`) } : {}),
        }
      : undefined;

    return prisma.auditLog.count({
      where: {
        ...(args.search
          ? {
              OR: [
                { summary: { contains: args.search, mode: "insensitive" as const } },
                { entityId: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(args.entityType ? { entityType: args.entityType } : {}),
        ...(args.action ? { action: args.action } : {}),
        ...(args.actorUserId ? { actorUserId: args.actorUserId } : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(args.tenantId ? { tenantId: args.tenantId } : {}),
      },
    });
  }

  async listForIntegrity(args: {
    startDate?: string;
    endDate?: string;
    take?: number;
  }) {
    const createdAtFilter = args.startDate || args.endDate
      ? {
          ...(args.startDate ? { gte: new Date(`${args.startDate}T00:00:00.000Z`) } : {}),
          ...(args.endDate ? { lte: new Date(`${args.endDate}T23:59:59.999Z`) } : {}),
        }
      : undefined;

    return prisma.auditLog.findMany({
      where: {
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
      take: args.take ?? 5000,
    });
  }

  async createAnchor(input: {
    anchorType: string;
    periodStart: Date;
    periodEnd: Date;
    recordCount: number;
    firstAuditLogId?: string | null;
    lastAuditLogId?: string | null;
    firstChainHash?: string | null;
    lastChainHash?: string | null;
    manifestHash: string;
    storageBucket?: string | null;
    storageObjectKey?: string | null;
    storageUrl?: string | null;
    storageMode?: string;
    status?: string;
    errorMessage?: string | null;
    createdByUserId?: string | null;
  }) {
    return prisma.auditAnchor.create({
      data: input,
    });
  }

  async findUsersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async findProductsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
      },
    });
  }

  async findBrandsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.brand.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async findSuppliersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.cari.findMany({
      where: {
        id: {
          in: ids,
        },
        isSupplier: true,
      },
      select: {
        id: true,
        name: true,
        taxNumber: true,
      },
    });
  }

  async findProductAttributesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.productAttributeDefinition.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async findCategoriesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.category.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async findOrdersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.order.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });
  }

  async findBusinessDocumentsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.businessDocument.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        documentNumber: true,
        documentType: true,
      },
    });
  }

  async findCollectionRecordsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.collectionRecord.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        orderId: true,
      },
    });
  }

  async findPaymentRecordsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.paymentRecord.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        cariId: true,
      },
    });
  }

  async findWarehousesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.warehouse.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  }

  async findStorefrontItemsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.storefrontItem.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        section: true,
        variant: true,
        titleTr: true,
      },
    });
  }

  async findCustomerAccountsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.cari.findMany({
      where: {
        id: {
          in: ids,
        },
        isCustomer: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}
