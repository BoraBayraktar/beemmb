import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

function adminCopy(locale: string) {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  return getDictionary(resolvedLocale).admin as Record<string, string>;
}

export function resolveFinanceAdvisorExportCopy(locale: string) {
  const admin = adminCopy(locale);

  return {
    title: admin.financeAdvisorExportTitle,
    description: admin.financeAdvisorExportDescription,
    periodLabel: admin.financeAdvisorExportPeriodLabel,
    generatedAt: admin.financeAdvisorExportGeneratedAt,
    includedFiles: admin.financeAdvisorExportIncludedFiles,
    downloadXml: admin.financeAdvisorExportDownloadXml,
    downloadJson: admin.financeAdvisorExportDownloadJson,
    readOnlyHint: admin.financeAdvisorExportReadOnlyHint,
    fileCounterpartySummary: admin.financeAdvisorExportFileCounterpartySummary,
    fileVatSummary: admin.financeAdvisorExportFileVatSummary,
    fileBankCash: admin.financeAdvisorExportFileBankCash,
    fileAging: admin.financeAdvisorExportFileAging,
    fileLogoLucaJournal: admin.financeAdvisorExportFileLogoLucaJournal,
    logoLucaColDate: admin.financeAdvisorExportLogoLucaColDate,
    logoLucaColVoucherNo: admin.financeAdvisorExportLogoLucaColVoucherNo,
    logoLucaColAccountCode: admin.financeAdvisorExportLogoLucaColAccountCode,
    logoLucaColDebit: admin.financeAdvisorExportLogoLucaColDebit,
    logoLucaColCredit: admin.financeAdvisorExportLogoLucaColCredit,
    logoLucaColDescription: admin.financeAdvisorExportLogoLucaColDescription,
    logoLucaColDocumentNo: admin.financeAdvisorExportLogoLucaColDocumentNo,
    colCounterpartyType: admin.financeAdvisorExportColCounterpartyType,
    colCounterpartyName: admin.financeAdvisorExportColCounterpartyName,
    colCounterpartyKey: admin.financeAdvisorExportColCounterpartyKey,
    colOpenAmount: admin.financeAdvisorExportColOpenAmount,
    colCurrency: admin.financeAdvisorExportColCurrency,
    counterpartyTypeCustomer: admin.financeAdvisorExportCounterpartyTypeCustomer,
    counterpartyTypeSupplier: admin.financeAdvisorExportCounterpartyTypeSupplier,
  };
}

export type FinanceAdvisorExportCopy = ReturnType<typeof resolveFinanceAdvisorExportCopy>;
