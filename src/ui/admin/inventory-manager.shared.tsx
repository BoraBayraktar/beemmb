import type { Locale } from "@/lib/i18n";
import type {
  AdminInventoryExportHistoryItem,
  AdminInventoryListPreferences,
  AdminInventoryQuickLookupResult,
  AdminInventoryReportsResult,
  AdminInventoryTransactionListResult,
  InventoryListColumnPreference,
} from "@/modules/inventory/contracts/inventory.contract";

export type Labels = {
  title: string;
  inventoryList: string;
  inventorySummary: string;
  totalProducts: string;
  lowStockCount: string;
  outOfStockCount: string;
  totalAvailableStock: string;
  totalReservedStock: string;
  rowsWithReservations: string;
  search: string;
  product: string;
  sku: string;
  warehouse: string;
  onHandStock: string;
  reservedStock: string;
  availableStock: string;
  reorderPoint: string;
  safetyStock: string;
  stockStatus: string;
  movementType: string;
  movementReference: string;
  movementCounterpartyWarehouse: string;
  lastMovementAt: string;
  detail: string;
  viewDetails: string;
  drawerInfo: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  page: string;
  prev: string;
  next: string;
  empty: string;
  stockFilter: string;
  reservationFilter: string;
  warehouseFilter: string;
  movementTypeFilter: string;
  all: string;
  allWarehouses: string;
  defaultWarehouse: string;
  withReservations: string;
  withoutReservations: string;
  recentMovements: string;
  noRecentMovements: string;
  viewAllHistory: string;
  movementDateRange: string;
  movementAllTime: string;
  movementLast24Hours: string;
  movementLast7Days: string;
  movementLast30Days: string;
  exportCsv: string;
  movementHistoryFilter: string;
  adjustStock: string;
  stockIn: string;
  stockOut: string;
  targetOnHandStock: string;
  targetReorderPoint: string;
  targetSafetyStock: string;
  adjustmentNote: string;
  applyAdjustment: string;
  adjustmentSaved: string;
  adjustmentFailed: string;
  movementQuantity: string;
  stockInSaved: string;
  stockInFailed: string;
  stockOutSaved: string;
  stockOutFailed: string;
  transferStock: string;
  transferQuantity: string;
  transferTargetWarehouse: string;
  transferNote: string;
  applyTransfer: string;
  transferSaved: string;
  transferFailed: string;
  warehousesTitle: string;
  warehousesDescription: string;
  criticalStockTitle: string;
  criticalStockDescription: string;
  activeAlerts: string;
  reportsTitle: string;
  reportsDescription: string;
  quickActionTitle: string;
  quickActionDescription: string;
  quickActionInputLabel: string;
  quickActionInputPlaceholder: string;
  quickActionOpen: string;
  quickActionLookup: string;
  quickActionSearching: string;
  quickActionStartCamera: string;
  quickActionStopCamera: string;
  quickActionCameraReady: string;
  quickActionCameraUnsupported: string;
  quickActionCameraDenied: string;
  quickActionNoMatch: string;
  quickActionMatchBarcode: string;
  quickActionMatchSku: string;
  quickActionMatchName: string;
  quickActionScannerHint: string;
  quickActionRememberedMode: string;
  quickActionAutoOpenHint: string;
  quickActionFastModeTitle: string;
  quickActionFastModeDescription: string;
  quickActionQuantityLabel: string;
  quickActionApplyNow: string;
  quickActionApplySuccess: string;
  quickActionApplyFailed: string;
  quickActionTargetWarehouseLabel: string;
  quickActionSerialMode: string;
  quickActionSerialModeHint: string;
  sectionsTitle: string;
  sectionQuickActions: string;
  sectionReports: string;
  sectionSync: string;
  sectionCritical: string;
  sectionCounts: string;
  sectionWarehouses: string;
  sectionTransactions: string;
  sectionInventoryList: string;
  integrationTitle: string;
  integrationDescription: string;
  syncPending: string;
  syncProcessing: string;
  syncFailed: string;
  syncDeadLetter: string;
  syncSuccess: string;
  syncRecentJobs: string;
  syncLastError: string;
  channelTrendyol: string;
  channelN11: string;
  channelHepsiburada: string;
  totalOnHandUnits: string;
  totalCostValue: string;
  totalSalesValue: string;
  totalPotentialProfit: string;
  averageCoverageDays: string;
  stockTurnoverRate: string;
  legacyStockFallbackCount: string;
  stockMismatchCount: string;
  consistencyTitle: string;
  consistencyDescription: string;
  legacyStockLabel: string;
  aggregateStockLabel: string;
  differenceLabel: string;
  noConsistencyIssues: string;
  warehouseCount: string;
  lowStockRows: string;
  outOfStockRows: string;
  warehousePerformance: string;
  lowStockReport: string;
  movementSummaryTitle: string;
  trendTitle: string;
  category: string;
  productType: string;
  reportPeriod: string;
  reportComparePrevious: string;
  reportCostingMethod: string;
  reportCategoryFilter: string;
  reportProductTypeFilter: string;
  reportWarehouseFilter: string;
  reportStockStatusFilter: string;
  reportReservationFilter: string;
  reportMovementTypeFilter: string;
  reportFiltersTitle: string;
  reportFiltersDescription: string;
  reportClearFilters: string;
  reportPeriod7Days: string;
  reportPeriod30Days: string;
  reportPeriod90Days: string;
  reportCostAverage: string;
  reportCostLastPurchase: string;
  reportOfficialCostingMethod: string;
  reportComparisonCostingMode: string;
  reportCurrentPeriod: string;
  reportPreviousPeriod: string;
  reportDifference: string;
  reportMovementCount: string;
  reportRange: string;
  velocityTitle: string;
  velocityDescription: string;
  slowMovingTitle: string;
  slowMovingDescription: string;
  abcTitle: string;
  abcDescription: string;
  costValue: string;
  salesValue: string;
  potentialProfit: string;
  movementCount: string;
  totalQuantityLabel: string;
  trendStockIn: string;
  trendStockOut: string;
  trendNet: string;
  last30DayOutboundUnits: string;
  coverageDays: string;
  inactivityDays: string;
  sharePercent: string;
  segment: string;
  viewInInventory: string;
  openInTransactions: string;
  startStockCount: string;
  reviewLowStock: string;
  reviewSlowMoving: string;
  focusWarehouse: string;
  stockCountTitle: string;
  stockCountDescription: string;
  createStockCount: string;
  stockCountWarehouseScope: string;
  stockCountDate: string;
  stockCountNote: string;
  stockCountSearch: string;
  stockCountCreateAction: string;
  stockCountSaved: string;
  stockCountSaveFailed: string;
  stockCountApply: string;
  stockCountApplied: string;
  stockCountApplyFailed: string;
  stockCountLineCount: string;
  stockCountVarianceCount: string;
  stockCountCountedOnHand: string;
  stockCountDifference: string;
  stockCountEditLine: string;
  stockCountLineSaved: string;
  stockCountLineSaveFailed: string;
  stockCountStatusDraft: string;
  stockCountStatusCounted: string;
  stockCountStatusApplied: string;
  alertTypeLowStock: string;
  alertTypeOutOfStock: string;
  alertMessage: string;
  alertCreatedAt: string;
  noAlerts: string;
  createWarehouse: string;
  editWarehouse: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseDescription: string;
  warehouseAddress: string;
  warehouseContactName: string;
  warehouseContactPhone: string;
  warehousePriority: string;
  warehouseStatus: string;
  levelCount: string;
  saveWarehouse: string;
  warehouseSaved: string;
  warehouseSaveFailed: string;
  transactionsTitle: string;
  transactionsDescription: string;
  transactionSearch: string;
  transactionFilterType: string;
  transactionFilterWarehouse: string;
  transactionFilterSku: string;
  transactionFilterStartDate: string;
  transactionFilterEndDate: string;
  transactionLines: string;
  alertType?: string;
  notSpecified: string;
  applyLabel?: string;
  closeLabel?: string;
  passive: string;
  active: string;
  defaultLabel: string;
};

