import type { AdminFinanceAllocationSummary } from "@/modules/finance/contracts/allocation.contract";

export type AdminCashTransactionDirection = "IN" | "OUT" | "TRANSFER";
export type AdminCashTransactionSourceType = "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND";
export type AdminCashTransactionCategory =
  | "GENERAL_INCOME"
  | "GENERAL_EXPENSE"
  | "MARKETPLACE_COMMISSION"
  | "SHIPPING_EXPENSE"
  | "SERVICE_FEE"
  | "REFUND"
  | "TRANSFER";

export type AdminCashTransactionCounterpartyKind = "CUSTOMER" | "SUPPLIER" | "UNREGISTERED";

export type AdminCashTransactionItem = {
  id: string;
  accountId: string;
  accountName: string;
  direction: AdminCashTransactionDirection;
  sourceType: AdminCashTransactionSourceType;
  category: AdminCashTransactionCategory | null;
  status: "RECORDED" | "CANCELLED";
  amount: number;
  currency: string;
  transactionAt: string;
  title: string;
  note: string | null;
  counterpartyKind: AdminCashTransactionCounterpartyKind;
  counterpartyName: string | null;
  customerAccountId: string | null;
  supplierId: string | null;
  customerAccountSlug: string | null;
  supplierSlug: string | null;
  sourceReferenceId: string | null;
};

export type AdminCashTransactionDetail = AdminCashTransactionItem & {
  allocationSummary: AdminFinanceAllocationSummary | null;
};

export type AdminCashTransactionsSummary = {
  totalIncoming: number;
  totalOutgoing: number;
  netAmount: number;
  transactionCount: number;
  currency: string;
};

export type AdminCashTransactionsResult = {
  items: AdminCashTransactionItem[];
  summary: AdminCashTransactionsSummary;
};

export type AdminCashTransactionsQuery = {
  search?: string;
  direction?: "all" | AdminCashTransactionDirection;
  from?: string;
  to?: string;
  accountId?: string;
};

export type AdminCreateCashTransactionInput = {
  accountId: string;
  direction: AdminCashTransactionDirection;
  sourceType?: AdminCashTransactionSourceType;
  category?: AdminCashTransactionCategory;
  targetAccountId?: string;
  sourceReferenceId?: string;
  amount: number;
  transactionAt?: string;
  title: string;
  note?: string | null;
  counterpartyKind?: AdminCashTransactionCounterpartyKind;
  customerAccountId?: string | null;
  supplierId?: string | null;
  counterpartyName?: string | null;
};
