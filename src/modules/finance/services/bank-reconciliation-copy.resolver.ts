import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

function adminCopy(locale: string) {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  return getDictionary(resolvedLocale).admin as Record<string, string>;
}

export function resolveBankReconciliationCopy(locale: string) {
  const admin = adminCopy(locale);

  return {
    title: admin.financeBankReconciliationTitle,
    description: admin.financeBankReconciliationDescription,
    backToAccount: admin.financeBankReconciliationBackToAccount,
    uploadTitle: admin.financeBankReconciliationUploadTitle,
    uploadHint: admin.financeBankReconciliationUploadHint,
    uploadButton: admin.financeBankReconciliationUploadButton,
    summaryLineCount: admin.financeBankReconciliationSummaryLineCount,
    summaryUnmatched: admin.financeBankReconciliationSummaryUnmatched,
    summarySuggested: admin.financeBankReconciliationSummarySuggested,
    summaryConfirmed: admin.financeBankReconciliationSummaryConfirmed,
    emptyImport: admin.financeBankReconciliationEmptyImport,
    colDate: admin.financeBankReconciliationColDate,
    colDescription: admin.financeBankReconciliationColDescription,
    colAmount: admin.financeBankReconciliationColAmount,
    colStatus: admin.financeBankReconciliationColStatus,
    colMatch: admin.financeBankReconciliationColMatch,
    statusUnmatched: admin.financeBankReconciliationStatusUnmatched,
    statusSuggested: admin.financeBankReconciliationStatusSuggested,
    statusConfirmed: admin.financeBankReconciliationStatusConfirmed,
    matchPlaceholder: admin.financeBankReconciliationMatchPlaceholder,
    confirmButton: admin.financeBankReconciliationConfirmButton,
    confirmCreateHint: admin.financeBankReconciliationConfirmCreateHint,
    applyMatchButton: admin.financeBankReconciliationApplyMatchButton,
    openReconciliation: admin.financeBankReconciliationOpenReconciliation,
    autoConfirmLabel: admin.financeBankReconciliationAutoConfirmLabel,
    hubTitle: admin.financeBankReconciliationHubTitle,
    hubDescription: admin.financeBankReconciliationHubDescription,
    hubEmpty: admin.financeBankReconciliationHubEmpty,
    hubEmptyHint: admin.financeBankReconciliationHubEmptyHint,
    hubColAccount: admin.financeBankReconciliationHubColAccount,
    hubColBalance: admin.financeBankReconciliationHubColBalance,
    hubOpenAccount: admin.financeBankReconciliationHubOpenAccount,
    hubBackToBankCash: admin.financeBankReconciliationHubBackToBankCash,
  };
}

export type BankReconciliationCopy = ReturnType<typeof resolveBankReconciliationCopy>;
