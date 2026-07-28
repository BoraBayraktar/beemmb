import type { MarketplaceIntegrationChannel } from "@/modules/integration/contracts/integration.contract";

export type ProductInventoryAvailability = {
  productId: string;
  variantId?: string | null;
  slug: string;
  sku: string;
  name: string;
  imageUrl: string;
  currency: string;
  unitPrice: number;
  compareAtPrice: number | null;
  onHandStock: number;
  reservedStock: number;
  availableStock: number;
  inStock: boolean;
  warehouseCode: string | null;
};

export type SyncProductInventoryInput = {
  productId: string;
  variantId?: string;
  sku: string;
  warehouseId?: string;
  warehouseCode?: string;
  targetOnHandStock?: number;
  reorderPoint?: number;
  safetyStock?: number;
  note?: string;
};

export type TransferProductInventoryInput = {
  productId: string;
  variantId?: string;
  sku: string;
  fromWarehouseCode: string;
  toWarehouseCode: string;
  quantity: number;
  note?: string;
};

export type RecordProductInventoryMovementInput = {
  productId: string;
  variantId?: string;
  sku: string;
  warehouseCode: string;
  quantity: number;
  type: "PURCHASE_RECEIPT" | "DAMAGE_WRITE_OFF";
  note?: string;
  documentType?: "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";
  sourceDocumentNumber?: string;
  sourceDocumentDate?: string;
  sourceDocumentSupplierId?: string;
  sourceDocumentSupplier?: string;
  sourceDocumentReference?: string;
  externalSystemStatus?: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
  unitCost?: number | null;
};

export type BulkInventoryAdjustmentRowInput = {
  sku: string;
  warehouseCode?: string;
  targetOnHandStock: number;
  reorderPoint?: number;
  safetyStock?: number;
  note?: string;
};

export type BulkAssignPreferredWarehouseRowInput = {
  sku: string;
  preferredSalesWarehouseCode: string;
};

export type BulkStockCountLineRowInput = {
  sku: string;
  warehouseCode: string;
  countedOnHand: number;
  note?: string;
};

export type BulkOperationRowResult = {
  rowNumber: number;
  sku: string;
  warehouseCode?: string | null;
  success: boolean;
  code?: string | null;
  message: string;
  hint?: string | null;
  inputSummary?: string | null;
};

export type BulkOperationResult = {
  total: number;
  successCount: number;
  failureCount: number;
  rows: BulkOperationRowResult[];
};

export type AdminInventoryOperationHistoryItem = {
  id: string;
  title: string;
  summary: string;
  actorLabel: string | null;
  createdAt: string;
  entityType: "PRODUCT" | "WAREHOUSE" | "STOCK_COUNT" | "TRANSACTION" | "PURCHASE_RECEIPT" | "BULK_OPERATION";
  action:
    | "STOCK_ADJUSTMENT"
    | "STOCK_TRANSFER"
    | "STOCK_IN"
    | "STOCK_OUT"
    | "STOCK_COUNT"
    | "WAREHOUSE_CREATED"
    | "WAREHOUSE_UPDATED"
    | "BULK_OPERATION";
  metadata: Record<string, unknown> | null;
};

export type AdminInventoryExportHistoryItem = {
  id: string;
  actorLabel: string | null;
  summary: string;
  total: number;
  createdAt: string;
  scopeLabel: string;
  filterCount: number;
  hasFilters: boolean;
  filters: {
    search: string | null;
    stockStatusFilter: string | null;
    reservationFilter: string | null;
    warehouseFilter: string | null;
    movementTypeFilter: string | null;
  };
};

export type InventoryListColumnPreference = "warehouse" | "stock" | "movement" | "reservation" | "preference";

export type AdminInventoryListPreferences = {
  compactInventoryList: boolean;
  visibleColumns: Record<InventoryListColumnPreference, boolean>;
};

export type AdminInventoryMovementPreview = {
  type: string;
  quantity: number;
  note: string | null;
  reference: string | null;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  sourceDocumentNumber: string | null;
  sourceDocumentUrl: string | null;
  counterpartyWarehouseCode: string | null;
  createdAt: string;
};

