import type { FinanceAccountEntrySourceType } from "@/modules/finance/contracts/finance-account-entry.contract";
import type { AdminFinanceLedgerAccountCategory } from "@/modules/finance/contracts/finance-ledger-account.contract";

export type AdminGeneralLedgerLine = {
  id: string;
  entryAt: string;
  sourceType: FinanceAccountEntrySourceType;
  sourceReference: string | null;
  title: string;
  debit: number;
  credit: number;
};

export type AdminGeneralLedgerAccount = {
  ledgerAccountId: string;
  code: string;
  name: string;
  category: AdminFinanceLedgerAccountCategory;
  openingDebit: number;
  openingCredit: number;
  lines: AdminGeneralLedgerLine[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
};

export type AdminGeneralLedgerReport = {
  accounts: AdminGeneralLedgerAccount[];
  currency: string;
};
