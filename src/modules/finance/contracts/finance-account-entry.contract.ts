export type FinanceAccountEntrySide = "DEBIT" | "CREDIT";
export type FinanceAccountEntrySourceType = "CASH_TRANSACTION" | "COLLECTION" | "PAYMENT" | "BUSINESS_DOCUMENT" | "INCOMING_INVOICE" | "EXPENSE_REPORT";

export type AdminFinanceLedgerEntryListItem = {
  id: string;
  lineKey: string;
  entryAt: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  side: FinanceAccountEntrySide;
  amount: number;
  currency: string;
  sourceType: FinanceAccountEntrySourceType;
  sourceId: string;
  sourceReference: string | null;
  title: string;
  note: string | null;
  counterpartyName: string | null;
};

export type AdminFinanceLedgerEntriesQuery = {
  from?: string;
  to?: string;
  search?: string;
  sourceType?: "all" | FinanceAccountEntrySourceType;
};

export type AdminFinanceLedgerEntriesResult = {
  items: AdminFinanceLedgerEntryListItem[];
  summary: {
    entryCount: number;
    totalDebit: number;
    totalCredit: number;
    currency: string;
  };
};

export type AdminFinanceLedgerBackfillResult = {
  scanned: number;
  projected: number;
  skipped: number;
};
