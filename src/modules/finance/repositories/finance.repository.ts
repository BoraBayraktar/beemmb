import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { AdminReceivableStatus } from "@/modules/finance/contracts/receivables.contract";

type ListOperationalReceivablesArgs = {
  search?: string;
  paymentStatuses: AdminReceivableStatus[];
  page: number;
  pageSize: number;
};

export class FinanceRepository {
  async listOperationalReceivables(args: ListOperationalReceivablesArgs) {
    return (prisma.order as any).findMany({
      where: {
        deleted: false,
        status: "CONFIRMED",
        cariId: {
          not: null,
        },
        paymentStatus: {
          in: args.paymentStatuses,
        },
        ...(args.search
          ? {
              orderNumber: {
                contains: args.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            defaultPaymentTermDays: true,
          },
        },
        items: {
          where: {
            deleted: false,
          },
          select: {
            quantity: true,
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            documentNumber: true,
            issueDate: true,
            dueDate: true,
            totalAmount: true,
            currency: true,
            counterpartyName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async findOperationalReceivableOrderById(orderId: string) {
    return (prisma.order as any).findFirst({
      where: {
        id: orderId,
        deleted: false,
        status: "CONFIRMED",
        cariId: {
          not: null,
        },
        paymentStatus: {
          in: ["PENDING", "AUTHORIZED", "FAILED"],
        },
      },
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            defaultPaymentTermDays: true,
          },
        },
        items: {
          where: {
            deleted: false,
          },
          select: {
            quantity: true,
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            documentNumber: true,
            issueDate: true,
            dueDate: true,
            totalAmount: true,
            currency: true,
            counterpartyName: true,
          },
        },
      },
    });
  }

  async countOperationalReceivables(args: Pick<ListOperationalReceivablesArgs, "search" | "paymentStatuses">) {
    return prisma.order.count({
      where: {
        deleted: false,
        status: "CONFIRMED",
        cariId: {
          not: null,
        },
        paymentStatus: {
          in: args.paymentStatuses,
        },
        ...(args.search
          ? {
              orderNumber: {
                contains: args.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
    });
  }

  async summarizeOperationalReceivables() {
    const baseWhere = {
      deleted: false,
      status: "CONFIRMED" as const,
      cariId: {
        not: null,
      },
    };

    const [aggregate, pendingCount, authorizedCount, failedCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          ...baseWhere,
          paymentStatus: {
            in: ["PENDING", "AUTHORIZED", "FAILED"],
          },
        },
        _sum: {
          total: true,
        },
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          paymentStatus: "PENDING",
        },
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          paymentStatus: "AUTHORIZED",
        },
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          paymentStatus: "FAILED",
        },
      }),
    ]);

    return {
      totalOpenAmount: aggregate._sum.total?.toNumber() ?? 0,
      pendingCount,
      authorizedCount,
      failedCount,
      currency: "TRY",
    };
  }

  async listOperationalReceivableDueSnapshots() {
    return prisma.order.findMany({
      where: {
        deleted: false,
        status: "CONFIRMED",
        cariId: {
          not: null,
        },
        paymentStatus: {
          in: ["PENDING", "AUTHORIZED", "FAILED"],
        },
      },
      select: {
        total: true,
        currency: true,
        createdAt: true,
        cari: {
          select: {
            defaultPaymentTermDays: true,
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          take: 1,
          select: {
            issueDate: true,
            dueDate: true,
          },
        },
      },
    });
  }

  async listCollectionRecords(orderIds?: string[]) {
    return prisma.collectionRecord.findMany({
      where: {
        deleted: false,
        ...(orderIds && orderIds.length > 0 ? { orderId: { in: orderIds } } : {}),
      },
      orderBy: [
        { collectedAt: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async createCollectionRecord(args: {
    orderId: string;
    financialAccountId?: string | null;
    amount: number;
    currency: string;
    collectedAt: Date;
    note?: string | null;
    recordedByUserId: string;
    onlineCollectionProvider?: string | null;
    onlineCollectionExternalId?: string | null;
  }) {
    return prisma.collectionRecord.create({
      data: {
        tenantId: requireTenantId(),
        orderId: args.orderId,
        financialAccountId: args.financialAccountId ?? null,
        amount: args.amount,
        currency: args.currency,
        collectedAt: args.collectedAt,
        note: args.note ?? null,
        recordedByUserId: args.recordedByUserId,
        onlineCollectionProvider: args.onlineCollectionProvider ?? null,
        onlineCollectionExternalId: args.onlineCollectionExternalId ?? null,
      } as any,
    });
  }

  async findCollectionRecordByOnlineExternalId(providerCode: string, externalPaymentId: string) {
    return prisma.collectionRecord.findFirst({
      where: {
        deleted: false,
        onlineCollectionProvider: providerCode,
        onlineCollectionExternalId: externalPaymentId,
      },
    });
  }

  async findCollectionRecordById(id: string) {
    return prisma.collectionRecord.findFirst({
      where: {
        id,
        deleted: false,
      },
    });
  }

  async findPaymentRecordById(id: string) {
    return prisma.paymentRecord.findFirst({
      where: {
        id,
        deleted: false,
      },
    });
  }

  async listPaymentRecords(cariIds?: string[]) {
    return prisma.paymentRecord.findMany({
      where: {
        deleted: false,
        ...(cariIds && cariIds.length > 0 ? { cariId: { in: cariIds } } : {}),
      },
      orderBy: [
        { paidAt: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async createPaymentRecord(args: {
    supplierId: string;
    financialAccountId?: string | null;
    amount: number;
    currency: string;
    paidAt: Date;
    note?: string | null;
    recordedByUserId: string;
  }) {
    return prisma.paymentRecord.create({
      data: {
        tenantId: requireTenantId(),
        cariId: args.supplierId,
        financialAccountId: args.financialAccountId ?? null,
        amount: args.amount,
        currency: args.currency,
        paidAt: args.paidAt,
        note: args.note ?? null,
        recordedByUserId: args.recordedByUserId,
      },
    });
  }

  async findSupplierById(id: string) {
    return prisma.cari.findFirst({
      where: {
        id,
        isSupplier: true,
        deleted: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        taxNumber: true,
        isActive: true,
      },
    });
  }

  async listCollectionRecordsForOrders(orderIds: string[]) {
    if (orderIds.length === 0) {
      return [];
    }

    return this.listCollectionRecords(orderIds);
  }

  async listBusinessDocumentsForSupplier(supplierId: string) {
    return this.listBusinessDocumentsForCari(supplierId);
  }

  async listOrdersForCari(cariId: string) {
    return prisma.order.findMany({
      where: {
        deleted: false,
        cariId,
        status: "CONFIRMED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });
  }

  async listCashTransactionsForCari(cariId: string) {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        cariId,
      },
      orderBy: [
        { transactionAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });
  }

  async listCashTransactionsWithCari() {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        cariId: {
          not: null,
        },
      },
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { transactionAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });
  }

  async listBusinessDocumentsForCari(cariId: string) {
    return prisma.businessDocument.findMany({
      where: {
        deleted: false,
        cariId,
      },
      orderBy: {
        issueDate: "desc",
      },
      take: 100,
      select: {
        id: true,
        documentNumber: true,
        documentType: true,
        status: true,
        issueDate: true,
        totalAmount: true,
        currency: true,
      },
    });
  }

  async findOrderCustomerAccountId(orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        deleted: false,
      },
      select: {
        cariId: true,
      },
    });

    return order?.cariId ?? null;
  }

  async listFinancialAccounts(args: { search?: string; type?: "CASH" | "BANK" }) {
    return ((prisma as any).financialAccount).findMany({
      where: {
        deleted: false,
        ...(args.type ? { type: args.type } : {}),
        ...(args.search
          ? {
              name: {
                contains: args.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      include: {
        transactions: {
          where: {
            deleted: false,
            status: "RECORDED",
          },
          select: {
            id: true,
            direction: true,
            amount: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async findFinancialAccountById(id: string) {
    return ((prisma as any).financialAccount).findFirst({
      where: {
        id,
        deleted: false,
      },
    });
  }

  async createFinancialAccount(args: {
    name: string;
    type: "CASH" | "BANK";
    currency: string;
    openingBalance: number;
    note?: string | null;
  }) {
    return ((prisma as any).financialAccount).create({
      data: {
        tenantId: requireTenantId(),
        name: args.name,
        type: args.type,
        currency: args.currency,
        openingBalance: args.openingBalance,
        note: args.note ?? null,
      },
    });
  }

  async listCashTransactions(args: { search?: string; direction?: "IN" | "OUT" | "TRANSFER"; accountId?: string; fromDate?: Date; toDate?: Date }) {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        ...(args.direction ? { direction: args.direction } : {}),
        ...(args.accountId ? { accountId: args.accountId } : {}),
        ...(args.fromDate || args.toDate
          ? {
              transactionAt: {
                ...(args.fromDate ? { gte: args.fromDate } : {}),
                ...(args.toDate ? { lte: args.toDate } : {}),
              },
            }
          : {}),
        ...(args.search
          ? {
              OR: [
                {
                  title: {
                    contains: args.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  counterpartyName: {
                    contains: args.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        cari: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [
        { transactionAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });
  }

  async listCashTransactionsForIncomeExpenseReport(args: { fromDate: Date; toDate: Date; accountId?: string }) {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        ...(args.accountId ? { accountId: args.accountId } : {}),
        transactionAt: {
          gte: args.fromDate,
          lte: args.toDate,
        },
      },
      select: {
        id: true,
        direction: true,
        category: true,
        sourceType: true,
        amount: true,
        currency: true,
      },
      orderBy: {
        transactionAt: "desc",
      },
    });
  }

  async listCashTransactionsBySourceReferenceId(sourceReferenceId: string) {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        sourceReferenceId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        cari: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [
        { transactionAt: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async createCashTransaction(args: {
    accountId: string;
    direction: "IN" | "OUT" | "TRANSFER";
    sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND";
    category?: "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER" | null;
    amount: number;
    currency: string;
    transactionAt: Date;
    title: string;
    note?: string | null;
    counterpartyName?: string | null;
    counterpartyKind?: "CUSTOMER" | "SUPPLIER" | "UNREGISTERED";
    cariId?: string | null;
    sourceReferenceId?: string | null;
    createdByUserId?: string | null;
  }) {
    return ((prisma as any).cashTransaction).create({
      data: {
        tenantId: requireTenantId(),
        accountId: args.accountId,
        direction: args.direction,
        sourceType: args.sourceType,
        category: args.category ?? null,
        amount: args.amount,
        currency: args.currency,
        transactionAt: args.transactionAt,
        title: args.title,
        note: args.note ?? null,
        counterpartyKind: args.counterpartyKind ?? "UNREGISTERED",
        cariId: args.cariId ?? null,
        counterpartyName: args.counterpartyName ?? null,
        sourceReferenceId: args.sourceReferenceId ?? null,
        createdByUserId: args.createdByUserId ?? null,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        cari: {
          select: {
            slug: true,
          },
        },
      },
    });
  }

  async listBusinessDocumentsForOrder(orderId: string) {
    return prisma.businessDocument.findMany({
      where: {
        deleted: false,
        orderId,
      },
      orderBy: {
        issueDate: "asc",
      },
      select: {
        id: true,
        documentNumber: true,
        issueDate: true,
        totalAmount: true,
        currency: true,
      },
    });
  }

  async createAllocationLinks(
    links: Array<{
      collectionRecordId: string | null;
      paymentRecordId: string | null;
      targetType: "ORDER" | "BUSINESS_DOCUMENT" | "BUSINESS_DOCUMENT_LINE";
      orderId: string | null;
      businessDocumentId: string | null;
      businessDocumentLineId?: string | null;
      amount: number;
      currency: string;
    }>,
  ) {
    if (links.length === 0) {
      return;
    }

    const tenantId = requireTenantId();

    await prisma.financeAllocationLink.createMany({
      data: links.map((link) => ({
        tenantId,
        collectionRecordId: link.collectionRecordId,
        paymentRecordId: link.paymentRecordId,
        targetType: link.targetType,
        orderId: link.orderId,
        businessDocumentId: link.businessDocumentId,
        businessDocumentLineId: link.businessDocumentLineId ?? null,
        amount: link.amount,
        currency: link.currency,
      })),
    });
  }

  async softDeleteAllocationLinksForCollection(collectionRecordId: string) {
    await prisma.financeAllocationLink.updateMany({
      where: {
        collectionRecordId,
        deleted: false,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
      },
    });
  }

  async softDeleteAllocationLinksForPayment(paymentRecordId: string) {
    await prisma.financeAllocationLink.updateMany({
      where: {
        paymentRecordId,
        deleted: false,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
      },
    });
  }

  async sumAllocatedAmountsByBusinessDocumentLineIds(
    lineIds: string[],
    exclude?: { collectionRecordId?: string; paymentRecordId?: string },
  ) {
    if (lineIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await prisma.financeAllocationLink.groupBy({
      by: ["businessDocumentLineId"],
      where: {
        deleted: false,
        businessDocumentLineId: { in: lineIds },
        ...(exclude?.collectionRecordId
          ? { NOT: { collectionRecordId: exclude.collectionRecordId } }
          : {}),
        ...(exclude?.paymentRecordId
          ? { NOT: { paymentRecordId: exclude.paymentRecordId } }
          : {}),
      },
      _sum: {
        amount: true,
      },
    });

    const map = new Map<string, number>();

    for (const row of rows) {
      if (!row.businessDocumentLineId) {
        continue;
      }

      map.set(row.businessDocumentLineId, row._sum.amount?.toNumber() ?? 0);
    }

    return map;
  }

  async listBusinessDocumentLinesForOrder(orderId: string) {
    return prisma.businessDocumentLine.findMany({
      where: {
        businessDocument: {
          deleted: false,
          orderId,
        },
      },
      include: {
        businessDocument: {
          select: {
            id: true,
            documentNumber: true,
            issueDate: true,
            currency: true,
            orderId: true,
          },
        },
      },
      orderBy: [
        { businessDocument: { issueDate: "asc" } },
        { createdAt: "asc" },
      ],
    });
  }

  async listBusinessDocumentLinesForSupplier(supplierId: string) {
    return prisma.businessDocumentLine.findMany({
      where: {
        businessDocument: {
          deleted: false,
          cariId: supplierId,
        },
      },
      include: {
        businessDocument: {
          select: {
            id: true,
            documentNumber: true,
            issueDate: true,
            currency: true,
            orderId: true,
          },
        },
      },
      orderBy: [
        { businessDocument: { issueDate: "asc" } },
        { createdAt: "asc" },
      ],
    });
  }

  async findBusinessDocumentLineById(lineId: string) {
    return prisma.businessDocumentLine.findFirst({
      where: {
        id: lineId,
      },
      include: {
        businessDocument: {
          select: {
            id: true,
            documentNumber: true,
            orderId: true,
            cariId: true,
            currency: true,
          },
        },
      },
    });
  }

  async findBusinessDocumentSummaryById(documentId: string) {
    return prisma.businessDocument.findFirst({
      where: {
        id: documentId,
        deleted: false,
      },
      select: {
        id: true,
        documentNumber: true,
        orderId: true,
        cariId: true,
        totalAmount: true,
        currency: true,
        issueDate: true,
        inventoryTransactionId: true,
      },
    });
  }

  async listAllocationLinksForBusinessDocument(documentId: string) {
    return prisma.financeAllocationLink.findMany({
      where: {
        deleted: false,
        OR: [
          { businessDocumentId: documentId },
          { businessDocumentLine: { businessDocumentId: documentId } },
        ],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        businessDocument: {
          select: {
            documentNumber: true,
          },
        },
        businessDocumentLine: {
          select: {
            productName: true,
            productVariantTitle: true,
          },
        },
        collectionRecord: {
          select: {
            id: true,
            collectedAt: true,
            amount: true,
            currency: true,
          },
        },
        paymentRecord: {
          select: {
            id: true,
            paidAt: true,
            amount: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async listAllocationLinksForCollection(collectionRecordId: string) {
    return prisma.financeAllocationLink.findMany({
      where: {
        deleted: false,
        collectionRecordId,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        businessDocument: {
          select: {
            documentNumber: true,
          },
        },
        businessDocumentLine: {
          select: {
            productName: true,
            productVariantTitle: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async listAllocationLinksForPayment(paymentRecordId: string) {
    return prisma.financeAllocationLink.findMany({
      where: {
        deleted: false,
        paymentRecordId,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        businessDocument: {
          select: {
            documentNumber: true,
          },
        },
        businessDocumentLine: {
          select: {
            productName: true,
            productVariantTitle: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async listAllocationLinksForOrder(orderId: string) {
    return prisma.financeAllocationLink.findMany({
      where: {
        deleted: false,
        OR: [
          { orderId },
          { collectionRecord: { orderId } },
        ],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        businessDocument: {
          select: {
            documentNumber: true,
          },
        },
        businessDocumentLine: {
          select: {
            productName: true,
            productVariantTitle: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async listAllocationLinksForSupplier(supplierId: string) {
    return prisma.financeAllocationLink.findMany({
      where: {
        deleted: false,
        paymentRecord: {
          cariId: supplierId,
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        businessDocument: {
          select: {
            documentNumber: true,
          },
        },
        businessDocumentLine: {
          select: {
            productName: true,
            productVariantTitle: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async findCashTransactionById(id: string) {
    return ((prisma as any).cashTransaction).findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        cari: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });
  }

  async listRecentCollectionRecords(take: number) {
    return prisma.collectionRecord.findMany({
      where: { deleted: false },
      orderBy: [{ collectedAt: "desc" }, { createdAt: "desc" }],
      take,
    });
  }

  async listRecentPaymentRecords(take: number) {
    return prisma.paymentRecord.findMany({
      where: { deleted: false },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take,
    });
  }

  async listRecentCashTransactionsForLedger(take: number) {
    return ((prisma as any).cashTransaction).findMany({
      where: {
        deleted: false,
        sourceType: { notIn: ["COLLECTION", "PAYMENT"] },
      },
      orderBy: [{ transactionAt: "desc" }, { createdAt: "desc" }],
      take,
    });
  }

  async findBusinessDocumentForLedgerSync(documentId: string) {
    return prisma.businessDocument.findFirst({
      where: {
        id: documentId,
        deleted: false,
      },
      include: {
        lines: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });
  }

  async listRecentIssuedBusinessDocumentsForLedger(take: number) {
    return prisma.businessDocument.findMany({
      where: {
        deleted: false,
        status: { in: ["ISSUED", "LINKED"] },
      },
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }],
      take,
    });
  }

}

export const financeRepository = new FinanceRepository();
