import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { AdminExpenseReportStatus } from "@/modules/expense-reports/contracts/expense-report.contract";

const detailInclude = {
  employee: { select: { id: true, name: true, email: true } },
  approver: { select: { id: true, name: true, email: true } },
  items: {
    include: { category: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  lifecycleEvents: { orderBy: { occurredAt: "desc" as const } },
};

const listInclude = {
  employee: { select: { id: true, name: true } },
  approver: { select: { id: true, name: true } },
  _count: { select: { items: true } },
};

type ListFilter = {
  search?: string;
  status?: AdminExpenseReportStatus | "all";
  page: number;
  pageSize: number;
};

function buildWhere(filter: Pick<ListFilter, "search" | "status">, extra: Prisma.ExpenseReportWhereInput) {
  return {
    deleted: false,
    ...extra,
    ...(filter.status && filter.status !== "all" ? { status: filter.status } : {}),
    ...(filter.search
      ? {
          OR: [
            { reportNumber: { contains: filter.search, mode: "insensitive" as const } },
            { employee: { name: { contains: filter.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}

function generateReportNumber() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EXP-${yyyy}${mm}${dd}-${suffix}`;
}

export class ExpenseReportRepository {
  async listForEmployee(employeeUserId: string, filter: ListFilter) {
    return prisma.expenseReport.findMany({
      where: buildWhere(filter, { employeeUserId }),
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: listInclude,
    });
  }

  async countForEmployee(employeeUserId: string, filter: Pick<ListFilter, "search" | "status">) {
    return prisma.expenseReport.count({ where: buildWhere(filter, { employeeUserId }) });
  }

  async listForApprover(approverUserId: string, filter: ListFilter) {
    return prisma.expenseReport.findMany({
      where: buildWhere(filter, { approverUserId, status: filter.status === "all" ? "SUBMITTED" : filter.status }),
      orderBy: { submittedAt: "asc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: listInclude,
    });
  }

  async countForApprover(approverUserId: string, filter: Pick<ListFilter, "search" | "status">) {
    return prisma.expenseReport.count({
      where: buildWhere(filter, { approverUserId, status: filter.status === "all" ? "SUBMITTED" : filter.status }),
    });
  }

  async listAll(filter: ListFilter) {
    return prisma.expenseReport.findMany({
      where: buildWhere(filter, {}),
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: listInclude,
    });
  }

  async countAll(filter: Pick<ListFilter, "search" | "status">) {
    return prisma.expenseReport.count({ where: buildWhere(filter, {}) });
  }

  async findById(id: string) {
    return prisma.expenseReport.findFirst({
      where: { id, deleted: false },
      include: detailInclude,
    });
  }

  async createDraft(args: { employeeUserId: string }) {
    const tenantId = requireTenantId();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await prisma.expenseReport.create({
          data: {
            tenantId,
            reportNumber: generateReportNumber(),
            status: "DRAFT",
            employeeUserId: args.employeeUserId,
            totalAmount: new Prisma.Decimal(0),
            lifecycleEvents: {
              create: {
                tenantId,
                eventType: "CREATED",
                summary: "Masraf bildirimi taslağı oluşturuldu.",
                actorUserId: args.employeeUserId,
              },
            },
          },
          include: detailInclude,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Masraf bildirimi numarası üretilemedi.");
  }

  async updateNote(args: { id: string; note: string | null }) {
    return prisma.expenseReport.update({
      where: { id: args.id },
      data: { note: args.note },
      include: detailInclude,
    });
  }

  async softDelete(args: { id: string; actorUserId: string }) {
    return prisma.expenseReport.update({
      where: { id: args.id },
      data: { deleted: true, deletedDate: new Date(), deletedUserId: args.actorUserId },
    });
  }

  async addItem(args: {
    expenseReportId: string;
    categoryId: string;
    expenseDate: Date;
    receiptNo: string | null;
    amount: number;
    currency: string;
    vendorName: string;
    description: string | null;
    receiptObjectKey: string | null;
    receiptUrl: string | null;
    receiptContentType: string | null;
    receiptSize: number | null;
    ocrStatus: "PENDING" | "COMPLETED" | "FAILED" | "SKIPPED";
    ocrRawResult: unknown;
    ocrConfidence: number | null;
    actorUserId: string;
  }) {
    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      await tx.expenseReportItem.create({
        data: {
          tenantId,
          expenseReportId: args.expenseReportId,
          categoryId: args.categoryId,
          expenseDate: args.expenseDate,
          receiptNo: args.receiptNo,
          amount: new Prisma.Decimal(args.amount),
          currency: args.currency,
          vendorName: args.vendorName,
          description: args.description,
          receiptObjectKey: args.receiptObjectKey,
          receiptUrl: args.receiptUrl,
          receiptContentType: args.receiptContentType,
          receiptSize: args.receiptSize,
          ocrStatus: args.ocrStatus,
          ocrRawResult: args.ocrRawResult === undefined || args.ocrRawResult === null ? Prisma.JsonNull : (args.ocrRawResult as Prisma.InputJsonValue),
          ocrConfidence: args.ocrConfidence !== null ? new Prisma.Decimal(args.ocrConfidence) : null,
        },
      });

      return tx.expenseReport.update({
        where: { id: args.expenseReportId },
        data: {
          totalAmount: { increment: new Prisma.Decimal(args.amount) },
          lifecycleEvents: {
            create: {
              tenantId,
              eventType: "ITEM_ADDED",
              summary: `Harcama kalemi eklendi: ${args.vendorName} (${args.amount} ${args.currency})`,
              actorUserId: args.actorUserId,
            },
          },
        },
        include: detailInclude,
      });
    });
  }

  async removeItem(args: { expenseReportId: string; itemId: string; actorUserId: string }) {
    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      const item = await tx.expenseReportItem.findFirstOrThrow({ where: { id: args.itemId, expenseReportId: args.expenseReportId } });
      await tx.expenseReportItem.delete({ where: { id: args.itemId } });

      return tx.expenseReport.update({
        where: { id: args.expenseReportId },
        data: {
          totalAmount: { decrement: item.amount },
          lifecycleEvents: {
            create: {
              tenantId,
              eventType: "ITEM_REMOVED",
              summary: `Harcama kalemi silindi: ${item.vendorName}`,
              actorUserId: args.actorUserId,
            },
          },
        },
        include: detailInclude,
      });
    });
  }

  async markSubmitted(args: { id: string; approverUserId: string; actorUserId: string }) {
    const tenantId = requireTenantId();

    return prisma.expenseReport.update({
      where: { id: args.id },
      data: {
        status: "SUBMITTED",
        approverUserId: args.approverUserId,
        submittedAt: new Date(),
        lifecycleEvents: {
          create: {
            tenantId,
            eventType: "SUBMITTED",
            summary: "Masraf bildirimi onaya gönderildi.",
            actorUserId: args.actorUserId,
          },
        },
      },
      include: detailInclude,
    });
  }

  async markApproved(args: { id: string; actorUserId: string }) {
    const tenantId = requireTenantId();

    return prisma.expenseReport.update({
      where: { id: args.id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        lifecycleEvents: {
          create: {
            tenantId,
            eventType: "APPROVED",
            summary: "Masraf bildirimi onaylandı.",
            actorUserId: args.actorUserId,
          },
        },
      },
      include: detailInclude,
    });
  }

  async markRejected(args: { id: string; actorUserId: string; decisionNote: string }) {
    const tenantId = requireTenantId();

    return prisma.expenseReport.update({
      where: { id: args.id },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decisionNote: args.decisionNote,
        lifecycleEvents: {
          create: {
            tenantId,
            eventType: "REJECTED",
            summary: `Masraf bildirimi reddedildi: ${args.decisionNote}`,
            actorUserId: args.actorUserId,
          },
        },
      },
      include: detailInclude,
    });
  }
}

export const expenseReportRepository = new ExpenseReportRepository();
