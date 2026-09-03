import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

export class NegotiableInstrumentRepository {
  async listInstruments(args: {
    search?: string;
    direction?: "RECEIVABLE" | "PAYABLE";
    status?: "PORTFOLIO" | "COLLECTED" | "PAID" | "BOUNCED" | "CANCELLED";
    overdueOnly?: boolean;
  }) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return (prisma as any).negotiableInstrument.findMany({
      where: {
        deleted: false,
        ...(args.direction ? { direction: args.direction } : {}),
        ...(args.status ? { status: args.status } : {}),
        ...(args.overdueOnly
          ? {
              status: "PORTFOLIO",
              dueDate: { lt: today },
            }
          : {}),
        ...(args.search
          ? {
              OR: [
                { instrumentNumber: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyName: { contains: args.search, mode: "insensitive" as const } },
                { endorserName: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: {
        cari: { select: { slug: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  async findInstrumentById(id: string) {
    return (prisma as any).negotiableInstrument.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        cari: { select: { slug: true, name: true } },
        financialAccount: { select: { id: true, name: true, currency: true, isActive: true } },
        cashTransaction: { select: { id: true } },
      },
    });
  }

  async createInstrument(data: {
    instrumentNumber: string;
    instrumentType: "CHECK" | "PROMISSORY_NOTE";
    direction: "RECEIVABLE" | "PAYABLE";
    amount: number;
    currency: string;
    dueDate: Date;
    issueDate?: Date | null;
    counterpartyKind: "CUSTOMER" | "SUPPLIER" | "UNREGISTERED";
    customerAccountId?: string | null;
    supplierId?: string | null;
    counterpartyName?: string | null;
    endorserName?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
  }) {
    return (prisma as any).negotiableInstrument.create({
      data: {
        tenantId: requireTenantId(),
        instrumentNumber: data.instrumentNumber,
        instrumentType: data.instrumentType,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate,
        issueDate: data.issueDate ?? null,
        counterpartyKind: data.counterpartyKind,
        cariId: data.customerAccountId ?? data.supplierId ?? null,
        counterpartyName: data.counterpartyName ?? null,
        endorserName: data.endorserName ?? null,
        note: data.note ?? null,
        createdByUserId: data.createdByUserId ?? null,
      },
      include: {
        cari: { select: { slug: true, name: true } },
      },
    });
  }

  async updateInstrumentStatus(args: {
    id: string;
    status: "PORTFOLIO" | "COLLECTED" | "PAID" | "BOUNCED" | "CANCELLED";
    financialAccountId?: string | null;
    cashTransactionId?: string | null;
  }) {
    return (prisma as any).negotiableInstrument.update({
      where: { id: args.id },
      data: {
        status: args.status,
        ...(args.financialAccountId !== undefined ? { financialAccountId: args.financialAccountId } : {}),
        ...(args.cashTransactionId !== undefined ? { cashTransactionId: args.cashTransactionId } : {}),
      },
      include: {
        cari: { select: { slug: true, name: true } },
        financialAccount: { select: { id: true, name: true } },
        cashTransaction: { select: { id: true } },
      },
    });
  }

  async completeLifecycleWithCashTransaction(args: {
    instrumentId: string;
    nextStatus: "COLLECTED" | "PAID";
    financialAccountId: string;
    cashTransaction: {
      accountId: string;
      direction: "IN" | "OUT" | "TRANSFER";
      sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND" | "EXPENSE_REPORT";
      category?: "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER" | null;
      amount: number;
      currency: string;
      transactionAt: Date;
      title: string;
      note?: string | null;
      counterpartyKind?: "CUSTOMER" | "SUPPLIER" | "UNREGISTERED";
      customerAccountId?: string | null;
      supplierId?: string | null;
      counterpartyName?: string | null;
      sourceReferenceId?: string | null;
      createdByUserId?: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const cash = await (tx as any).cashTransaction.create({
        data: {
          tenantId: requireTenantId(),
          accountId: args.cashTransaction.accountId,
          direction: args.cashTransaction.direction,
          sourceType: args.cashTransaction.sourceType,
          category: args.cashTransaction.category ?? null,
          amount: args.cashTransaction.amount,
          currency: args.cashTransaction.currency,
          transactionAt: args.cashTransaction.transactionAt,
          title: args.cashTransaction.title,
          note: args.cashTransaction.note ?? null,
          counterpartyKind: args.cashTransaction.counterpartyKind ?? "UNREGISTERED",
          cariId: args.cashTransaction.customerAccountId ?? args.cashTransaction.supplierId ?? null,
          counterpartyName: args.cashTransaction.counterpartyName ?? null,
          sourceReferenceId: args.cashTransaction.sourceReferenceId ?? null,
          createdByUserId: args.cashTransaction.createdByUserId ?? null,
        },
      });

      return (tx as any).negotiableInstrument.update({
        where: { id: args.instrumentId },
        data: {
          status: args.nextStatus,
          financialAccountId: args.financialAccountId,
          cashTransactionId: cash.id,
        },
        include: {
          cari: { select: { slug: true, name: true } },
          financialAccount: { select: { id: true, name: true } },
          cashTransaction: { select: { id: true } },
        },
      });
    });
  }
}

export const negotiableInstrumentRepository = new NegotiableInstrumentRepository();
