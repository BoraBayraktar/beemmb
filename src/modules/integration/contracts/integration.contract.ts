export type IntegrationChannel = "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK" | "BANK_SANDBOX";
export type MarketplaceIntegrationChannel = Exclude<IntegrationChannel, "BANK_SANDBOX">;
export type IntegrationJobType =
  | "PRODUCT_SYNC"
  | "PRICE_SYNC"
  | "STOCK_SYNC"
  | "ORDER_IMPORT"
  | "ORDER_STATUS_SYNC"
  | "DOCUMENT_OUTBOUND"
  | "DOCUMENT_STATUS_SYNC"
  | "BANK_STATEMENT_SYNC";
export type IntegrationEntityType =
  | "PRODUCT"
  | "MARKETPLACE_ACCOUNT"
  | "MARKETPLACE_PACKAGE"
  | "ORDER"
  | "BUSINESS_DOCUMENT"
  | "FINANCIAL_ACCOUNT";
export type IntegrationJobStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";

export type AdminIntegrationListQuery = {
  channel?: IntegrationChannel;
  jobType?: IntegrationJobType;
  status?: IntegrationJobStatus;
  page?: number;
  pageSize?: number;
};

export type AdminIntegrationJobItem = {
  id: string;
  idempotencyKey: string;
  channel: IntegrationChannel;
  jobType: IntegrationJobType;
  entityType: IntegrationEntityType;
  entityId: string;
  status: IntegrationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  processedAt: string | null;
  externalReference: string | null;
  payload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  lastError: string | null;
  createdAt: string;
};

export type AdminIntegrationJobListResult = {
  items: AdminIntegrationJobItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DispatchIntegrationJobsInput = {
  channel: IntegrationChannel;
  jobType: IntegrationJobType;
  entityType: IntegrationEntityType;
  entityIds: string[];
  maxAttempts?: number;
  payload?: Record<string, unknown>;
  idempotencySuffix?: string;
};

export type DispatchIntegrationJobsResult = {
  accepted: number;
  deduplicated: number;
  jobs: AdminIntegrationJobItem[];
};

export type ProcessIntegrationQueueInput = {
  limit?: number;
};

export type ProcessIntegrationQueueResult = {
  processed: number;
  success: number;
  failed: number;
  deadLetter: number;
};

export type IntegrationDeadLetterItem = {
  id: string;
  jobId: string;
  channel: IntegrationChannel;
  jobType: IntegrationJobType;
  entityType: IntegrationEntityType;
  entityId: string;
  lastError: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  resolved: boolean;
};

export type IntegrationDeadLetterListResult = {
  items: IntegrationDeadLetterItem[];
};

export type RetryDeadLetterInput = {
  jobId: string;
  resolvedByUserId: string;
};

export type StockSyncDashboardResult = {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  deadLetterCount: number;
  successCount: number;
  channelCounts: {
    trendyol: number;
    n11: number;
    pazarama: number;
    hepsiburada: number;
  };
  recentJobs: AdminIntegrationJobItem[];
};

export type MarketplaceCapabilitySet = {
  supportsOrderImport: boolean;
  supportsProductSync: boolean;
  supportsPriceSync: boolean;
  supportsStockSync: boolean;
  supportsStatusPicking: boolean;
  supportsStatusInvoiced: boolean;
  supportsPackageSplit: boolean;
  supportsUnsuppliedCancel: boolean;
  supportsCollectionRequest: boolean;
  requiresBrandMapping: boolean;
  requiresCategoryMapping: boolean;
  requiresAttributeMapping: boolean;
  preflightLevel: "STANDARD" | "ADVANCED";
};
