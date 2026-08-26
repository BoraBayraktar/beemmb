import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

export class BankReconciliationRepository {
  async findFinancialAccountById(id: string) {
    return prisma.financialAccount.findFirst({
      where: {
        id,
        deleted: false,
        isActive: true,
      },
    });
  }

  async findImportById(id: string) {
    return (prisma as any).bankStatementImport.findUnique({
      where: { id },
      include: {
        financialAccount: true,
        lines: {
          orderBy: { lineIndex: "asc" },
          include: {
            match: {
              include: {
                cashTransaction: {
                  select: {
                    id: true,
                    title: true,
                    amount: true,
                    currency: true,
                    transactionAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findLatestImportForAccount(financialAccountId: string) {
    return (prisma as any).bankStatementImport.findFirst({
      where: {
        financialAccountId,
        status: { in: ["DRAFT", "READY"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        lines: {
          orderBy: { lineIndex: "asc" },
          include: {
            match: {
              include: {
                cashTransaction: {
                  select: {
                    id: true,
                    title: true,
                    amount: true,
                    currency: true,
                    transactionAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createImport(args: {
    financialAccountId: string;
    fileName?: string | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    importedByUserId?: string | null;
    lines: Array<{
      lineIndex: number;
      transactionAt: Date;
      description: string;
      amount: number;
      signedAmount: number;
      balanceAfter?: number | null;
    }>;
  }) {
    const tenantId = requireTenantId();

    return (prisma as any).bankStatementImport.create({
      data: {
        tenantId,
        financialAccountId: args.financialAccountId,
        fileName: args.fileName ?? null,
        periodStart: args.periodStart ?? null,
        periodEnd: args.periodEnd ?? null,
        status: "READY",
        importedByUserId: args.importedByUserId ?? null,
        lines: {
          create: args.lines.map((line) => ({
            tenantId,
            lineIndex: line.lineIndex,
            transactionAt: line.transactionAt,
            description: line.description,
            amount: line.amount,
            signedAmount: line.signedAmount,
            balanceAfter: line.balanceAfter ?? null,
            matchStatus: "UNMATCHED",
          })),
        },
      },
      include: {
        financialAccount: true,
        lines: {
          orderBy: { lineIndex: "asc" },
          include: { match: true },
        },
      },
    });
  }

  async listCandidateCashTransactions(financialAccountId: string, fromDate: Date, toDate: Date) {
    return (prisma as any).cashTransaction.findMany({
      where: {
        deleted: false,
        status: "RECORDED",
        accountId: financialAccountId,
        transactionAt: {
          gte: fromDate,
          lte: toDate,
        },
        reconciliationMatch: null,
      },
      orderBy: { transactionAt: "desc" },
    });
  }

  async findStatementLineById(id: string) {
    return (prisma as any).bankStatementLine.findUnique({
      where: { id },
      include: {
        import: {
          include: {
            financialAccount: true,
          },
        },
        match: true,
      },
    });
  }

  async findCashTransactionById(id: string) {
    return (prisma as any).cashTransaction.findFirst({
      where: {
        id,
        deleted: false,
        status: "RECORDED",
      },
      include: {
        reconciliationMatch: true,
      },
    });
  }

  async upsertSuggestedMatch(args: {
    statementLineId: string;
    cashTransactionId: string;
  }) {
    return (prisma as any).bankReconciliationMatch.upsert({
      where: { statementLineId: args.statementLineId },
      create: {
        tenantId: requireTenantId(),
        statementLineId: args.statementLineId,
        cashTransactionId: args.cashTransactionId,
        status: "SUGGESTED",
      },
      update: {
        cashTransactionId: args.cashTransactionId,
        status: "SUGGESTED",
        confirmedAt: null,
        confirmedByUserId: null,
      },
    });
  }

  async markLineSuggested(statementLineId: string) {
    return (prisma as any).bankStatementLine.update({
      where: { id: statementLineId },
      data: { matchStatus: "SUGGESTED" },
    });
  }

  async confirmMatch(args: {
    statementLineId: string;
    cashTransactionId: string;
    confirmedByUserId: string;
  }) {
    return (prisma as any).$transaction([
      (prisma as any).bankReconciliationMatch.update({
        where: { statementLineId: args.statementLineId },
        data: {
          cashTransactionId: args.cashTransactionId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          confirmedByUserId: args.confirmedByUserId,
        },
      }),
      (prisma as any).bankStatementLine.update({
        where: { id: args.statementLineId },
        data: { matchStatus: "CONFIRMED" },
      }),
    ]);
  }

  async setImportCompleted(importId: string) {
    const importRecord = await this.findImportById(importId);
    if (!importRecord) {
      return null;
    }

    const pendingCount = importRecord.lines.filter((line: { matchStatus: string }) => line.matchStatus !== "CONFIRMED").length;
    if (pendingCount > 0) {
      return importRecord;
    }

    return (prisma as any).bankStatementImport.update({
      where: { id: importId },
      data: { status: "COMPLETED" },
    });
  }
}

export const bankReconciliationRepository = new BankReconciliationRepository();
