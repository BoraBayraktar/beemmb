export type DocumentVatDirection = "OUTPUT" | "INPUT";

export type DocumentVatProjectionRow = {
  documentId: string;
  documentNumber: string;
  documentType: "E_INVOICE" | "PURCHASE_DOCUMENT";
  issueDate: string;
  counterpartyName: string;
  currency: string;
  vatRate: number | null;
  taxExclusiveAmount: number;
  taxAmount: number;
  taxInclusiveAmount: number;
  direction: DocumentVatDirection;
};

export type DocumentVatProjectionQuery = {
  fromDate: Date;
  toDate: Date;
};

export type DocumentVatProjectionResult = {
  items: DocumentVatProjectionRow[];
};
