export type BankStatementImportStatus = "DRAFT" | "READY" | "COMPLETED" | "CANCELLED";
export type BankStatementLineMatchStatus = "UNMATCHED" | "SUGGESTED" | "CONFIRMED";
export type BankReconciliationMatchStatus = "SUGGESTED" | "CONFIRMED";

export type AdminBankReconciliationHubItem = {
  id: string;
  name: string;
  currency: string;
  currentBalance: number;
  reconciliationHref: string;
};

export type AdminBankReconciliationHubResult = {
  items: AdminBankReconciliationHubItem[];
};

export type AdminBankReconciliationImportInput = {
  financialAccountId: string;
  fileName?: string;
  csvContent: string;
  autoConfirmHighConfidence?: boolean;
};

export type AdminBankReconciliationStructuredImportInput = {
  financialAccountId: string;
  fileName?: string | null;
  sourceReference?: string | null;
  lines: Array<{
    lineIndex: number;
    transactionAt: Date;
    description: string;
    amount: number;
    signedAmount: number;
    balanceAfter: number | null;
  }>;
  importedByUserId?: string | null;
  autoConfirmHighConfidence?: boolean;
};

export type AdminBankReconciliationMatchInput = {
  statementLineId: string;
  cashTransactionId: string;
};

export type AdminBankReconciliationConfirmInput = {
  statementLineId: string;
  cashTransactionId?: string;
  createCashTransactionIfMissing?: boolean;
};

export type AdminBankReconciliationSuggestion = {
  cashTransactionId: string;
  title: string;
  amount: number;
  currency: string;
  transactionAt: string;
  score: number;
};

export type AdminBankReconciliationLine = {
  id: string;
  lineIndex: number;
  transactionAt: string;
  description: string;
  amount: number;
  signedAmount: number;
  balanceAfter: number | null;
  matchStatus: BankStatementLineMatchStatus;
  suggestedMatch: AdminBankReconciliationSuggestion | null;
  matchedCashTransactionId: string | null;
  matchedCashTransactionTitle: string | null;
};

export type AdminBankReconciliationImportSummary = {
  id: string;
  financialAccountId: string;
  fileName: string | null;
  status: BankStatementImportStatus;
  periodStart: string | null;
  periodEnd: string | null;
  lineCount: number;
  unmatchedCount: number;
  suggestedCount: number;
  confirmedCount: number;
  createdAt: string;
};

export type AdminBankReconciliationWorkspace = {
  financialAccountId: string;
  financialAccountName: string;
  currency: string;
  importSummary: AdminBankReconciliationImportSummary | null;
  lines: AdminBankReconciliationLine[];
  candidateTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
    transactionAt: string;
  }>;
};

export type AdminBankReconciliationImportResult = {
  import: AdminBankReconciliationImportSummary;
  workspace: AdminBankReconciliationWorkspace;
};
