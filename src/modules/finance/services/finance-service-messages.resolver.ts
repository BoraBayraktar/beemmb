import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { resolveDocumentFinancePreviewCopy } from "@/modules/finance/services/document-finance-preview-copy.resolver";

export type FinanceAllocationLabels = {
  fallbackRecord: string;
  fallbackOrder: string;
  fallbackLine: string;
  fallbackDocument: string;
};

export type FinanceServiceMessages = {
  receivables: {
    unlinkedCustomer: string;
  };
  allocation: FinanceAllocationLabels;
  errors: {
    collectionRecordNotFound: string;
    collectionAllocationAmountMismatch: string;
    collectionLineOrderMismatch: string;
    collectionLineOpenAmountInsufficient: string;
    paymentRecordNotFound: string;
    paymentAllocationAmountMismatch: string;
    paymentLineSupplierMismatch: string;
    paymentLineOpenAmountInsufficient: string;
    selectRegisteredCustomer: string;
    selectValidCustomer: string;
    selectRegisteredSupplier: string;
    selectValidSupplier: string;
    selectValidFinancialAccount: string;
    transferTargetAccountRequired: string;
    transferSameAccount: string;
    transferInvalidTargetAccount: string;
    transferCurrencyMismatch: string;
    collectionOrderNotFound: string;
    collectionAmountExceedsReceivable: string;
    collectionInvalidFinancialAccount: string;
    paymentSupplierNotFound: string;
    paymentPayableNotFound: string;
    paymentAmountExceedsDebt: string;
    paymentInvalidFinancialAccount: string;
  };
};

function resolveLocale(locale?: string): Locale {
  return isLocale(locale ?? "tr") ? (locale as Locale) : "tr";
}

export function resolveFinanceServiceMessages(locale?: string): FinanceServiceMessages {
  const resolvedLocale = resolveLocale(locale);
  const admin = getDictionary(resolvedLocale).admin as Record<string, string>;
  const preview = resolveDocumentFinancePreviewCopy(resolvedLocale);

  return {
    receivables: {
      unlinkedCustomer: admin.financeReceivablesUnlinkedCustomer,
    },
    allocation: {
      fallbackRecord: admin.financeAllocationFallbackRecord,
      fallbackOrder: preview.fallbackOrder,
      fallbackLine: preview.fallbackLine,
      fallbackDocument: preview.fallbackDocument,
    },
    errors: {
      collectionRecordNotFound: admin.financeErrorCollectionRecordNotFound,
      collectionAllocationAmountMismatch: admin.financeErrorCollectionAllocationAmountMismatch,
      collectionLineOrderMismatch: admin.financeErrorCollectionLineOrderMismatch,
      collectionLineOpenAmountInsufficient: admin.financeErrorCollectionLineOpenAmountInsufficient,
      paymentRecordNotFound: admin.financeErrorPaymentRecordNotFound,
      paymentAllocationAmountMismatch: admin.financeErrorPaymentAllocationAmountMismatch,
      paymentLineSupplierMismatch: admin.financeErrorPaymentLineSupplierMismatch,
      paymentLineOpenAmountInsufficient: admin.financeErrorPaymentLineOpenAmountInsufficient,
      selectRegisteredCustomer: admin.financeErrorSelectRegisteredCustomer,
      selectValidCustomer: admin.financeErrorSelectValidCustomer,
      selectRegisteredSupplier: admin.financeErrorSelectRegisteredSupplier,
      selectValidSupplier: admin.financeErrorSelectValidSupplier,
      selectValidFinancialAccount: admin.financeErrorSelectValidFinancialAccount,
      transferTargetAccountRequired: admin.financeErrorTransferTargetAccountRequired,
      transferSameAccount: admin.financeErrorTransferSameAccount,
      transferInvalidTargetAccount: admin.financeErrorTransferInvalidTargetAccount,
      transferCurrencyMismatch: admin.financeErrorTransferCurrencyMismatch,
      collectionOrderNotFound: admin.financeErrorCollectionOrderNotFound,
      collectionAmountExceedsReceivable: admin.financeErrorCollectionAmountExceedsReceivable,
      collectionInvalidFinancialAccount: admin.financeErrorCollectionInvalidFinancialAccount,
      paymentSupplierNotFound: admin.financeErrorPaymentSupplierNotFound,
      paymentPayableNotFound: admin.financeErrorPaymentPayableNotFound,
      paymentAmountExceedsDebt: admin.financeErrorPaymentAmountExceedsDebt,
      paymentInvalidFinancialAccount: admin.financeErrorPaymentInvalidFinancialAccount,
    },
  };
}
