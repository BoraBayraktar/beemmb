import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

function adminCopy(locale: string) {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  return getDictionary(resolvedLocale).admin as Record<string, string>;
}

export function resolveFinanceLedgerEntriesCopy(locale: string) {
  const admin = adminCopy(locale);

  return {
    title: admin.financeLedgerEntriesTitle,
    description: admin.financeLedgerEntriesDescription,
    periodLabel: admin.financeLedgerEntriesPeriodLabel,
    search: admin.financeLedgerEntriesSearch,
    backfillAction: admin.financeLedgerEntriesBackfillAction,
    backfillHint: admin.financeLedgerEntriesBackfillHint,
    summaryEntryCount: admin.financeLedgerEntriesSummaryEntryCount,
    summaryTotalDebit: admin.financeLedgerEntriesSummaryTotalDebit,
    summaryTotalCredit: admin.financeLedgerEntriesSummaryTotalCredit,
    colDate: admin.financeLedgerEntriesColDate,
    colAccount: admin.financeLedgerEntriesColAccount,
    colSide: admin.financeLedgerEntriesColSide,
    colAmount: admin.financeLedgerEntriesColAmount,
    colSource: admin.financeLedgerEntriesColSource,
    colTitle: admin.financeLedgerEntriesColTitle,
    sideDebit: admin.financeLedgerEntriesSideDebit,
    sideCredit: admin.financeLedgerEntriesSideCredit,
    emptyList: admin.financeLedgerEntriesEmptyList,
    sourceCashTransaction: admin.financeLedgerEntriesSourceCashTransaction,
    sourceCollection: admin.financeLedgerEntriesSourceCollection,
    sourcePayment: admin.financeLedgerEntriesSourcePayment,
    sourceBusinessDocument: admin.financeLedgerEntriesSourceBusinessDocument,
    sourceIncomingInvoice: admin.financeLedgerEntriesSourceIncomingInvoice,
    sourceExpenseReport: admin.financeLedgerEntriesSourceExpenseReport,
  };
}

export type FinanceLedgerEntriesCopy = ReturnType<typeof resolveFinanceLedgerEntriesCopy>;
