import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export type CounterpartyLedgerCopy = {
  openReceivableBalanceLabel: string;
  openPayableBalanceLabel: string;
  receivableTitlePrefix: string;
  collectionTitlePrefix: string;
  payableTitlePrefix: string;
  paymentTitlePrefix: string;
  documentTitlePrefix: string;
};

export function resolveCounterpartyLedgerCopy(locale: string): CounterpartyLedgerCopy {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  const admin = getDictionary(resolvedLocale).admin as Record<string, string>;

  return {
    openReceivableBalanceLabel: admin.financeCounterpartyLedgerOpenReceivableBalanceLabel,
    openPayableBalanceLabel: admin.financeCounterpartyLedgerOpenPayableBalanceLabel,
    receivableTitlePrefix: admin.financeCounterpartyLedgerReceivableTitlePrefix,
    collectionTitlePrefix: admin.financeCounterpartyLedgerCollectionTitlePrefix,
    payableTitlePrefix: admin.financeCounterpartyLedgerPayableTitlePrefix,
    paymentTitlePrefix: admin.financeCounterpartyLedgerPaymentTitlePrefix,
    documentTitlePrefix: admin.financeCounterpartyLedgerDocumentTitlePrefix,
  };
}
