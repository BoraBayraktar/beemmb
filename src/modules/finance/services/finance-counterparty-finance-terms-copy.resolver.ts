import { getDictionary, type Locale } from "@/lib/i18n";

export type CounterpartyFinanceTermsCopy = {
  defaultPaymentTermSummary: string;
  creditLimitSummary: string;
  collectionDueHint: string;
  paymentDueHint: string;
};

export function resolveCounterpartyFinanceTermsCopy(locale: string): CounterpartyFinanceTermsCopy {
  const admin = getDictionary(locale as Locale).admin;

  return {
    defaultPaymentTermSummary: admin.financeCounterpartyDefaultPaymentTermSummary,
    creditLimitSummary: admin.financeCounterpartyCreditLimitSummary,
    collectionDueHint: admin.financeCollectionDefaultDueHint,
    paymentDueHint: admin.financePaymentDefaultDueHint,
  };
}
