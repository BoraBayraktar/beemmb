export const AUDIT_LOG_ENTITY_TYPES = [
  "USER",
  "PRODUCT",
  "BRAND",
  "CARRIER_COMPANY",
  "SUPPLIER",
  "PRODUCT_ATTRIBUTE",
  "CUSTOMER_ACCOUNT",
  "CARI",
  "CATEGORY",
  "ORDER",
  "BUSINESS_DOCUMENT",
  "INCOMING_INVOICE",
  "FINANCE_COLLECTION",
  "FINANCE_PAYMENT",
  "WAREHOUSE",
  "INVENTORY",
  "STOCK_COUNT",
  "INTEGRATION",
  "MARKETPLACE_ACCOUNT",
  "MARKETPLACE_PACKAGE",
  "STOREFRONT_ITEM",
  "AUTH",
  "TENANT",
] as const;

export const AUDIT_LOG_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_UPDATE",
  "IMPORT",
  "EXPORT",
  "SYNC",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET_COMPLETE",
  "PERMISSION_CHANGE",
  "AUDIT_EXPORT",
] as const;

export type AuditLogEntityType = (typeof AUDIT_LOG_ENTITY_TYPES)[number];

export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[number];

export type AuditLogItem = {
  id: string;
  entityType: AuditLogEntityType;
  entityId: string | null;
  entityLabel: string;
  action: AuditLogAction;
  actorUserId: string | null;
  actorType: string;
  actorLabel: string | null;
  tenantId: string | null;
  module: string | null;
  route: string | null;
  operation: string | null;
  requestId: string | null;
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  payloadHash: string | null;
  previousHash: string | null;
  chainHash: string | null;
  hashAlgorithm: string;
  occurredAt: string;
  serverReceivedAt: string;
  createdAt: string;
};

export type AuditLogListQuery = {
  search?: string;
  entityType?: AuditLogEntityType;
  action?: AuditLogAction;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogListResult = {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateAuditLogInput = {
  entityType: AuditLogEntityType;
  entityId?: string | null;
  action: AuditLogAction;
  actorUserId?: string | null;
  actorType?: "USER" | "SYSTEM" | "INTEGRATION";
  tenantId?: string | null;
  module?: string | null;
  route?: string | null;
  operation?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date | string | null;
};
