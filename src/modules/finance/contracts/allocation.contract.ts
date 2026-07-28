export type AdminFinanceAllocationTargetType = "ORDER" | "BUSINESS_DOCUMENT" | "BUSINESS_DOCUMENT_LINE";

export type AdminFinanceAllocationLinkItem = {
  id: string;
  targetType: AdminFinanceAllocationTargetType;
  orderId: string | null;
  businessDocumentId: string | null;
  businessDocumentLineId: string | null;
  targetLabel: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export type AdminFinanceAllocationSummary = {
  allocatedAmount: number;
  expectedAmount: number;
  currency: string;
  items: AdminFinanceAllocationLinkItem[];
};

export type AdminFinanceAllocationLineOption = {
  lineId: string;
  documentId: string;
  documentNumber: string;
  label: string;
  openAmount: number;
  currency: string;
};

export type AdminFinanceManualAllocationItemInput = {
  businessDocumentLineId: string;
  amount: number;
};

export type AdminReplaceCollectionAllocationsInput = {
  collectionRecordId: string;
  items: AdminFinanceManualAllocationItemInput[];
};

export type AdminReplacePaymentAllocationsInput = {
  paymentRecordId: string;
  items: AdminFinanceManualAllocationItemInput[];
};

export type AdminFinanceRecordAllocationContext = {
  recordId: string;
  recordLabel: string;
  amount: number;
  currency: string;
  summary: AdminFinanceAllocationSummary;
  lineOptions: AdminFinanceAllocationLineOption[];
};
