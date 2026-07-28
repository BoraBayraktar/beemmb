import type { AdminCounterpartyFinanceTerms } from "@/modules/finance/contracts/counterparty-finance-terms.contract";

export type AdminCounterpartyLedgerMovementKind =
  | "RECEIVABLE"
  | "PAYABLE"
  | "COLLECTION"
  | "PAYMENT"
  | "CASH_IN"
  | "CASH_OUT"
  | "DOCUMENT";

export type AdminCounterpartyLedgerMovement = {
  id: string;
  kind: AdminCounterpartyLedgerMovementKind;
  title: string;
  occurredAt: string;
  amount: number;
  signedAmount: number;
  runningBalance: number;
  currency: string;
  statusLabel: string | null;
  sourceHref: string | null;
  financeHref: string | null;
};

export type AdminCounterpartyLedgerSummary = {
  counterpartyName: string;
  slug: string;
  openBalanceLabel: string;
  openBalanceAmount: number;
  currency: string;
  movementCount: number;
  collectionOrPaymentCount: number;
  documentCount: number;
  lastMovementAt: string | null;
  financeTerms: AdminCounterpartyFinanceTerms;
};

export type AdminCounterpartyLedgerResult = {
  summary: AdminCounterpartyLedgerSummary;
  items: AdminCounterpartyLedgerMovement[];
};