export type DrawerMode = "view" | "edit" | "transfer" | "stock_in" | "stock_out";
export type WarehouseDrawerMode = "create" | "edit";
export type TransactionDrawerItem = AdminInventoryTransactionListResult["items"][number];
export type StockCountDrawerMode = "create" | "edit";
export type InventoryPageVariant =
  | "overview"
  | "quick-actions"
  | "inventory-list"
  | "transactions"
  | "counts"
  | "warehouses"
  | "exports"
  | "external-events";
export type InventoryListColumn = InventoryListColumnPreference;

export const inventoryListPreferenceKey = "inventory-manager:list-preferences:v1";
export const quickActionPreferenceKey = "inventory-manager:quick-action:v1";
export const quickActionSerialModePreferenceKey = "inventory-manager:quick-action-serial-mode:v1";

export const inventorySectionAnchors = [
  { id: "quick-actions", key: "sectionQuickActions" as const },
  { id: "inventory-reports", key: "sectionReports" as const },
  { id: "inventory-sync", key: "sectionSync" as const },
  { id: "inventory-critical", key: "sectionCritical" as const },
  { id: "inventory-counts", key: "sectionCounts" as const },
  { id: "inventory-warehouses", key: "sectionWarehouses" as const },
  { id: "inventory-transactions", key: "sectionTransactions" as const },
  { id: "inventory-exports", key: "sectionTransactions" as const },
  { id: "inventory-list", key: "sectionInventoryList" as const },
] as const;

