import type { AdminCounterpartyFinanceTerms } from "@/modules/finance/contracts/counterparty-finance-terms.contract";
import type { AdminFinanceDueKpi } from "@/modules/finance/contracts/finance-due.contract";

export type AdminReceivableStatus = "PENDING" | "AUTHORIZED" | "FAILED";

export type AdminReceivablesQuery = {
  search?: string;
  paymentStatus?: "all" | AdminReceivableStatus;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
  locale?: string;
};

export type AdminReceivableDocumentPreview = {
  id: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string | null;
  effectiveDueDate: string;
  totalAmount: number | null;
  currency: string;
};

export type AdminReceivableListItem = {
  orderId: string;
  orderNumber: string;
  customerAccountId: string | null;
  customerAccountSlug: string | null;
  counterpartyName: string;
  paymentStatus: AdminReceivableStatus;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  effectiveDueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  latestDocument: AdminReceivableDocumentPreview | null;
};

export type AdminReceivableDetail = AdminReceivableListItem & {
  documents: AdminReceivableDocumentPreview[];
  counterpartyFinanceTerms: AdminCounterpartyFinanceTerms | null;
};

export type AdminReceivablesSummary = {
  totalOpenAmount: number;
  pendingCount: number;
  authorizedCount: number;
  failedCount: number;
  currency: string;
};

export type AdminReceivablesResult = {
  items: AdminReceivableListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: AdminReceivablesSummary;
  dueKpi: AdminFinanceDueKpi;
};
