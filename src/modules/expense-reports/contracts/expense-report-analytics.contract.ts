import type { AdminExpenseReportStatus } from "@/modules/expense-reports/contracts/expense-report.contract";

export type AdminExpenseAnalyticsSummary = {
  totalApprovedAmount: number;
  approvedReportCount: number;
  averagePerReport: number;
  currency: string;
};

export type AdminExpenseCategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
};

export type AdminExpenseEmployeeBreakdownItem = {
  employeeUserId: string;
  employeeName: string;
  amount: number;
};

export type AdminExpenseMonthlyTrendItem = {
  month: string;
  label: string;
  amount: number;
};

export type AdminExpenseAnalytics = {
  summary: AdminExpenseAnalyticsSummary;
  byCategory: AdminExpenseCategoryBreakdownItem[];
  byEmployee: AdminExpenseEmployeeBreakdownItem[];
  byMonth: AdminExpenseMonthlyTrendItem[];
};

export type AdminExpenseItemReportRow = {
  id: string;
  expenseDate: string;
  receiptNo: string | null;
  vendorName: string;
  categoryName: string;
  description: string | null;
  employeeName: string;
  status: AdminExpenseReportStatus;
  reportNumber: string;
  amount: number;
  currency: string;
  receiptUrl: string | null;
};

export type AdminExpenseItemReportQuery = {
  search?: string;
  categoryId?: string;
  employeeUserId?: string;
  status?: AdminExpenseReportStatus | "all";
  page?: number;
  pageSize?: number;
};

export type AdminExpenseItemReportResult = {
  items: AdminExpenseItemReportRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