export const inventorySectionGroups = [
  {
    id: "overview",
    label: "Genel Bakış",
    sections: ["quick-actions", "inventory-reports", "inventory-critical"] as const,
  },
  {
    id: "operations",
    label: "Operasyonlar",
    sections: ["inventory-list", "inventory-counts", "inventory-sync"] as const,
  },
  {
    id: "definitions",
    label: "Tanımlar",
    sections: ["inventory-warehouses"] as const,
  },
  {
    id: "history",
    label: "Geçmiş",
    sections: ["inventory-transactions", "inventory-exports"] as const,
  },
] as const;

export type InventorySectionId = (typeof inventorySectionAnchors)[number]["id"];
export type InventorySectionGroupId = (typeof inventorySectionGroups)[number]["id"];

export function getDefaultVisibleColumns(): Record<InventoryListColumn, boolean> {
  return {
    warehouse: true,
    stock: true,
    movement: true,
    reservation: true,
    preference: false,
  };
}

export function getDefaultInventoryListPreferences(): AdminInventoryListPreferences {
  return {
    compactInventoryList: false,
    visibleColumns: getDefaultVisibleColumns(),
  };
}

export function normalizeInventoryListPreferences(
  preferences?: Partial<AdminInventoryListPreferences> | null,
): AdminInventoryListPreferences {
  const fallback = getDefaultInventoryListPreferences();

  if (!preferences) {
    return fallback;
  }

  return {
    compactInventoryList: Boolean(preferences.compactInventoryList),
    visibleColumns: {
      ...fallback.visibleColumns,
      ...preferences.visibleColumns,
    },
  };
}

export function loadInventoryListPreferences(): AdminInventoryListPreferences {
  const fallback = getDefaultInventoryListPreferences();

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(inventoryListPreferenceKey);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as {
      compactInventoryList?: boolean;
      visibleColumns?: Partial<Record<InventoryListColumn, boolean>>;
    };

    return {
      compactInventoryList: Boolean(parsed.compactInventoryList),
      visibleColumns: {
        ...fallback.visibleColumns,
        ...parsed.visibleColumns,
      },
    };
  } catch {
    window.localStorage.removeItem(inventoryListPreferenceKey);
    return fallback;
  }
}

export function loadQuickActionMode(): DrawerMode {
  if (typeof window === "undefined") {
    return "view";
  }

  const raw = window.localStorage.getItem(quickActionPreferenceKey);
  if (raw === "view" || raw === "edit" || raw === "transfer" || raw === "stock_in" || raw === "stock_out") {
    return raw;
  }

  return "view";
}

export function loadQuickActionSerialMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(quickActionSerialModePreferenceKey) === "1";
}

export function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDelta(value: number | null) {
  if (value === null) {
    return "Kıyas kapalı";
  }

  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export function getSectionPanelClass(activeSection: InventorySectionId, sectionId: InventorySectionId) {
  return activeSection === sectionId ? "border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 p-5" : "hidden";
}

export function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-5 text-sm">
      <p className="font-semibold text-[color:var(--color-text)]">{title}</p>
      <p className="mt-1 text-[color:var(--color-text-muted)]">{description}</p>
    </div>
  );
}

export function alertTypeLabel(
  type: "LOW_STOCK" | "OUT_OF_STOCK",
  labels: Pick<Labels, "alertTypeLowStock" | "alertTypeOutOfStock">,
) {
  return type === "OUT_OF_STOCK" ? labels.alertTypeOutOfStock : labels.alertTypeLowStock;
}

