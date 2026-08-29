import { z } from "zod";

import type {
  AdminExpenseAnalytics,
  AdminExpenseItemReportQuery,
  AdminExpenseItemReportResult,
  AdminExpenseItemReportRow,
} from "@/modules/expense-reports/contracts/expense-report-analytics.contract";
import { expenseReportAnalyticsRepository } from "@/modules/expense-reports/repositories/expense-report-analytics.repository";

const dateFilterSchema = z.string().trim().min(1).optional();

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().min(1).optional(),
  employeeUserId: z.string().trim().min(1).optional(),
  status: z.enum(["all", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).default("all"),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const exportQuerySchema = listQuerySchema.omit({ page: true, pageSize: true });

const EXPORT_ROW_LIMIT = 10000;
const TREND_MONTHS = 12;
const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type ItemReportRepoRow = {
  id: string;
  expenseDate: Date;
  receiptNo: string | null;
  vendorName: string;
  description: string | null;
  amount: { toNumber: () => number };
  currency: string;
  receiptUrl: string | null;
  category: { name: string };
  expenseReport: { status: AdminExpenseItemReportRow["status"]; reportNumber: string; employee: { name: string } };
};

function mapItemRow(row: ItemReportRepoRow): AdminExpenseItemReportRow {
  return {
    id: row.id,
    expenseDate: row.expenseDate.toISOString(),
    receiptNo: row.receiptNo,
    vendorName: row.vendorName,
    categoryName: row.category.name,
    description: row.description,
    employeeName: row.expenseReport.employee.name,
    status: row.expenseReport.status,
    reportNumber: row.expenseReport.reportNumber,
    amount: row.amount.toNumber(),
    currency: row.currency,
    receiptUrl: row.receiptUrl,
  };
}

export class ExpenseReportAnalyticsService {
  async listItemReport(query: AdminExpenseItemReportQuery): Promise<AdminExpenseItemReportResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total, totalAmount] = await Promise.all([
      expenseReportAnalyticsRepository.listItems(parsed),
      expenseReportAnalyticsRepository.countItems(parsed),
      expenseReportAnalyticsRepository.sumItems(parsed),
    ]);

    return {
      items: rows.map(mapItemRow),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  async getExportRows(query: AdminExpenseItemReportQuery): Promise<{ items: AdminExpenseItemReportRow[]; totalAmount: number }> {
    const parsed = exportQuerySchema.parse(query);
    const [rows, totalAmount] = await Promise.all([
      expenseReportAnalyticsRepository.listItemsForExport(parsed, EXPORT_ROW_LIMIT),
      expenseReportAnalyticsRepository.sumItems(parsed),
    ]);

    return {
      items: rows.map(mapItemRow),
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  async getAnalytics(): Promise<AdminExpenseAnalytics> {
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - (TREND_MONTHS - 1));
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);

    const [summaryAggregate, items] = await Promise.all([
      expenseReportAnalyticsRepository.getApprovedSummary(),
      expenseReportAnalyticsRepository.listApprovedItemsSince(since),
    ]);

    const totalApprovedAmount = summaryAggregate._sum.totalAmount?.toNumber() ?? 0;
    const approvedReportCount = summaryAggregate._count;

    const categoryTotals = new Map<string, { categoryName: string; amount: number }>();
    const employeeTotals = new Map<string, { employeeName: string; amount: number }>();
    const monthTotals = new Map<string, number>();

    for (let i = 0; i < TREND_MONTHS; i += 1) {
      const cursor = new Date(since);
      cursor.setUTCMonth(cursor.getUTCMonth() + i);
      monthTotals.set(monthKey(cursor), 0);
    }

    for (const item of items) {
      const amount = item.amount.toNumber();

      const categoryEntry = categoryTotals.get(item.category.id) ?? { categoryName: item.category.name, amount: 0 };
      categoryEntry.amount += amount;
      categoryTotals.set(item.category.id, categoryEntry);

      const employeeEntry = employeeTotals.get(item.expenseReport.employeeUserId) ?? { employeeName: item.expenseReport.employee.name, amount: 0 };
      employeeEntry.amount += amount;
      employeeTotals.set(item.expenseReport.employeeUserId, employeeEntry);

      const key = monthKey(item.expenseDate);
      if (monthTotals.has(key)) {
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + amount);
      }
    }

    const byCategory = Array.from(categoryTotals.entries())
      .map(([categoryId, value]) => ({ categoryId, categoryName: value.categoryName, amount: Math.round(value.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const byEmployee = Array.from(employeeTotals.entries())
      .map(([employeeUserId, value]) => ({ employeeUserId, employeeName: value.employeeName, amount: Math.round(value.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const byMonth = Array.from(monthTotals.entries()).map(([month, amount]) => {
      const [, monthNumber] = month.split("-");
      const label = MONTH_LABELS[Number(monthNumber) - 1];
      return { month, label, amount: Math.round(amount * 100) / 100 };
    });

    return {
      summary: {
        totalApprovedAmount: Math.round(totalApprovedAmount * 100) / 100,
        approvedReportCount,
        averagePerReport: approvedReportCount > 0 ? Math.round((totalApprovedAmount / approvedReportCount) * 100) / 100 : 0,
        currency: "TRY",
      },
      byCategory,
      byEmployee,
      byMonth,
    };
  }
}

export const expenseReportAnalyticsService = new ExpenseReportAnalyticsService();
