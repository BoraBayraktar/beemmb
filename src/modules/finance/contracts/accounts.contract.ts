export type AdminFinanceAccountEntryType = "RECEIVABLE" | "PAYABLE";

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
  type?: "all" | AdminFinanceAccountEntryType;
};

export type AdminFinanceAccountsResult = {
  items: AdminFinanceAccountEntry[];
  summary: {
    receivableCount: number;
    payableCount: number;
    totalReceivableAmount: number;
    totalPayableAmount: number;
    currency: string;
  };
};
