import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export type DocumentFinancePreviewCopy = {
  fallbackOrder: string;
  fallbackLine: string;
  fallbackDocument: string;
  allocationTitlePrefix: string;
  receivableTitle: string;
  collectionTitle: string;
  paymentTitle: string;
};

export function resolveDocumentFinancePreviewCopy(locale: string): DocumentFinancePreviewCopy {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  const admin = getDictionary(resolvedLocale).admin as Record<string, string>;

  return {
    fallbackOrder: admin.financeDocumentPreviewFallbackOrder,
    fallbackLine: admin.financeDocumentPreviewFallbackLine,
    fallbackDocument: admin.financeDocumentPreviewFallbackDocument,
    allocationTitlePrefix: admin.financeDocumentPreviewAllocationTitlePrefix,
    receivableTitle: admin.financeDocumentPreviewReceivableTitle,
    collectionTitle: admin.financeDocumentPreviewCollectionTitle,
    paymentTitle: admin.financeDocumentPreviewPaymentTitle,
  };
}
