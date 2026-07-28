import type { AdminCounterpartyFinanceTerms } from "@/modules/finance/contracts/counterparty-finance-terms.contract";

export type AdminPaymentReadinessItem = {
  supplierId: string;
  supplierKey: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  documentCount: number;
  draftCount: number;
  lastIssueDate: string | null;
  recordedPaymentCount: number;
  remainingAmount: number;
  topVariantSummary: string | null;
  detailHref: string;
  sourceHref: string;
  counterpartyFinanceTerms: AdminCounterpartyFinanceTerms | null;
};

export type AdminPaymentsSummary = {
  totalPendingAmount: number;
  totalRecordedAmount: number;
  supplierCount: number;
  draftDocumentCount: number;
  recordedCount: number;
  currency: string;
};

export type AdminPaymentsResult = {
  items: AdminPaymentReadinessItem[];
  summary: AdminPaymentsSummary;
};

export type AdminPaymentRecordItem = {
  id: string;
  supplierId: string;
  financialAccountId: string | null;
  amount: number;
  currency: string;
  status: "RECORDED" | "CANCELLED";
  paidAt: string;
  note: string | null;
  recordedByUserId: string | null;
  createdAt: string;
};

export type AdminCreatePaymentRecordInput = {
  supplierId: string;
  financialAccountId: string;
  amount: number;
  paidAt: string;
  note?: string | null;
  recordedByUserId: string;
};
