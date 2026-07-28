export type AdminBusinessDocumentType = "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";
export type AdminBusinessDocumentStatus = "DRAFT" | "LINKED" | "ISSUED" | "CANCELLED";
export type AdminBusinessDocumentSyncStatus = "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";

export type AdminBusinessDocumentLineItem = {
  id: string;
  productId: string | null;
  productVariantId: string | null;
  productSku: string;
  productVariantSku: string | null;
  productName: string;
  productVariantTitle: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  currency: string;
  note: string | null;
};

export type AdminBusinessDocumentDispatchItem = {
  id: string;
  integrationJobId: string | null;
  channel: "TRENDYOL" | "N11" | "EDOCS_MOCK";
  providerKey: string;
  status: AdminBusinessDocumentSyncStatus;
  externalReference: string | null;
  errorMessage: string | null;
  queuedAt: string;
  dispatchedAt: string | null;
  createdAt: string;
};

export type AdminBusinessDocumentLifecycleMessageItem = {
  id: string;
  direction: string;
  channel: string | null;
  providerCode: string | null;
  messageType: string;
  payloadHash: string;
  statusCode: number | null;
  errorMessage: string | null;
  occurredAt: string;
};

export type AdminBusinessDocumentLifecycleEventItem = {
  id: string;
  eventType: string;
  status: string | null;
  externalStatus: string | null;
  providerCode: string | null;
  integrationJobId: string | null;
  actorType: string;
  requestId: string | null;
  correlationId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  messages: AdminBusinessDocumentLifecycleMessageItem[];
};

export type AdminDocumentProviderConfigItem = {
  id: string;
  providerCode: string;
  channel: "EDOCS_MOCK";
  displayName: string;
  endpointUrl: string | null;
  senderLabel: string | null;
  senderVkn: string | null;
  username: string | null;
  secretKeyMasked: string | null;
  companyName: string | null;
  webhookSecretMasked: string | null;
  supportsStatusSync: boolean;
  isActive: boolean;
  isDefault: boolean;
  adapterRegistered: boolean;
  adapterConfigured: boolean;
  adapterOperational: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBusinessDocumentListItem = {
  id: string;
  documentNumber: string;
  documentType: AdminBusinessDocumentType;
  status: AdminBusinessDocumentStatus;
  issueDate: string;
  dueDate: string | null;
  effectiveDueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  currency: string;
  totalAmount: number | null;
  externalReference: string | null;
  externalSystemStatus: AdminBusinessDocumentSyncStatus;
  providerConfigId: string | null;
  providerDisplayName: string | null;
  supplierId: string | null;
  customerAccountId: string | null;
  counterpartyName: string;
  orderId: string | null;
  orderNumber: string | null;
  inventoryTransactionId: string | null;
  inventoryTransactionNumber: string | null;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminBusinessDocumentDetail = AdminBusinessDocumentListItem & {
  counterpartyTaxNumber: string | null;
  counterpartyTaxOffice: string | null;
  counterpartyEmail: string | null;
  counterpartyAddress: string | null;
  note: string | null;
  providerConfigId: string | null;
  providerDisplayName: string | null;
  lines: AdminBusinessDocumentLineItem[];
  dispatches: AdminBusinessDocumentDispatchItem[];
  lifecycleEvents: AdminBusinessDocumentLifecycleEventItem[];
};

export type AdminBusinessDocumentListQuery = {
  search?: string;
  documentType?: "all" | AdminBusinessDocumentType;
  status?: "all" | AdminBusinessDocumentStatus;
  page?: number;
  pageSize?: number;
};

export type AdminBusinessDocumentListResult = {
  items: AdminBusinessDocumentListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminPendingInvoiceDeliveryNoteListItem = AdminBusinessDocumentListItem & {
  sourceLabel: string;
};

export type AdminPendingInvoiceDeliveryNoteListResult = {
  items: AdminPendingInvoiceDeliveryNoteListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminOperationalPayableDocument = AdminBusinessDocumentListItem;

export type AdminCreateBusinessDocumentInput = {
  documentNumber: string;
  documentType: AdminBusinessDocumentType;
  status?: AdminBusinessDocumentStatus;
  issueDate: string;
  dueDate?: string | null;
  currency?: string;
  totalAmount?: number | null;
  externalReference?: string | null;
  externalSystemStatus?: AdminBusinessDocumentSyncStatus;
  supplierId?: string | null;
  customerAccountId?: string | null;
  counterpartyTaxNumber?: string | null;
  counterpartyTaxOffice?: string | null;
  counterpartyEmail?: string | null;
  counterpartyAddress?: string | null;
  note?: string | null;
  orderNumber?: string | null;
  inventoryTransactionNumber?: string | null;
};

export type AdminUpdateBusinessDocumentInput = {
  id: string;
  status?: AdminBusinessDocumentStatus;
  externalSystemStatus?: AdminBusinessDocumentSyncStatus;
  externalReference?: string | null;
  note?: string | null;
};

export type AdminQueueBusinessDocumentDispatchInput = {
  id: string;
  channel?: "EDOCS_MOCK";
  providerConfigId?: string;
  forceFail?: boolean;
};

export type AdminQueueBusinessDocumentStatusSyncInput = {
  id: string;
  providerConfigId?: string;
  forceFail?: boolean;
};

export type AdminUpsertDocumentProviderConfigInput = {
  id?: string;
  providerCode: string;
  channel?: "EDOCS_MOCK";
  displayName: string;
  endpointUrl?: string | null;
  senderLabel?: string | null;
  senderVkn?: string | null;
  username?: string | null;
  secretKey?: string | null;
  companyName?: string | null;
  webhookSecret?: string | null;
  supportsStatusSync?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  note?: string | null;
};

export type DocumentProviderResolvedConfig = {
  id: string;
  providerCode: string;
  channel: "EDOCS_MOCK";
  displayName: string;
  endpointUrl: string | null;
  senderLabel: string | null;
  senderVkn: string | null;
  username: string | null;
  secretKey: string | null;
  companyName: string | null;
  webhookSecret: string | null;
  supportsStatusSync: boolean;
  isActive: boolean;
  isDefault: boolean;
  note: string | null;
};

export type DocumentWebhookPayload = {
  documentNumber?: string | null;
  externalReference?: string | null;
  status?: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED" | null;
  providerCode?: string | null;
  providerStatus?: string | null;
  providerOutcome?: "ACCEPTED" | "REJECTED" | "CANCELLED" | "RETURNED" | "UNKNOWN" | null;
  providerErrorCode?: string | null;
  providerErrorMessage?: string | null;
  providerPayload?: Record<string, unknown> | null;
};
