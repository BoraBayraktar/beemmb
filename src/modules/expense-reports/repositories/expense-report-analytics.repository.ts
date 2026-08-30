import { prisma } from "@/lib/prisma";
import type { AdminExpenseItemReportQuery } from "@/modules/expense-reports/contracts/expense-report-analytics.contract";

const itemReportInclude = {
  category: { select: { name: true } },
  expenseReport: { select: { status: true, reportNumber: true, employee: { select: { name: true } } } },
};

type ItemFilter = Pick<AdminExpenseItemReportQuery, "search" | "categoryId" | "employeeUserId" | "status" | "dateFrom" | "dateTo">;

function buildItemWhere(filter: ItemFilter) {
  const dateFrom = filter.dateFrom ? new Date(filter.dateFrom) : undefined;
  const dateTo = filter.dateTo ? new Date(filter.dateTo) : undefined;
  if (dateTo) {
    dateTo.setUTCHours(23, 59, 59, 999);
  }

  return {
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(dateFrom || dateTo
      ? {
          expenseDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    expenseReport: {
      deleted: false,
      ...(filter.status && filter.status !== "all" ? { status: filter.status } : {}),
      ...(filter.employeeUserId ? { employeeUserId: filter.employeeUserId } : {}),
    },
    ...(filter.search
      ? {
          OR: [
            { vendorName: { contains: filter.search, mode: "insensitive" as const } },
            { receiptNo: { contains: filter.search, mode: "insensitive" as const } },
            { expenseReport: { employee: { name: { contains: filter.search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
}

export class ExpenseReportAnalyticsRepository {
  async listItems(filter: Required<Pick<AdminExpenseItemReportQuery, "page" | "pageSize">> & ItemFilter) {
    return prisma.expenseReportItem.findMany({
      where: buildItemWhere(filter),
      orderBy: { expenseDate: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: itemReportInclude,
    });
  }

  async countItems(filter: ItemFilter) {
    return prisma.expenseReportItem.count({ where: buildItemWhere(filter) });
  }

  async sumItems(filter: ItemFilter) {
    const result = await prisma.expenseReportItem.aggregate({
      where: buildItemWhere(filter),
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  /** Export icin sayfalamasiz tam liste -- guvenlik siniri olarak makul bir tavan (take) uygulanir. */
  async listItemsForExport(filter: ItemFilter, limit: number) {
    return prisma.expenseReportItem.findMany({
      where: buildItemWhere(filter),
      orderBy: { expenseDate: "desc" },
      take: limit,
      include: itemReportInclude,
    });
  }

  async getApprovedSummary() {
    return prisma.expenseReport.aggregate({
      where: { status: "APPROVED", deleted: false },
      _sum: { totalAmount: true },
      _count: true,
    });
  }

  async listApprovedItemsSince(since: Date) {
    return prisma.expenseReportItem.findMany({
      where: {
        expenseDate: { gte: since },
        expenseReport: { status: "APPROVED", deleted: false },
      },
      select: {
        amount: true,
        expenseDate: true,
        category: { select: { id: true, name: true } },
        expenseReport: { select: { employeeUserId: true, employee: { select: { name: true } } } },
      },
    });
  }
}

export const expenseReportAnalyticsRepository = new ExpenseReportAnalyticsRepository();
