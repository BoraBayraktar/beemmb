export type OnlineCollectionWebhookPayload = {
  orderId: string;
  financialAccountId: string;
  amount: number;
  collectedAt: string;
  externalPaymentId: string;
  note?: string | null;
  currency?: string | null;
};

export type OnlineCollectionWebhookProcessResult = {
  collectionRecordId: string;
  orderId: string;
  duplicate: boolean;
  amount: number;
  currency: string;
};
