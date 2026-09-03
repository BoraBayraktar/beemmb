export type AdminFinancialAccountType = "CASH" | "BANK";

export type AdminFinancialAccountItem = {
  id: string;
  name: string;
  type: AdminFinancialAccountType;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  transactionCount: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
};

export type AdminFinancialAccountDetailTransactionItem = {
  id: string;
  direction: "IN" | "OUT" | "TRANSFER";
  sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND" | "EXPENSE_REPORT";
  category:
    | "GENERAL_INCOME"
    | "GENERAL_EXPENSE"
    | "MARKETPLACE_COMMISSION"
    | "SHIPPING_EXPENSE"
    | "SERVICE_FEE"
    | "REFUND"
    | "TRANSFER"
    | null;
  amount: number;
  currency: string;
  title: string;
  note: string | null;
  counterpartyName: string | null;
  sourceReferenceId: string | null;
  transactionAt: string;
};

export type AdminFinancialAccountDetail = {
  account: AdminFinancialAccountItem;
  summary: {
    totalIncoming: number;
    totalOutgoing: number;
    netCashFlow: number;
    availableBalance: number;
    currency: string;
  };
  transactions: AdminFinancialAccountDetailTransactionItem[];
};

export type AdminFinancialAccountDetailQuery = {
  direction?: "all" | "IN" | "OUT" | "TRANSFER";
  fromDate?: string;
  toDate?: string;
};

export type AdminFinancialAccountsSummary = {
  totalBalance: number;
  activeAccountCount: number;
  cashAccountCount: number;
  bankAccountCount: number;
  currency: string;
};

export type AdminFinancialAccountsResult = {
  items: AdminFinancialAccountItem[];
  summary: AdminFinancialAccountsSummary;
};

export type AdminFinancialAccountsQuery = {
  search?: string;
  type?: "all" | AdminFinancialAccountType;
};

export type AdminCreateFinancialAccountInput = {
  name: string;
  type: AdminFinancialAccountType;
  currency?: string;
  openingBalance?: number;
  note?: string | null;
};
