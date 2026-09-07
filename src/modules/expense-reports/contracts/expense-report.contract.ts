export type AdminExpenseReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RETURNED";

export type AdminExpenseReportApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";

export type AdminExpenseItemOcrStatus = "PENDING" | "COMPLETED" | "FAILED" | "SKIPPED";

export type AdminExpenseReportItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  expenseDate: string;
  receiptNo: string | null;
  amount: number;
  currency: string;
  vatRate: number | null;
  vatAmount: number | null;
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
  currentApproverUserId: string | null;
  currentApproverName: string | null;
  currency: string;
  totalAmount: number;
  itemCount: number;
  submittedAt: string | null;
  decidedAt: string | null;
  reimbursedAt: string | null;
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

export type AdminExpenseReportApprovalStepItem = {
  id: string;
  round: number;
  stepOrder: number;
  approverUserId: string;
  approverName: string;
  delegateNames: string[];
  notifyEmail: string | null;
  description: string | null;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  status: AdminExpenseReportApprovalStatus;
  decisionNote: string | null;
  decidedAt: string | null;
};

export type AdminExpenseReportDetail = AdminExpenseReportListItem & {
  note: string | null;
  currentRound: number;
  items: AdminExpenseReportItem[];
  approvals: AdminExpenseReportApprovalStepItem[];
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
  vatRate?: number | null;
  vatAmount?: number | null;
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

export type AdminReturnExpenseReportInput = {
  id: string;
  decisionNote: string;
};

export type AdminReimburseExpenseReportInput = {
  id: string;
  financialAccountId: string;
  transactionAt?: string;
  note?: string | null;
};
