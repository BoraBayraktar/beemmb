import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export type FinanceOverviewCopy = {
  metricOpenReceivableLabel: string;
  metricOpenReceivableHintSuffix: string;
  metricSupplierPayableLabel: string;
  metricSupplierPayableHintSuffix: string;
  metricPendingCollectionLabel: string;
  metricPendingCollectionHint: string;
  metricDraftPayableDocLabel: string;
  metricDraftPayableDocHint: string;
  metricBankBalanceLabel: string;
  metricBankBalanceHintSuffix: string;
  sectionReceivablesTitle: string;
  sectionReceivablesDescription: string;
  sectionPayablesTitle: string;
  sectionPayablesDescription: string;
  sectionBankCashTitle: string;
  sectionBankCashDescription: string;
  sectionTransactionsTitle: string;
  sectionTransactionsDescription: string;
  sectionReportsTitle: string;
  sectionReportsDescription: string;
  sectionTrialBalanceTitle: string;
  sectionTrialBalanceDescription: string;
  sectionLedgerTitle: string;
  sectionLedgerDescription: string;
  sectionInstrumentsTitle: string;
  sectionInstrumentsDescription: string;
  sectionExportsTitle: string;
  sectionExportsDescription: string;
  sectionBankReconciliationTitle: string;
  sectionBankReconciliationDescription: string;
};

export function resolveFinanceOverviewCopy(locale: string): FinanceOverviewCopy {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  const admin = getDictionary(resolvedLocale).admin as Record<string, string>;

  return {
    metricOpenReceivableLabel: admin.financeOverviewMetricOpenReceivableLabel,
    metricOpenReceivableHintSuffix: admin.financeOverviewMetricOpenReceivableHintSuffix,
    metricSupplierPayableLabel: admin.financeOverviewMetricSupplierPayableLabel,
    metricSupplierPayableHintSuffix: admin.financeOverviewMetricSupplierPayableHintSuffix,
    metricPendingCollectionLabel: admin.financeOverviewMetricPendingCollectionLabel,
    metricPendingCollectionHint: admin.financeOverviewMetricPendingCollectionHint,
    metricDraftPayableDocLabel: admin.financeOverviewMetricDraftPayableDocLabel,
    metricDraftPayableDocHint: admin.financeOverviewMetricDraftPayableDocHint,
    metricBankBalanceLabel: admin.financeOverviewMetricBankBalanceLabel,
    metricBankBalanceHintSuffix: admin.financeOverviewMetricBankBalanceHintSuffix,
    sectionReceivablesTitle: admin.financeOverviewSectionReceivablesTitle,
    sectionReceivablesDescription: admin.financeOverviewSectionReceivablesDescription,
    sectionPayablesTitle: admin.financeOverviewSectionPayablesTitle,
    sectionPayablesDescription: admin.financeOverviewSectionPayablesDescription,
    sectionBankCashTitle: admin.financeOverviewSectionBankCashTitle,
    sectionBankCashDescription: admin.financeOverviewSectionBankCashDescription,
    sectionTransactionsTitle: admin.financeOverviewSectionTransactionsTitle,
    sectionTransactionsDescription: admin.financeOverviewSectionTransactionsDescription,
    sectionReportsTitle: admin.financeOverviewSectionReportsTitle,
    sectionReportsDescription: admin.financeOverviewSectionReportsDescription,
    sectionTrialBalanceTitle: admin.financeOverviewSectionTrialBalanceTitle,
    sectionTrialBalanceDescription: admin.financeOverviewSectionTrialBalanceDescription,
    sectionLedgerTitle: admin.financeOverviewSectionLedgerTitle,
    sectionLedgerDescription: admin.financeOverviewSectionLedgerDescription,
    sectionInstrumentsTitle: admin.financeOverviewSectionInstrumentsTitle,
    sectionInstrumentsDescription: admin.financeOverviewSectionInstrumentsDescription,
    sectionExportsTitle: admin.financeOverviewSectionExportsTitle,
    sectionExportsDescription: admin.financeOverviewSectionExportsDescription,
    sectionBankReconciliationTitle: admin.financeOverviewSectionBankReconciliationTitle,
    sectionBankReconciliationDescription: admin.financeOverviewSectionBankReconciliationDescription,
  };
}
