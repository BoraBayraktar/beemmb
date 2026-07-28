export type AdminCounterpartyFinanceTerms = {
  defaultPaymentTermDays: number | null;
  effectivePaymentTermDays: number;
  creditLimit: number | null;
  defaultPaymentTermSummary: string;
  creditLimitSummary: string | null;
  collectionOrPaymentDueHint: string;
};
