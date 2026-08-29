import { prisma } from "@/lib/prisma";
import type { AdminExpenseItemReportQuery } from "@/modules/expense-reports/contracts/expense-report-analytics.contract";

const itemReportInclude = {
  category: { select: { name: true } },
  expenseReport: { select: { status: true, reportNumber: true, employee: { select: { name: true } } } },
};

function buildItemWhere(filter: Pick<AdminExpenseItemReportQuery, "search" | "categoryId" | "employeeUserId" | "status">) {
  return {
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
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
  async listItems(filter: Required<Pick<AdminExpenseItemReportQuery, "page" | "pageSize">> & Pick<AdminExpenseItemReportQuery, "search" | "categoryId" | "employeeUserId" | "status">) {
    return prisma.expenseReportItem.findMany({
      where: buildItemWhere(filter),
      orderBy: { expenseDate: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: itemReportInclude,
    });
  }

  async countItems(filter: Pick<AdminExpenseItemReportQuery, "search" | "categoryId" | "employeeUserId" | "status">) {
    return prisma.expenseReportItem.count({ where: buildItemWhere(filter) });
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
