export type AdminInventoryPayableDocumentLink = {
  documentId: string;
  documentNumber: string;
  inventoryTransactionId: string | null;
  inventoryTransactionNumber: string | null;
  inventoryTransactionType: string | null;
  inventoryTransactionStatus: string | null;
  inventoryHref: string | null;
  lineQuantityTotal: number;
};

export type AdminInventoryPayableSummary = {
  linkedDocumentCount: number;
  totalLineQuantity: number;
  documents: AdminInventoryPayableDocumentLink[];
};