export type AdminInventoryItem = {
  productId: string;
  variantId?: string | null;
  variantSku?: string | null;
  variantTitle?: string | null;
  variantOptionSummary?: string | null;
  slug: string;
  sku: string;
  name: string;
  imageUrl: string;
  currency: string;
  barcode: string | null;
  unitType: string;
  productType: string;
  unitPrice: number;
  purchasePrice: number | null;
  compareAtPrice: number | null;
  onHandStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  safetyStock: number;
  warehouseCode: string | null;
  warehouseName: string | null;
  isDefaultWarehouse: boolean;
  hasReservations: boolean;
  preferredSalesWarehouseCode: string | null;
  preferredPurchaseWarehouseCode: string | null;
  warehouseDistribution: Array<{
    warehouseCode: string;
    warehouseName: string;
    onHandStock: number;
    reservedStock: number;
    availableStock: number;
    isDefaultWarehouse: boolean;
  }>;
  lastMovementType: string | null;
  recentMovements: AdminInventoryMovementPreview[];
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  lastMovementAt: string | null;
};

export type AdminInventoryListQuery = {
  search?: string;
  stockStatusFilter?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  reservationFilter?: "all" | "with_reserved" | "without_reserved";
  warehouseFilter?: string;
  movementTypeFilter?:
    | "all"
    | "INITIAL_LOAD"
    | "MANUAL_ADJUSTMENT"
    | "PURCHASE_RECEIPT"
    | "DAMAGE_WRITE_OFF"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "RESERVATION_HOLD"
    | "RESERVATION_RELEASE"
    | "ORDER_COMMIT"
    | "ORDER_CANCEL_RESTOCK"
    | "RETURN_RESTOCK";
  page?: number;
  pageSize?: number;
};

export type AdminInventorySummary = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAvailableStock: number;
  totalReservedStock: number;
  rowsWithReservations: number;
};

export type AdminInventoryListResult = {
  items: AdminInventoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: AdminInventorySummary;
};

export type AdminInventoryQuickLookupResult = {
  item: AdminInventoryItem | null;
  matchType: "BARCODE" | "SKU" | "NAME" | "NONE";
  query: string;
};

export type AdminInventoryTransactionLineItem = {
  id: string;
  quantity: number;
  note: string | null;
  fromWarehouseCode: string | null;
  toWarehouseCode: string | null;
  inventoryItemSku: string;
  inventoryItemName: string;
  variantId?: string | null;
  variantSku?: string | null;
  variantTitle?: string | null;
  unitCost?: number | null;
  lineTotal?: number | null;
};

export type AdminInventorySourceDocument = {
  type: string | null;
  id: string | null;
  number: string | null;
  url: string | null;
  date: string | null;
  externalReference: string | null;
  externalSystemStatus: string | null;
  counterpartyName: string | null;
};

export type AdminInventoryTransactionItem = {
  id: string;
  transactionNumber: string;
  type: "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
  reference: string | null;
  note: string | null;
  sourceDocument: AdminInventorySourceDocument;
  createdAt: string;
  lines: AdminInventoryTransactionLineItem[];
};

