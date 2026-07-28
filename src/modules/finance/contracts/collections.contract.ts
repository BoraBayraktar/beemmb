export type AdminCollectionReadinessItem = {
  orderId: string;
  orderNumber: string;
  counterpartyName: string;
  paymentStatus: "PENDING" | "AUTHORIZED" | "FAILED";
  totalAmount: number;
  currency: string;
  createdAt: string;
  recordedCollectionCount: number;
  remainingAmount: number;
  detailHref: string;
  sourceHref: string;
};

export type AdminCollectionsSummary = {
  totalPendingAmount: number;
  totalRecordedAmount: number;
  pendingCount: number;
  authorizedCount: number;
  failedCount: number;
  recordedCount: number;
  currency: string;
};

export type AdminCollectionsResult = {
  items: AdminCollectionReadinessItem[];
  summary: AdminCollectionsSummary;
};

export type AdminCollectionRecordItem = {
  id: string;
  orderId: string;
  financialAccountId: string | null;
  amount: number;
  currency: string;
  status: "RECORDED" | "CANCELLED";
  collectedAt: string;
  note: string | null;
  recordedByUserId: string | null;
  createdAt: string;
};

export type AdminCreateCollectionRecordInput = {
  orderId: string;
  financialAccountId: string;
  amount: number;
  collectedAt: string;
  note?: string | null;
  recordedByUserId: string;
  onlineCollectionProvider?: string | null;
  onlineCollectionExternalId?: string | null;
};
