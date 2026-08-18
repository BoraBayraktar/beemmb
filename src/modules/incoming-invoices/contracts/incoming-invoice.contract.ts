export type AdminIncomingInvoiceSource = "MANUAL" | "XML_IMPORT" | "INTEGRATOR";
export type AdminIncomingInvoiceStatus = "DRAFT" | "REVIEWED" | "POSTED" | "CANCELLED";
export type AdminIncomingInvoiceXmlValidationStatus = "NOT_VALIDATED" | "VALID" | "INVALID";

export type AdminIncomingInvoiceLineItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number | null;
  note: string | null;
};

export type AdminIncomingInvoiceLineInput = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number | null;
  vatRate?: number | null;
  note?: string | null;
};

export type AdminIncomingInvoiceLifecycleEventItem = {
  id: string;
  eventType: string;
  actorType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
};

export type AdminIncomingInvoiceListItem = {
  id: string;
  documentNumber: string;
  source: AdminIncomingInvoiceSource;
  status: AdminIncomingInvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  totalAmount: number | null;
  counterpartyName: string;
  counterpartyTaxNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  hasXmlArtifact: boolean;
  lineCount: number;
  postedFinanceEntryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminIncomingInvoiceDetail = AdminIncomingInvoiceListItem & {
  counterpartyTaxOffice: string | null;
  counterpartyEmail: string | null;
  counterpartyAddress: string | null;
  note: string | null;
  externalReference: string | null;
  providerConfigId: string | null;
  providerDisplayName: string | null;
  lines: AdminIncomingInvoiceLineItem[];
  lifecycleEvents: AdminIncomingInvoiceLifecycleEventItem[];
  xmlArtifact: {
    id: string;
    validationStatus: AdminIncomingInvoiceXmlValidationStatus;
    validationErrors: unknown;
    createdAt: string;
  } | null;
};

export type AdminIncomingInvoiceListQuery = {
  search?: string;
  source?: "all" | AdminIncomingInvoiceSource;
  status?: "all" | AdminIncomingInvoiceStatus;
  page?: number;
  pageSize?: number;
};

export type AdminIncomingInvoiceListResult = {
  items: AdminIncomingInvoiceListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateManualIncomingInvoiceInput = {
  documentNumber: string;
  issueDate: string;
  dueDate?: string | null;
  currency?: string;
  supplierId?: string | null;
  counterpartyName: string;
  counterpartyTaxNumber?: string | null;
  counterpartyTaxOffice?: string | null;
  counterpartyEmail?: string | null;
  counterpartyAddress?: string | null;
  note?: string | null;
  lines: AdminIncomingInvoiceLineInput[];
};

export type AdminImportIncomingInvoiceXmlInput = {
  xmlContent: string;
  supplierId?: string | null;
  note?: string | null;
};

export type AdminUpdateIncomingInvoiceInput = {
  id: string;
  note?: string | null;
};

export type AdminIncomingInvoiceProviderConfigItem = {
  id: string;
  providerCode: string;
  displayName: string;
  endpointUrl: string | null;
  username: string | null;
  secretKeyMasked: string | null;
  webhookSecretMasked: string | null;
  isActive: boolean;
  isDefault: boolean;
  adapterRegistered: boolean;
  adapterConfigured: boolean;
  lastSyncedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUpsertIncomingInvoiceProviderConfigInput = {
  id?: string;
  providerCode: string;
  displayName: string;
  endpointUrl?: string | null;
  username?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  note?: string | null;
};
