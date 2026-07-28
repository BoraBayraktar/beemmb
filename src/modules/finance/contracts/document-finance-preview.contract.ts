export type AdminDocumentFinancePreviewItemKind =
  | "ALLOCATION"
  | "COLLECTION"
  | "PAYMENT"
  | "CASH_MOVEMENT"
  | "FINANCE_ROUTE";

export type AdminDocumentFinancePreviewItem = {
  id: string;
  kind: AdminDocumentFinancePreviewItemKind;
  title: string;
  amount: number;
  currency: string;
  occurredAt: string;
  financeHref: string | null;
};

export type AdminDocumentFinancePreview = {
  documentId: string;
  documentNumber: string;
  documentAmount: number;
  currency: string;
  allocatedAmount: number;
  items: AdminDocumentFinancePreviewItem[];
};
