import { prisma } from "@/lib/prisma";

import type { FinanceAccountEntrySourceType } from "@/modules/finance/contracts/finance-account-entry.contract";

export class FinanceAccountEntryRepository {
  async createEntryLines(
    lines: Array<{
      lineKey: string;
      entryAt: Date;
      ledgerAccountId: string;
      side: "DEBIT" | "CREDIT";
      amount: number;
      currency: string;
      sourceType: FinanceAccountEntrySourceType;
      sourceId: string;
      sourceReference?: string | null;
      title: string;
      note?: string | null;
      customerAccountId?: string | null;
      supplierId?: string | null;
      financialAccountId?: string | null;
    }>,
  ) {
    if (lines.length === 0) {
      return { created: 0 };
    }

    const result = await (prisma as any).financeAccountEntry.createMany({
      data: lines,
      skipDuplicates: true,
    });

    return { created: result.count ?? 0 };
  }

  async listEntries(args: {
    fromDate?: Date;
    toDate?: Date;
    search?: string;
    sourceType?: FinanceAccountEntrySourceType;
    take?: number;
  }) {
    return (prisma as any).financeAccountEntry.findMany({
      where: {
        ...(args.sourceType ? { sourceType: args.sourceType } : {}),
        ...(args.fromDate || args.toDate
          ? {
              entryAt: {
                ...(args.fromDate ? { gte: args.fromDate } : {}),
                ...(args.toDate ? { lte: args.toDate } : {}),
              },
            }
          : {}),
        ...(args.search
          ? {
              OR: [
                { title: { contains: args.search, mode: "insensitive" as const } },
                { sourceReference: { contains: args.search, mode: "insensitive" as const } },
                { ledgerAccount: { code: { contains: args.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include: {
        ledgerAccount: { select: { code: true, name: true } },
        customerAccount: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: [{ entryAt: "desc" }, { createdAt: "desc" }],
      take: args.take ?? 500,
    });
  }

  async countBySource(sourceType: FinanceAccountEntrySourceType, sourceId: string) {
    return (prisma as any).financeAccountEntry.count({
      where: { sourceType, sourceId },
    });
  }

  async listEntriesForPeriod(args: { fromDate?: Date; toDate?: Date; take?: number }) {
    return (prisma as any).financeAccountEntry.findMany({
      where: {
        ...(args.fromDate || args.toDate
          ? {
              entryAt: {
                ...(args.fromDate ? { gte: args.fromDate } : {}),
                ...(args.toDate ? { lte: args.toDate } : {}),
              },
            }
          : {}),
      },
      include: {
        ledgerAccount: { select: { code: true, name: true, category: true } },
      },
      orderBy: [{ entryAt: "asc" }, { createdAt: "asc" }],
      take: args.take ?? 10000,
    });
  }
}

export const financeAccountEntryRepository = new FinanceAccountEntryRepository();
