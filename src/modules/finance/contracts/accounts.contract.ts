export type AdminFinanceAccountEntryType = "RECEIVABLE" | "PAYABLE" | "CASH_IN" | "CASH_OUT";

export type AdminFinanceAccountEntry = {
  id: string;
  type: AdminFinanceAccountEntryType;
  counterpartyName: string;
  counterpartyLedgerHref: string | null;
  sourceNumber: string;
  sourceDate: string;
  statusLabel: string;
  totalAmount: number;
  currency: string;
  detailHref: string;
  sourceHref: string;
  financeMovementPreviewHref: string | null;
};

export type AdminFinanceAccountsQuery = {
  search?: string;
  type?: "all" | "RECEIVABLE" | "PAYABLE" | "CASH";
};

export type AdminFinanceAccountsResult = {
  items: AdminFinanceAccountEntry[];
  summary: {
    receivableCount: number;
    payableCount: number;
    cashMovementCount: number;
    totalReceivableAmount: number;
    totalPayableAmount: number;
    totalCashInAmount: number;
    totalCashOutAmount: number;
    currency: string;
  };
};