export type AdminInventoryTransactionListQuery = {
  search?: string;
  type?: "all" | "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
  warehouseCode?: string;
  sku?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type AdminInventoryTransactionListResult = {
  items: AdminInventoryTransactionItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminWarehouseItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  levelCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCreateWarehouseInput = {
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  priority?: number;
  isActive?: boolean;
  isDefault?: boolean;
};

export type AdminUpdateWarehouseInput = {
  id: string;
  code?: string;
  name?: string;
  description?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  priority?: number;
  isActive?: boolean;
  isDefault?: boolean;
};

export type AdminInventoryAlertItem = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  warehouseCode: string;
  warehouseName: string;
  availableStock: number;
  reorderPoint: number;
  safetyStock: number;
  type: "LOW_STOCK" | "OUT_OF_STOCK";
  status: "ACTIVE" | "RESOLVED";
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminInventoryAlertSummary = {
  activeCount: number;
  outOfStockCount: number;
  lowStockCount: number;
};

export type AdminStockCountLineItem = {
  id: string;
  inventoryItemId: string;
  productId: string;
  sku: string;
  productName: string;
  warehouseCode: string;
  warehouseName: string;
  systemOnHand: number;
  countedOnHand: number | null;
  difference: number | null;
  note: string | null;
};

export type AdminStockCountItem = {
  id: string;
  countNumber: string;
  status: "DRAFT" | "COUNTED" | "APPLIED";
  countedAt: string;
  note: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  lineCount: number;
  varianceLineCount: number;
  createdAt: string;
  updatedAt: string;
  lines: AdminStockCountLineItem[];
};

export type AdminCreateStockCountInput = {
  warehouseCode?: string | null;
  countedAt: string;
  note?: string | null;
  search?: string | null;
};

export type AdminUpdateStockCountLineInput = {
  stockCountId: string;
  lineId: string;
  countedOnHand: number;
  note?: string | null;
};

export type AdminInventoryReportCostingMethod = "AVERAGE_COST" | "LAST_PURCHASE_COST";

export type AdminInventoryReportsQuery = {
  periodDays?: 7 | 30 | 90;
  comparePreviousPeriod?: boolean;
  costingMethod?: AdminInventoryReportCostingMethod;
  categoryId?: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  warehouseCode?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  reservationStatus?: "with_reserved" | "without_reserved";
  movementType?:
    | "INITIAL_LOAD"
    | "MANUAL_ADJUSTMENT"
    | "PURCHASE_RECEIPT"
    | "DAMAGE_WRITE_OFF"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "RESERVATION_HOLD"
    | "RESERVATION_RELEASE"
    | "ORDER_COMMIT"
    | "ORDER_CANCEL_RESTOCK"
    | "RETURN_RESTOCK";
};

export type AdminInventoryReportFilterOptions = {
  categories: Array<{
    id: string;
    name: string;
  }>;
  productTypes: string[];
  warehouses: Array<{
    code: string;
    name: string;
  }>;
  movementTypes: string[];
};

export type AdminInventoryReportOverview = {
  officialCostingMethod: "AVERAGE_COST";
  officialCostingMethodLabel: string;
  displayCostingMethod: AdminInventoryReportCostingMethod;
  displayCostingMethodLabel: string;
  comparisonCostingModeEnabled: boolean;
  totalOnHandUnits: number;
  totalAvailableUnits: number;
  totalCostValue: number;
  totalSalesValue: number;
  totalPotentialProfit: number;
  averageCoverageDays: number | null;
  stockTurnoverRate: number;
  warehouseCount: number;
  lowStockRowCount: number;
  outOfStockRowCount: number;
  legacyStockFallbackCount: number;
  stockMismatchCount: number;
};

export type AdminInventoryConsistencyReportItem = {
  productId: string;
  productName: string;
  sku: string;
  legacyStock: number;
  aggregateAvailableStock: number;
  difference: number;
  hasInventoryLevels: boolean;
};

export type AdminInventoryWarehouseReportItem = {
  warehouseCode: string;
  warehouseName: string;
  skuCount: number;
  onHandUnits: number;
  availableUnits: number;
  costValue: number;
  salesValue: number;
};

export type AdminInventoryLowStockReportItem = {
  productId: string;
  productName: string;
  sku: string;
  warehouseCode: string;
  warehouseName: string;
  availableUnits: number;
  reorderPoint: number;
  safetyStock: number;
  unitCost: number;
  unitPrice: number;
};

export type AdminInventoryMovementSummaryItem = {
  movementType: string;
  movementCount: number;
  totalQuantity: number;
  lastMovementAt: string | null;
};

export type AdminInventoryTrendPoint = {
  date: string;
  stockInQuantity: number;
  stockOutQuantity: number;
  netQuantity: number;
};

export type AdminInventoryReportPeriodSummary = {
  startDate: string;
  endDate: string;
  periodDays: number;
  movementCount: number;
  totalStockInQuantity: number;
  totalStockOutQuantity: number;
  netQuantity: number;
};

export type AdminInventoryReportPeriodComparison = {
  enabled: boolean;
  current: AdminInventoryReportPeriodSummary;
  previous: AdminInventoryReportPeriodSummary | null;
  stockInDelta: number | null;
  stockOutDelta: number | null;
  netDelta: number | null;
  movementCountDelta: number | null;
};

export type AdminInventoryVelocityReportItem = {
  productId: string;
  productName: string;
  sku: string;
  availableUnits: number;
  last30DayOutboundUnits: number;
  turnoverRate: number;
  coverageDays: number | null;
};

export type AdminInventorySlowMovingReportItem = {
  productId: string;
  productName: string;
  sku: string;
  availableUnits: number;
  salesValue: number;
  lastMovementAt: string | null;
  inactivityDays: number | null;
};

export type AdminInventoryAbcSegmentReportItem = {
  segment: "A" | "B" | "C";
  productCount: number;
  estimatedSalesValue: number;
  sharePercent: number;
};

export type AdminInventoryReportsResult = {
  overview: AdminInventoryReportOverview;
  periodDays: number;
  comparison: AdminInventoryReportPeriodComparison;
  filterOptions: AdminInventoryReportFilterOptions;
  warehouses: AdminInventoryWarehouseReportItem[];
  lowStock: AdminInventoryLowStockReportItem[];
  movementSummary: AdminInventoryMovementSummaryItem[];
  trend: AdminInventoryTrendPoint[];
  velocity: AdminInventoryVelocityReportItem[];
  slowMoving: AdminInventorySlowMovingReportItem[];
  abcSegments: AdminInventoryAbcSegmentReportItem[];
  consistency: AdminInventoryConsistencyReportItem[];
};

export type AdminInventoryIntegrationJobItem = {
  id: string;
  channel: MarketplaceIntegrationChannel;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";
  entityId: string;
  createdAt: string;
  lastError: string | null;
};

export type AdminInventoryIntegrationSummary = {
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
  recentJobs: AdminInventoryIntegrationJobItem[];
};

export type InventoryIntegrationChannel = "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";
export type ExternalStockEventType = "SNAPSHOT_ON_HAND" | "SNAPSHOT_AVAILABLE";
export type ExternalStockEventStatus = "RECEIVED" | "APPLIED" | "FAILED" | "DUPLICATE";

export type AdminInventoryIntegrationMappingItem = {
  id: string;
  channel: InventoryIntegrationChannel;
  externalProductId: string | null;
  externalSku: string | null;
  externalWarehouseCode: string | null;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  allowInboundUpdates: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUpsertInventoryIntegrationMappingInput = {
  channel: InventoryIntegrationChannel;
  externalProductId?: string | null;
  externalSku?: string | null;
  externalWarehouseCode?: string | null;
  productId: string;
  warehouseCode?: string | null;
  allowInboundUpdates?: boolean;
};

export type AdminExternalStockEventItem = {
  id: string;
  channel: InventoryIntegrationChannel;
  eventKey: string;
  eventType: ExternalStockEventType;
  status: ExternalStockEventStatus;
  direction: "INBOUND" | "OUTBOUND";
  externalProductId: string | null;
  externalSku: string | null;
  externalWarehouseCode: string | null;
  mappingId: string | null;
  mappingMode: "EXTERNAL_PRODUCT_ID" | "EXTERNAL_SKU" | "UNRESOLVED";
  warehouseResolution: "MAPPING_WAREHOUSE" | "DEFAULT_WAREHOUSE" | "UNRESOLVED";
  projectionStatus: "PENDING" | "APPLIED" | "FAILED" | "DUPLICATE";
  productId: string | null;
  productName: string | null;
  productSku: string | null;
  warehouseId: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  quantity: number;
  reference: string | null;
  note: string | null;
  payloadSummary: string | null;
  appliedOnHand: number | null;
  appliedAvailable: number | null;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
};

export type AdminExternalStockEventMonitoring = {
  receivedCount: number;
  appliedCount: number;
  failedCount: number;
  duplicateCount: number;
  unresolvedCount: number;
  readOnlyCount: number;
  targetLevelMissingCount: number;
  latestFailedMessage: string | null;
  items: AdminExternalStockEventItem[];
};

export type ReceiveExternalStockEventInput = {
  channel: InventoryIntegrationChannel;
  eventKey: string;
  eventType: ExternalStockEventType;
  externalProductId?: string | null;
  externalSku?: string | null;
  externalWarehouseCode?: string | null;
  quantity: number;
  reference?: string | null;
  note?: string | null;
  payload?: Record<string, string | number | boolean | null>;
};

export type ReceiveExternalStockEventResult = {
  eventId: string;
  duplicate: boolean;
  status: ExternalStockEventStatus;
  productId: string | null;
  warehouseId: string | null;
};

export type AdminInventoryTransactionFinanceSummary = {
  id: string;
  transactionNumber: string;
  type: string;
  createdAt: string;
};
