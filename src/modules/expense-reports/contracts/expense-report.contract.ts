export type AdminExpenseReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type AdminExpenseItemOcrStatus = "PENDING" | "COMPLETED" | "FAILED" | "SKIPPED";

export type AdminExpenseReportItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  expenseDate: string;
  receiptNo: string | null;
  amount: number;
  currency: string;
  vendorName: string;
  description: string | null;
  receiptUrl: string | null;
  receiptContentType: string | null;
  ocrStatus: AdminExpenseItemOcrStatus;
  ocrConfidence: number | null;
  createdAt: string;
};

export type AdminExpenseReportListItem = {
  id: string;
  reportNumber: string;
  status: AdminExpenseReportStatus;
  employeeUserId: string;
  employeeName: string;
  approverUserId: string | null;
  approverName: string | null;
  currency: string;
  totalAmount: number;
  itemCount: number;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminExpenseReportLifecycleEventItem = {
  id: string;
  eventType: string;
  actorType: string;
  summary: string;
  occurredAt: string;
};

export type AdminExpenseReportDetail = AdminExpenseReportListItem & {
  note: string | null;
  decisionNote: string | null;
  items: AdminExpenseReportItem[];
  lifecycleEvents: AdminExpenseReportLifecycleEventItem[];
};

export type AdminExpenseReportListScope = "mine" | "approvals" | "all";

export type AdminExpenseReportListQuery = {
  scope: AdminExpenseReportListScope;
  search?: string;
  status?: AdminExpenseReportStatus | "all";
  page?: number;
  pageSize?: number;
};

export type AdminExpenseReportListResult = {
  items: AdminExpenseReportListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminAddExpenseReportItemInput = {
  categoryId: string;
  expenseDate: string;
  receiptNo?: string | null;
  amount: number;
  currency?: string;
  vendorName: string;
  description?: string | null;
  receiptObjectKey?: string | null;
  receiptUrl?: string | null;
  receiptContentType?: string | null;
  receiptSize?: number | null;
  ocrStatus?: AdminExpenseItemOcrStatus;
  ocrRawResult?: unknown;
  ocrConfidence?: number | null;
};

export type AdminUpdateExpenseReportInput = {
  id: string;
  note?: string | null;
};

export type AdminRejectExpenseReportInput = {
  id: string;
  decisionNote: string;
};