export function formatFilterSummary(filters: AdminInventoryExportHistoryItem["filters"]) {
  const parts = [
    filters.search ? `Arama: ${filters.search}` : null,
    filters.stockStatusFilter && filters.stockStatusFilter !== "all" ? `Stok durumu: ${filters.stockStatusFilter}` : null,
    filters.reservationFilter && filters.reservationFilter !== "all" ? `Rezervasyon: ${filters.reservationFilter}` : null,
    filters.warehouseFilter && filters.warehouseFilter !== "all" ? `Depo: ${filters.warehouseFilter}` : null,
    filters.movementTypeFilter && filters.movementTypeFilter !== "all" ? `Hareket: ${filters.movementTypeFilter}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Filtre kullanılmadan dışa aktarılmış.";
}

export function formatQuickActionMatchLabel(
  matchType: AdminInventoryQuickLookupResult["matchType"],
  labels: Pick<
    Labels,
    "quickActionMatchBarcode" | "quickActionMatchSku" | "quickActionMatchName" | "quickActionNoMatch"
  >,
) {
  if (matchType === "BARCODE") {
    return labels.quickActionMatchBarcode;
  }

  if (matchType === "SKU") {
    return labels.quickActionMatchSku;
  }

  if (matchType === "NAME") {
    return labels.quickActionMatchName;
  }

  return labels.quickActionNoMatch;
}

export function getInventoryPageMeta(pageVariant: InventoryPageVariant) {
  if (pageVariant === "transactions") {
    return {
      badge: "Stok Hareketleri",
      shortTitle: "Islemler",
      breadcrumbCurrent: "Stok Islemleri",
      accentClass: "from-sky-500/15 via-cyan-500/10 to-transparent",
    };
  }

  if (pageVariant === "quick-actions") {
    return {
      badge: "Hızlı Barkod Operasyonu",
      shortTitle: "Hızlı İşlemler",
      breadcrumbCurrent: "Hızlı Barkod İşlemleri",
      accentClass: "from-emerald-500/15 via-teal-500/10 to-transparent",
    };
  }

  if (pageVariant === "inventory-list") {
    return {
      badge: "Ürün Stokları",
      shortTitle: "Ürün Stokları",
      breadcrumbCurrent: "Ürün Stokları",
      accentClass: "from-indigo-500/15 via-sky-500/10 to-transparent",
    };
  }

  if (pageVariant === "counts") {
    return {
      badge: "Sayim Operasyonu",
      shortTitle: "Sayimlar",
      breadcrumbCurrent: "Stok Sayimlari",
      accentClass: "from-amber-500/15 via-orange-500/10 to-transparent",
    };
  }

  if (pageVariant === "warehouses") {
    return {
      badge: "Depo Tanimlari",
      shortTitle: "Depolar",
      breadcrumbCurrent: "Depo Yonetimi",
      accentClass: "from-emerald-500/15 via-teal-500/10 to-transparent",
    };
  }

  if (pageVariant === "exports") {
    return {
      badge: "Dışa Aktarım Geçmişi",
      shortTitle: "Dışa Aktarımlar",
      breadcrumbCurrent: "Dışa Aktarım Geçmişi",
      accentClass: "from-fuchsia-500/15 via-sky-500/10 to-transparent",
    };
  }

  if (pageVariant === "external-events") {
    return {
      badge: "Harici Eventler",
      shortTitle: "Harici Eventler",
      breadcrumbCurrent: "Harici Stok Eventleri",
      accentClass: "from-cyan-500/15 via-sky-500/10 to-transparent",
    };
  }

  return {
    badge: "Merkezi Gorunum",
    shortTitle: "Genel Bakis",
    breadcrumbCurrent: "Stok Genel Bakis",
    accentClass: "from-violet-500/15 via-sky-500/10 to-transparent",
  };
}

export function getOverviewReportSnapshot(reports: AdminInventoryReportsResult) {
  return {
    totalCostValue: reports.overview.totalCostValue,
    totalSalesValue: reports.overview.totalSalesValue,
    stockTurnoverRate: reports.overview.stockTurnoverRate,
    stockMismatchCount: reports.overview.stockMismatchCount,
    totalStockInQuantity: reports.comparison.current.totalStockInQuantity,
    totalStockOutQuantity: reports.comparison.current.totalStockOutQuantity,
    netQuantity: reports.comparison.current.netQuantity,
    stockInDelta: reports.comparison.stockInDelta,
    stockOutDelta: reports.comparison.stockOutDelta,
    netDelta: reports.comparison.netDelta,
  };
}
