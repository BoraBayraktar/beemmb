"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Download, Maximize2, Minimize2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type { AdminSupplierItem } from "@/modules/catalog/contracts/catalog-admin.contract";
import type { AdminProductVariantItem } from "@/modules/catalog/contracts/catalog-admin.contract";
import type {
  AdminInventoryAlertSummary,
  AdminExternalStockEventMonitoring,
  AdminInventoryExportHistoryItem,
  AdminInventoryIntegrationSummary,
  AdminInventoryListResult,
  AdminInventoryListPreferences,
  AdminInventoryOperationHistoryItem,
  AdminInventoryQuickLookupResult,
  AdminInventoryReportsResult,
  AdminStockCountItem,
  AdminInventoryTransactionListResult,
  AdminWarehouseItem,
  BulkOperationResult,
} from "@/modules/inventory/contracts/inventory.contract";
import {
  alertTypeLabel,
  formatCurrency,
  getInventoryPageMeta,
  getSectionPanelClass,
  inventoryListPreferenceKey,
  inventorySectionAnchors,
  inventorySectionGroups,
  normalizeInventoryListPreferences,
  quickActionPreferenceKey,
  quickActionSerialModePreferenceKey,
} from "@/ui/admin/inventory-manager.shared";
import type {
  DrawerMode,
  InventoryListColumn,
  InventoryPageVariant,
  InventorySectionGroupId,
  InventorySectionId,
  StockCountDrawerMode,
  TransactionDrawerItem,
  WarehouseDrawerMode,
} from "@/ui/admin/inventory-manager.shared";
import {
  InventoryDrawerDistributionPanel,
  InventoryDrawerMovementsPanel,
  InventoryDrawerOperationPanel,
  InventoryDrawerOverviewPanel,
  InventoryCriticalPanel,
  InventoryCountsPanel,
  InventoryExportsPanel,
  InventoryListResultsPanel,
  InventoryQuickActionsPanel,
  InventoryReportsPanel,
  InventorySyncPanel,
  InventoryTransactionsPanel,
  InventoryWarehousesPanel,
} from "@/ui/admin/inventory-manager-panels";

type Labels = {
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
  active: string;
  passive: string;
  defaultLabel: string;
  levelCount: string;
  saveWarehouse: string;
  warehouseSaved: string;
  warehouseSaveFailed: string;
  inventoryMovementInitialLoad: string;
  inventoryMovementManualAdjustment: string;
  inventoryMovementPurchaseReceipt: string;
  inventoryMovementTransferOut: string;
  inventoryMovementTransferIn: string;
  inventoryMovementReservationHold: string;
  inventoryMovementReservationRelease: string;
  inventoryMovementOrderCommit: string;
  inventoryMovementOrderCancelRestock: string;
  inventoryMovementReturnRestock: string;
  inventoryMovementDamageWriteOff: string;
  transactionsTitle: string;
  transactionsDescription: string;
  transactionNumber: string;
  transactionType: string;
  transactionCreatedAt: string;
  transactionLines: string;
  transactionSearch: string;
  transactionFilterType: string;
  transactionFilterWarehouse: string;
  transactionFilterSku: string;
  transactionFilterStartDate: string;
  transactionFilterEndDate: string;
  notSpecified: string;
};

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: AdminInventoryListResult["items"][number]["stockStatus"], labels: Labels) {
  if (status === "OUT_OF_STOCK") {
    return labels.outOfStock;
  }

  if (status === "LOW_STOCK") {
    return labels.lowStock;
  }

  return labels.inStock;
}

function statusClass(status: AdminInventoryListResult["items"][number]["stockStatus"]) {
  if (status === "OUT_OF_STOCK") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "LOW_STOCK") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function movementTypeLabel(movementType: string | null, labels: Labels) {
  if (!movementType) {
    return labels.notSpecified;
  }

  if (movementType === "INITIAL_LOAD") {
    return labels.inventoryMovementInitialLoad;
  }

  if (movementType === "MANUAL_ADJUSTMENT") {
    return labels.inventoryMovementManualAdjustment;
  }

  if (movementType === "PURCHASE_RECEIPT") {
    return labels.inventoryMovementPurchaseReceipt;
  }

  if (movementType === "COUNT_ADJUSTMENT") {
    return labels.adjustStock;
  }

  if (movementType === "TRANSFER_OUT") {
    return labels.inventoryMovementTransferOut;
  }

  if (movementType === "TRANSFER_IN") {
    return labels.inventoryMovementTransferIn;
  }

  if (movementType === "RESERVATION_HOLD") {
    return labels.inventoryMovementReservationHold;
  }

  if (movementType === "RESERVATION_RELEASE") {
    return labels.inventoryMovementReservationRelease;
  }

  if (movementType === "ORDER_COMMIT") {
    return labels.inventoryMovementOrderCommit;
  }

  if (movementType === "ORDER_CANCEL_RESTOCK") {
    return labels.inventoryMovementOrderCancelRestock;
  }

  if (movementType === "RETURN_RESTOCK") {
    return labels.inventoryMovementReturnRestock;
  }

  if (movementType === "DAMAGE_WRITE_OFF") {
    return labels.inventoryMovementDamageWriteOff;
  }

  return labels.notSpecified;
}

function movementTypeClass(movementType: string | null) {
  if (movementType === "MANUAL_ADJUSTMENT") {
    return "bg-sky-100 text-sky-700";
  }

  if (movementType === "COUNT_ADJUSTMENT") {
    return "bg-indigo-100 text-indigo-700";
  }

  if (movementType === "TRANSFER_OUT") {
    return "bg-orange-100 text-orange-700";
  }

  if (movementType === "TRANSFER_IN") {
    return "bg-teal-100 text-teal-700";
  }

  if (movementType === "ORDER_COMMIT" || movementType === "DAMAGE_WRITE_OFF") {
    return "bg-rose-100 text-rose-700";
  }

  if (movementType === "ORDER_CANCEL_RESTOCK" || movementType === "RETURN_RESTOCK" || movementType === "PURCHASE_RECEIPT") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (movementType === "RESERVATION_HOLD" || movementType === "RESERVATION_RELEASE") {
    return "bg-amber-100 text-amber-700";
  }

  if (movementType === "INITIAL_LOAD") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text-muted)]";
}

function stockCountStatusLabel(status: AdminStockCountItem["status"], labels: Labels) {
  if (status === "APPLIED") {
    return labels.stockCountStatusApplied;
  }

  if (status === "COUNTED") {
    return labels.stockCountStatusCounted;
  }

  return labels.stockCountStatusDraft;
}

function stockCountStatusClass(status: AdminStockCountItem["status"]) {
  if (status === "APPLIED") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "COUNTED") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)]";
}

type Props = {
  locale: Locale;
  result: AdminInventoryListResult;
  transactionResult: AdminInventoryTransactionListResult;
  warehouses: AdminWarehouseItem[];
  suppliers: AdminSupplierItem[];
  alertResult: {
    items: Array<{
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
    }>;
    summary: AdminInventoryAlertSummary;
  };
  stockCounts: AdminStockCountItem[];
  reports: AdminInventoryReportsResult;
  integrationSummary: AdminInventoryIntegrationSummary;
  externalEventMonitoring: AdminExternalStockEventMonitoring;
  operationHistory: AdminInventoryOperationHistoryItem[];
  exportHistory: AdminInventoryExportHistoryItem[];
  inventoryPreferences: AdminInventoryListPreferences;
  query: {
    search: string;
    stockStatusFilter: string;
    reservationFilter: string;
    warehouseFilter: string;
    movementTypeFilter: string;
    transactionSearch: string;
    transactionType: string;
    transactionWarehouse: string;
    transactionSku: string;
    transactionStartDate: string;
    transactionEndDate: string;
    transactionPage: string;
    reportPeriodDays: string;
    reportComparePrevious: string;
    reportCostingMethod: string;
    reportCategoryFilter: string;
    reportProductTypeFilter: string;
    reportWarehouseFilter: string;
    reportStockStatusFilter: string;
    reportReservationFilter: string;
    reportMovementTypeFilter: string;
  };
  labels: Labels;
  overviewPath: string;
  inventoryListPath: string;
  transactionListPath: string;
  stockCountsPath: string;
  warehousesPath: string;
  externalEventsPath: string;
  pageVariant?: InventoryPageVariant;
  initialSectionGroup?: InventorySectionGroupId;
  initialSection?: InventorySectionId;
};

function formatSourceDocumentType(type: string | null) {
  if (!type) {
    return null;
  }

  const typeLabelMap: Record<string, string> = {
    INVENTORY_ADJUSTMENT: "Stok Düzeltme",
    WAREHOUSE_TRANSFER: "Depo Transferi",
    PURCHASE_RECEIPT: "Stok Girişi",
    STOCK_WRITE_OFF: "Stok Çıkışı",
    STOCK_COUNT: "Stok Sayımı",
    ORDER: "Sipariş",
    RETURN: "İade",
    INVOICE: "Fatura",
    WAYBILL: "İrsaliye",
    PURCHASE_DOCUMENT: "Satın Alma Belgesi",
    DELIVERY_NOTE: "İrsaliye",
    E_INVOICE: "E-Fatura",
    E_DISPATCH: "E-İrsaliye",
  };

  return typeLabelMap[type] ?? type;
}

function formatInventoryNote(note: string | null | undefined) {
  if (!note) {
    return note ?? null;
  }

  const noteLabelMap: Record<string, string> = {
    "Inventory manager stock in": "Stok yöneticisi stok girişi",
    "Inventory manager stock out": "Stok yöneticisi stok çıkışı",
    "Inventory manager manual adjustment": "Stok yöneticisi manuel stok düzeltmesi",
    "Inventory manager warehouse transfer": "Stok yöneticisi depo transferi",
    "Catalog admin initial stock setup": "Ürün yönetimi ilk stok kurulumu",
  };

  return noteLabelMap[note] ?? note;
}

function formatSourceDocument(source: {
  type: string | null;
  number: string | null;
}) {
  if (!source.type && !source.number) {
    return null;
  }

  const typeLabel = formatSourceDocumentType(source.type) ?? "Belge";
  return source.number ? `${typeLabel} • ${source.number}` : typeLabel;
}

function formatSourceDocumentMeta(source: {
  date: string | null;
  externalReference: string | null;
  externalSystemStatus: string | null;
  counterpartyName: string | null;
}, locale: Locale, fallback: string) {
  const externalStatusLabelMap: Record<string, string> = {
    NOT_SENT: "Dış sisteme gönderilmedi",
    QUEUED: "Dış sistem kuyruğunda",
    SENT: "Dış sisteme gönderildi",
    FAILED: "Dış sistem hatası",
  };

  const parts = [
    source.counterpartyName,
    source.externalReference ? `Harici ref: ${source.externalReference}` : null,
    source.externalSystemStatus ? (externalStatusLabelMap[source.externalSystemStatus] ?? source.externalSystemStatus) : null,
    source.date ? formatDate(source.date, locale, fallback) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : null;
}

function formatProductType(value: string) {
  const labelMap: Record<string, string> = {
    PHYSICAL: "Fiziksel Ürün",
    SERVICE: "Hizmet",
    RAW_MATERIAL: "Hammadde",
    SEMI_FINISHED: "Yarı Mamul",
  };

  return labelMap[value] ?? value;
}

function formatUnitType(value: string) {
  const labelMap: Record<string, string> = {
    PIECE: "Adet",
    UNIT: "Birim",
    BOX: "Kutu",
    PACK: "Paket",
    KILOGRAM: "Kilogram",
    GRAM: "Gram",
    LITER: "Litre",
    METER: "Metre",
  };

  return labelMap[value] ?? value;
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructorLike = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function stopMediaStream(stream: MediaStream | null) {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function isQuickActionCameraSupported() {
  if (typeof window === "undefined") {
    return false;
  }

  const detector = (window as Window & {
    BarcodeDetector?: BarcodeDetectorConstructorLike;
  }).BarcodeDetector;

  return Boolean(
    detector
    && navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === "function",
  );
}

function subscribeQuickActionCameraSupport(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("focus", onStoreChange);
  return () => {
    window.removeEventListener("focus", onStoreChange);
  };
}

function subscribeNoop() {
  return () => {};
}

function getCurrentDateTimeLocalValue() {
  return new Date().toISOString().slice(0, 16);
}

function formatTransactionType(
  type: AdminInventoryTransactionListResult["items"][number]["type"],
  labels: Labels,
) {
  if (type === "STOCK_IN") {
    return labels.inventoryMovementPurchaseReceipt;
  }

  if (type === "STOCK_OUT") {
    return labels.inventoryMovementDamageWriteOff;
  }

  if (type === "TRANSFER") {
    return labels.transferStock;
  }

  if (type === "STOCK_COUNT") {
    return labels.stockCountTitle;
  }

  return labels.inventoryMovementManualAdjustment;
}

function getTransactionBadgeClass(
  type: AdminInventoryTransactionListResult["items"][number]["type"],
) {
  if (type === "STOCK_IN") {
    return movementTypeClass("PURCHASE_RECEIPT");
  }

  if (type === "STOCK_OUT") {
    return movementTypeClass("DAMAGE_WRITE_OFF");
  }

  if (type === "TRANSFER") {
    return movementTypeClass("TRANSFER_OUT");
  }

  if (type === "STOCK_COUNT") {
    return movementTypeClass("COUNT_ADJUSTMENT");
  }

  return movementTypeClass("MANUAL_ADJUSTMENT");
}

function summarizeStockCount(lines: AdminStockCountItem["lines"]) {
  let matched = 0;
  let positive = 0;
  let negative = 0;
  let pending = 0;
  let netDifference = 0;

  for (const line of lines) {
    const difference = line.difference ?? (
      line.countedOnHand === null ? null : line.countedOnHand - line.systemOnHand
    );

    if (difference === null) {
      pending += 1;
      continue;
    }

    netDifference += difference;

    if (difference === 0) {
      matched += 1;
    } else if (difference > 0) {
      positive += 1;
    } else {
      negative += 1;
    }
  }

  return {
    matched,
    positive,
    negative,
    pending,
    netDifference,
  };
}

export function InventoryManager({
  locale,
  result,
  transactionResult,
  warehouses,
  suppliers,
  alertResult,
  stockCounts,
  reports,
  integrationSummary,
  externalEventMonitoring,
  operationHistory,
  exportHistory,
  inventoryPreferences,
  query,
  labels,
  overviewPath,
  inventoryListPath,
  transactionListPath,
  stockCountsPath,
  warehousesPath,
  externalEventsPath,
  pageVariant = "overview",
  initialSectionGroup = "overview",
  initialSection = "inventory-reports",
}: Props) {
  const router = useRouter();
  const defaultDateTimeLocal = useSyncExternalStore(
    subscribeNoop,
    getCurrentDateTimeLocalValue,
    () => "",
  );
  const pageMeta = getInventoryPageMeta(pageVariant);
  const [activeSectionGroup, setActiveSectionGroup] = useState<InventorySectionGroupId>(initialSectionGroup);
  const [activeSection, setActiveSection] = useState<InventorySectionId>(initialSection);
  const [pendingRowKey, setPendingRowKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [drawerItem, setDrawerItem] = useState<AdminInventoryListResult["items"][number] | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);
  const [drawerMovementFilter, setDrawerMovementFilter] = useState("all");
  const [drawerDateRange, setDrawerDateRange] = useState("all");
  const [drawerMovementPage, setDrawerMovementPage] = useState(1);
  const [drawerTargetOnHand, setDrawerTargetOnHand] = useState("");
  const [drawerReorderPoint, setDrawerReorderPoint] = useState("");
  const [drawerSafetyStock, setDrawerSafetyStock] = useState("");
  const [drawerNote, setDrawerNote] = useState("");
  const [drawerMovementQuantity, setDrawerMovementQuantity] = useState("1");
  const [drawerPurchaseDocumentNumber, setDrawerPurchaseDocumentNumber] = useState("");
  const [drawerPurchaseSupplierId, setDrawerPurchaseSupplierId] = useState("");
  const [drawerPurchaseDocumentDate, setDrawerPurchaseDocumentDate] = useState("");
  const [drawerPurchaseDocumentType, setDrawerPurchaseDocumentType] = useState<"PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH">("PURCHASE_DOCUMENT");
  const [drawerPurchaseReference, setDrawerPurchaseReference] = useState("");
  const [drawerPurchaseExternalStatus, setDrawerPurchaseExternalStatus] = useState<"NOT_SENT" | "QUEUED" | "SENT" | "FAILED">("NOT_SENT");
  const [drawerPurchaseUnitCost, setDrawerPurchaseUnitCost] = useState("");
  const [drawerTransferWarehouseCode, setDrawerTransferWarehouseCode] = useState("");
  const [drawerTransferQuantity, setDrawerTransferQuantity] = useState("1");
  const [drawerTransferNote, setDrawerTransferNote] = useState("");
  const [drawerProductVariants, setDrawerProductVariants] = useState<AdminProductVariantItem[]>([]);
  const [drawerSelectedVariantId, setDrawerSelectedVariantId] = useState("");
  const [pendingDrawerVariants, setPendingDrawerVariants] = useState(false);
  const [quickActionQuery, setQuickActionQuery] = useState("");
  const [quickActionMode, setQuickActionMode] = useState<DrawerMode>("view");
  const [pendingQuickAction, setPendingQuickAction] = useState(false);
  const [quickActionResult, setQuickActionResult] = useState<AdminInventoryQuickLookupResult | null>(null);
  const [quickActionSerialModeEnabled, setQuickActionSerialModeEnabled] = useState(false);
  const quickActionCameraSupported = useSyncExternalStore(
    subscribeQuickActionCameraSupport,
    isQuickActionCameraSupported,
    () => false,
  );
  const [quickActionCameraActive, setQuickActionCameraActive] = useState(false);
  const [quickActionCameraMessage, setQuickActionCameraMessage] = useState<string | null>(null);
  const [warehouseDrawerMode, setWarehouseDrawerMode] = useState<WarehouseDrawerMode | null>(null);
  const [warehouseDraft, setWarehouseDraft] = useState<AdminWarehouseItem | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseDescription, setWarehouseDescription] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [warehouseContactName, setWarehouseContactName] = useState("");
  const [warehouseContactPhone, setWarehouseContactPhone] = useState("");
  const [warehousePriority, setWarehousePriority] = useState("100");
  const [warehouseIsActive, setWarehouseIsActive] = useState(true);
  const [warehouseIsDefault, setWarehouseIsDefault] = useState(false);
  const [pendingWarehouse, setPendingWarehouse] = useState(false);
  const [drawerRangeNow, setDrawerRangeNow] = useState<number | null>(null);
  const [transactionDrawerItem, setTransactionDrawerItem] = useState<TransactionDrawerItem | null>(null);
  const [stockCountDrawerMode, setStockCountDrawerMode] = useState<StockCountDrawerMode | null>(null);
  const [stockCountDrawerItem, setStockCountDrawerItem] = useState<AdminStockCountItem | null>(null);
  const [stockCountDrawerStep, setStockCountDrawerStep] = useState<"preparation" | "preview" | "result">("preparation");
  const [stockCountApplyResult, setStockCountApplyResult] = useState<null | {
    appliedLines: number;
    varianceLines: number;
    pendingLines: number;
    appliedAt: string;
  }>(null);
  const [stockCountWarehouseCode, setStockCountWarehouseCode] = useState("all");
  const [stockCountDate, setStockCountDate] = useState("");
  const [stockCountNote, setStockCountNote] = useState("");
  const [stockCountSearch, setStockCountSearch] = useState("");
  const [pendingStockCount, setPendingStockCount] = useState(false);
  const [pendingStockCountLineId, setPendingStockCountLineId] = useState<string | null>(null);
  const [stockCountDrafts, setStockCountDrafts] = useState<Record<string, { countedOnHand: string; note: string }>>({});
  const [bulkAdjustCsv, setBulkAdjustCsv] = useState("");
  const [bulkWarehouseCsv, setBulkWarehouseCsv] = useState("");
  const [bulkStockCountCsv, setBulkStockCountCsv] = useState("");
  const [bulkOperationPending, setBulkOperationPending] = useState<null | "adjust" | "warehouse" | "stock-count">(null);
  const [bulkOperationResult, setBulkOperationResult] = useState<BulkOperationResult | null>(null);
  const [bulkToolsExpanded, setBulkToolsExpanded] = useState(false);
  const [activeBulkToolTab, setActiveBulkToolTab] = useState<"adjust" | "warehouse" | "history">("adjust");
  const quickActionVideoRef = useRef<HTMLVideoElement | null>(null);
  const quickActionInputRef = useRef<HTMLInputElement | null>(null);
  const quickActionStreamRef = useRef<MediaStream | null>(null);
  const quickActionScanFrameRef = useRef<number | null>(null);
  const quickActionBarcodeDetectorRef = useRef<BarcodeDetectorLike | null>(null);
  const [bulkOperationHistory, setBulkOperationHistory] = useState<Array<{
    id: string;
    type: "adjust" | "warehouse" | "stock-count";
    createdAt: string;
    total: number;
    successCount: number;
    failureCount: number;
  }>>([]);
  const [inventoryListPreferences, setInventoryListPreferences] = useState<AdminInventoryListPreferences>(
    () => normalizeInventoryListPreferences(inventoryPreferences),
  );
  const inventoryPreferencesInitializedRef = useRef(false);
  const compactInventoryList = inventoryListPreferences.compactInventoryList;
  const visibleColumns = inventoryListPreferences.visibleColumns;
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const detector = (window as Window & {
      BarcodeDetector?: BarcodeDetectorConstructorLike;
    }).BarcodeDetector;

    if (quickActionCameraSupported && detector && !quickActionBarcodeDetectorRef.current) {
      quickActionBarcodeDetectorRef.current = new detector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
      });
    }
  }, [quickActionCameraSupported]);

  useEffect(() => (
    () => {
      if (quickActionScanFrameRef.current !== null) {
        cancelAnimationFrame(quickActionScanFrameRef.current);
      }

      stopMediaStream(quickActionStreamRef.current);
      quickActionStreamRef.current = null;
    }
  ), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(quickActionPreferenceKey, quickActionMode);
  }, [quickActionMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      quickActionSerialModePreferenceKey,
      quickActionSerialModeEnabled ? "1" : "0",
    );
  }, [quickActionSerialModeEnabled]);

  const bulkFailureSummary = useMemo(() => {
    if (!bulkOperationResult) {
      return [];
    }

    const grouped = new Map<string, { code: string; message: string; hint: string | null; count: number }>();

    for (const row of bulkOperationResult.rows) {
      if (row.success) {
        continue;
      }

      const key = row.code ?? row.message;
      const current = grouped.get(key);

      if (current) {
        current.count += 1;
        continue;
      }

      grouped.set(key, {
        code: row.code ?? "UNKNOWN_ERROR",
        message: row.message,
        hint: row.hint ?? null,
        count: 1,
      });
    }

    return Array.from(grouped.values()).sort((left, right) => right.count - left.count);
  }, [bulkOperationResult]);

  const warehouseOptions = useMemo(() => {
    const codes = new Set<string>();

    for (const item of result.items) {
      if (item.warehouseCode) {
        codes.add(item.warehouseCode);
      }
    }

    if (query.warehouseFilter && query.warehouseFilter !== "all") {
      codes.add(query.warehouseFilter);
    }

    return ["all", ...Array.from(codes).sort((left, right) => left.localeCompare(right))];
  }, [query.warehouseFilter, result.items]);

  const movementTypeOptions = useMemo(
    () => [
      { value: "all", label: labels.all },
      { value: "INITIAL_LOAD", label: labels.inventoryMovementInitialLoad },
      { value: "MANUAL_ADJUSTMENT", label: labels.inventoryMovementManualAdjustment },
      { value: "PURCHASE_RECEIPT", label: labels.inventoryMovementPurchaseReceipt },
      { value: "TRANSFER_OUT", label: labels.inventoryMovementTransferOut },
      { value: "TRANSFER_IN", label: labels.inventoryMovementTransferIn },
      { value: "RESERVATION_HOLD", label: labels.inventoryMovementReservationHold },
      { value: "RESERVATION_RELEASE", label: labels.inventoryMovementReservationRelease },
      { value: "ORDER_COMMIT", label: labels.inventoryMovementOrderCommit },
      { value: "ORDER_CANCEL_RESTOCK", label: labels.inventoryMovementOrderCancelRestock },
      { value: "RETURN_RESTOCK", label: labels.inventoryMovementReturnRestock },
      { value: "DAMAGE_WRITE_OFF", label: labels.inventoryMovementDamageWriteOff },
    ],
    [
      labels.all,
      labels.inventoryMovementDamageWriteOff,
      labels.inventoryMovementInitialLoad,
      labels.inventoryMovementManualAdjustment,
      labels.inventoryMovementOrderCancelRestock,
      labels.inventoryMovementOrderCommit,
      labels.inventoryMovementPurchaseReceipt,
      labels.inventoryMovementTransferIn,
      labels.inventoryMovementTransferOut,
      labels.inventoryMovementReservationHold,
      labels.inventoryMovementReservationRelease,
      labels.inventoryMovementReturnRestock,
    ],
  );

  const drawerMovements = useMemo(() => {
    if (!drawerItem) {
      return [];
    }

    const rangeStart = drawerDateRange === "24h" && drawerRangeNow
      ? drawerRangeNow - (24 * 60 * 60 * 1000)
      : drawerDateRange === "7d" && drawerRangeNow
        ? drawerRangeNow - (7 * 24 * 60 * 60 * 1000)
        : drawerDateRange === "30d" && drawerRangeNow
          ? drawerRangeNow - (30 * 24 * 60 * 60 * 1000)
          : null;

    return drawerItem.recentMovements.filter((movement) => {
      if (rangeStart && new Date(movement.createdAt).getTime() < rangeStart) {
        return false;
      }

      if (drawerMovementFilter === "all") {
        return true;
      }

      return movement.type === drawerMovementFilter;
    });
  }, [drawerDateRange, drawerItem, drawerMovementFilter, drawerRangeNow]);

  const drawerMovementPageSize = 5;
  const drawerMovementTotalPages = Math.max(1, Math.ceil(drawerMovements.length / drawerMovementPageSize));
  const drawerMovementItems = drawerMovements.slice(
    (drawerMovementPage - 1) * drawerMovementPageSize,
    drawerMovementPage * drawerMovementPageSize,
  );
  const drawerMarginEstimate = drawerItem && drawerItem.purchasePrice !== null
    ? (drawerItem.unitPrice - drawerItem.purchasePrice) * drawerItem.availableStock
    : null;
  const drawerStockCoverage = drawerItem
    ? drawerItem.availableStock <= 0
      ? "Stok tükenmiş"
      : drawerItem.availableStock <= drawerItem.safetyStock
        ? "Güvenlik stok sınırında"
        : drawerItem.availableStock <= drawerItem.reorderPoint
          ? "Yeniden sipariş eşiğinde"
          : "Sağlıklı stok seviyesinde"
    : null;
  const stockCountSummary = useMemo(
    () => summarizeStockCount(stockCountDrawerItem?.lines ?? []),
    [stockCountDrawerItem],
  );
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      inventoryListPreferenceKey,
      JSON.stringify({
        compactInventoryList,
        visibleColumns,
      }),
    );
  }, [compactInventoryList, visibleColumns]);

  useEffect(() => {
    if (!inventoryPreferencesInitializedRef.current) {
      inventoryPreferencesInitializedRef.current = true;
      return;
    }

    const controller = new AbortController();

    void fetch("/api/admin/inventory/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compactInventoryList,
        visibleColumns,
      }),
      signal: controller.signal,
    }).catch(() => {
      // Tercih kaydi basarisiz olsa da ekran davranisi bozulmasin.
    });

    return () => {
      controller.abort();
    };
  }, [compactInventoryList, visibleColumns]);

  const pageConfig = useMemo(() => {
    if (pageVariant === "transactions") {
      return {
        title: labels.transactionsTitle,
        description: labels.transactionsDescription,
        groups: ["history"] as InventorySectionGroupId[],
        sections: ["inventory-transactions"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "counts") {
      return {
        title: labels.stockCountTitle,
        description: labels.stockCountDescription,
        groups: ["operations"] as InventorySectionGroupId[],
        sections: ["inventory-counts"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "quick-actions") {
      return {
        title: labels.quickActionTitle,
        description: "Barkod, SKU ve seri operatör akışıyla hızlı stok işlemlerini tek odaklı ekranda yönet.",
        groups: ["overview"] as InventorySectionGroupId[],
        sections: ["quick-actions"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "inventory-list") {
      return {
        title: "Ürün Stokları",
        description: "Ürün bazlı stok dağılımını, filtreleri ve drawer işlemlerini odaklı bir listede yönet.",
        groups: ["operations"] as InventorySectionGroupId[],
        sections: ["inventory-list"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "warehouses") {
      return {
        title: labels.warehousesTitle,
        description: labels.warehousesDescription,
        groups: ["definitions"] as InventorySectionGroupId[],
        sections: ["inventory-warehouses"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "exports") {
      return {
        title: "Dışa Aktarım Geçmişi",
        description: "Stok ekranından alınan dışa aktarımların kim tarafından ve hangi filtrelerle üretildiğini izle.",
        groups: ["history"] as InventorySectionGroupId[],
        sections: ["inventory-exports"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    if (pageVariant === "external-events") {
      return {
        title: "Harici Stok Olayları",
        description: "Entegrasyonlardan gelen stok olaylarının uygulama, eşleme ve hata akışını izle.",
        groups: ["operations"] as InventorySectionGroupId[],
        sections: ["inventory-sync"] as InventorySectionId[],
        showSummaryCards: false,
      };
    }

    return {
      title: "Genel Bakış",
      description: "Stok operasyonlarını tek ekranda toplamak yerine, özet durumu izle ve doğru çalışma alanına geç.",
      groups: ["overview"] as InventorySectionGroupId[],
      sections: [
        "inventory-reports",
        "inventory-critical",
      ] as InventorySectionId[],
      showSummaryCards: true,
    };
  }, [
    labels.quickActionTitle,
    labels.stockCountDescription,
    labels.stockCountTitle,
    labels.transactionsDescription,
    labels.transactionsTitle,
    labels.warehousesDescription,
    labels.warehousesTitle,
    pageVariant,
  ]);

  const availableSectionGroups = useMemo(
    () => inventorySectionGroups.filter((group) => pageConfig.groups.includes(group.id)),
    [pageConfig.groups],
  );

  const activeGroupSections = useMemo(
    () => availableSectionGroups.find((group) => group.id === activeSectionGroup)?.sections
      ?? availableSectionGroups[0]?.sections
      ?? [],
    [activeSectionGroup, availableSectionGroups],
  );

  const visibleSectionIds = useMemo(
    () => new Set(pageConfig.sections),
    [pageConfig.sections],
  );

  const visibleActiveSections = useMemo(
    () => inventorySectionAnchors
      .filter((section) => visibleSectionIds.has(section.id) && (activeGroupSections as readonly string[]).includes(section.id)),
    [activeGroupSections, visibleSectionIds],
  );

  const heroStatCards = useMemo(() => {
    if (pageVariant === "overview") {
      return [
        {
          label: "Aktif Depo",
          value: String(warehouses.filter((warehouse) => warehouse.isActive).length),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Açık Sayım",
          value: String(stockCounts.filter((count) => count.status !== "APPLIED").length),
          cardClassName: "border-sky-200 bg-sky-50",
          valueClassName: "text-sky-700",
        },
        {
          label: "Bekleyen Entegrasyon",
          value: String(integrationSummary.pendingCount),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
      ];
    }

    if (pageVariant === "quick-actions") {
      return [
        {
          label: "Okuyucu Hazırlığı",
          value: quickActionCameraSupported ? "Hazır" : "Sınırlı",
          cardClassName: quickActionCameraSupported ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
          valueClassName: quickActionCameraSupported ? "text-emerald-700" : "text-amber-700",
        },
        {
          label: "Seri Operatör",
          value: quickActionSerialModeEnabled ? "Açık" : "Kapalı",
          cardClassName: quickActionSerialModeEnabled ? "border-sky-200 bg-sky-50" : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: quickActionSerialModeEnabled ? "text-sky-700" : "text-[color:var(--color-text)]",
        },
        {
          label: "Son Eşleşme",
          value: quickActionResult?.item?.sku ?? "Henüz yok",
          cardClassName: quickActionResult?.item ? "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85" : "border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80",
          valueClassName: quickActionResult?.item ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]",
        },
      ];
    }

    if (pageVariant === "inventory-list") {
      return [
        {
          label: "Toplam Kayıt",
          value: String(result.total),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Kritik Stok",
          value: String(result.summary.lowStockCount + result.summary.outOfStockCount),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
        {
          label: "Rezervasyonlu Satır",
          value: String(result.summary.rowsWithReservations),
          cardClassName: "border-cyan-200 bg-cyan-50",
          valueClassName: "text-cyan-700",
        },
      ];
    }

    if (pageVariant === "transactions") {
      const documentLinkedCount = transactionResult.items.filter((item) => item.sourceDocument.id || item.sourceDocument.number).length;
      const transferCount = transactionResult.items.filter((item) => item.type === "TRANSFER").length;
      return [
        {
          label: "Toplam İşlem",
          value: String(transactionResult.total),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Belge Bağlantılı",
          value: String(documentLinkedCount),
          cardClassName: "border-indigo-200 bg-indigo-50",
          valueClassName: "text-indigo-700",
        },
        {
          label: "Transfer İşlemi",
          value: String(transferCount),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
      ];
    }

    if (pageVariant === "counts") {
      return [
        {
          label: "Toplam Sayım",
          value: String(stockCounts.length),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Açık Sayım",
          value: String(stockCounts.filter((count) => count.status !== "APPLIED").length),
          cardClassName: "border-sky-200 bg-sky-50",
          valueClassName: "text-sky-700",
        },
        {
          label: "Varyanslı Sayım",
          value: String(stockCounts.filter((count) => count.varianceLineCount > 0).length),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
      ];
    }

    if (pageVariant === "warehouses") {
      return [
        {
          label: "Aktif Depo",
          value: String(warehouses.filter((warehouse) => warehouse.isActive).length),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Varsayılan Depo",
          value: warehouses.find((warehouse) => warehouse.isDefault)?.code ?? labels.notSpecified,
          cardClassName: "border-teal-200 bg-teal-50",
          valueClassName: "text-teal-700",
        },
        {
          label: "Toplam Depo",
          value: String(warehouses.length),
          cardClassName: "border-sky-200 bg-sky-50",
          valueClassName: "text-sky-700",
        },
      ];
    }

    if (pageVariant === "exports") {
      return [
        {
          label: "Dışa Aktarım",
          value: String(exportHistory.length),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
        {
          label: "Son Oluşturan",
          value: exportHistory[0]?.actorLabel ?? labels.notSpecified,
          cardClassName: "border-emerald-200 bg-emerald-50",
          valueClassName: "text-emerald-700",
        },
        {
          label: "Filtreli Kayıt",
          value: String(exportHistory.filter((item) => item.hasFilters).length),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
      ];
    }

    if (pageVariant === "external-events") {
      return [
        {
          label: "Hatalı Olay",
          value: String(externalEventMonitoring.failedCount),
          cardClassName: "border-rose-200 bg-rose-50",
          valueClassName: "text-rose-700",
        },
        {
          label: "Çözülmemiş",
          value: String(externalEventMonitoring.unresolvedCount),
          cardClassName: "border-amber-200 bg-amber-50",
          valueClassName: "text-amber-700",
        },
        {
          label: "Bekleyen İş",
          value: String(integrationSummary.pendingCount),
          cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
          valueClassName: "text-[color:var(--color-text)]",
        },
      ];
    }

    return [
      {
        label: labels.totalProducts,
        value: String(result.summary.totalProducts),
        cardClassName: "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85",
        valueClassName: "text-[color:var(--color-text)]",
      },
      {
        label: labels.lowStockCount,
        value: String(result.summary.lowStockCount),
        cardClassName: "border-amber-200 bg-amber-50",
        valueClassName: "text-amber-700",
      },
      {
        label: labels.outOfStockCount,
        value: String(result.summary.outOfStockCount),
        cardClassName: "border-rose-200 bg-rose-50",
        valueClassName: "text-rose-700",
      },
    ];
  }, [
    labels.lowStockCount,
    labels.notSpecified,
    labels.outOfStockCount,
    labels.totalProducts,
    exportHistory,
    externalEventMonitoring.failedCount,
    externalEventMonitoring.unresolvedCount,
    integrationSummary.pendingCount,
    pageVariant,
    quickActionCameraSupported,
    quickActionResult,
    quickActionSerialModeEnabled,
    result.total,
    result.summary.rowsWithReservations,
    result.summary.lowStockCount,
    result.summary.outOfStockCount,
    result.summary.totalProducts,
    stockCounts,
    transactionResult.items,
    transactionResult.total,
    warehouses,
  ]);

  function createOverviewParams() {
    const params = new URLSearchParams();

    if (query.search) {
      params.set("search", query.search);
    }
    if (query.stockStatusFilter && query.stockStatusFilter !== "all") {
      params.set("stockStatusFilter", query.stockStatusFilter);
    }
    if (query.reservationFilter && query.reservationFilter !== "all") {
      params.set("reservationFilter", query.reservationFilter);
    }
    if (query.warehouseFilter && query.warehouseFilter !== "all") {
      params.set("warehouseFilter", query.warehouseFilter);
    }
    if (query.movementTypeFilter && query.movementTypeFilter !== "all") {
      params.set("movementTypeFilter", query.movementTypeFilter);
    }
    if (query.transactionSearch) {
      params.set("transactionSearch", query.transactionSearch);
    }
    if (query.transactionType && query.transactionType !== "all") {
      params.set("transactionType", query.transactionType);
    }
    if (query.transactionWarehouse && query.transactionWarehouse !== "all") {
      params.set("transactionWarehouse", query.transactionWarehouse);
    }
    if (query.transactionSku) {
      params.set("transactionSku", query.transactionSku);
    }
    if (query.transactionStartDate) {
      params.set("transactionStartDate", query.transactionStartDate);
    }
    if (query.transactionEndDate) {
      params.set("transactionEndDate", query.transactionEndDate);
    }
    if (query.transactionPage && query.transactionPage !== "1") {
      params.set("transactionPage", query.transactionPage);
    }

    return params;
  }

  function getOverviewHref(overrides?: {
    reportPeriodDays?: string;
    reportComparePrevious?: string;
    reportCostingMethod?: string;
    reportCategoryFilter?: string;
    reportProductTypeFilter?: string;
    reportWarehouseFilter?: string;
    reportStockStatusFilter?: string;
    reportReservationFilter?: string;
    reportMovementTypeFilter?: string;
  }) {
    const params = createOverviewParams();
    const periodDays = overrides?.reportPeriodDays ?? query.reportPeriodDays;
    const comparePrevious = overrides?.reportComparePrevious ?? query.reportComparePrevious;
    const costingMethod = overrides?.reportCostingMethod ?? query.reportCostingMethod;
    const categoryFilter = overrides?.reportCategoryFilter ?? query.reportCategoryFilter;
    const productTypeFilter = overrides?.reportProductTypeFilter ?? query.reportProductTypeFilter;
    const warehouseFilter = overrides?.reportWarehouseFilter ?? query.reportWarehouseFilter;
    const stockStatusFilter = overrides?.reportStockStatusFilter ?? query.reportStockStatusFilter;
    const reservationFilter = overrides?.reportReservationFilter ?? query.reportReservationFilter;
    const movementTypeFilter = overrides?.reportMovementTypeFilter ?? query.reportMovementTypeFilter;

    if (periodDays && periodDays !== "30") {
      params.set("reportPeriodDays", periodDays);
    }
    if (comparePrevious === "0") {
      params.set("reportComparePrevious", "0");
    }
    if (costingMethod && costingMethod !== "AVERAGE_COST") {
      params.set("reportCostingMethod", costingMethod);
    }
    if (categoryFilter && categoryFilter !== "all") {
      params.set("reportCategoryFilter", categoryFilter);
    }
    if (productTypeFilter && productTypeFilter !== "all") {
      params.set("reportProductTypeFilter", productTypeFilter);
    }
    if (warehouseFilter && warehouseFilter !== "all") {
      params.set("reportWarehouseFilter", warehouseFilter);
    }
    if (stockStatusFilter && stockStatusFilter !== "all") {
      params.set("reportStockStatusFilter", stockStatusFilter);
    }
    if (reservationFilter && reservationFilter !== "all") {
      params.set("reportReservationFilter", reservationFilter);
    }
    if (movementTypeFilter && movementTypeFilter !== "all") {
      params.set("reportMovementTypeFilter", movementTypeFilter);
    }

    const qs = params.toString();
    return qs ? `${overviewPath}?${qs}` : overviewPath;
  }

  function getPageHref(page: number) {
    const params = createOverviewParams();
    if (query.reportPeriodDays && query.reportPeriodDays !== "30") {
      params.set("reportPeriodDays", query.reportPeriodDays);
    }
    if (query.reportComparePrevious === "0") {
      params.set("reportComparePrevious", query.reportComparePrevious);
    }
    if (query.reportCostingMethod && query.reportCostingMethod !== "AVERAGE_COST") {
      params.set("reportCostingMethod", query.reportCostingMethod);
    }
    if (query.reportCategoryFilter && query.reportCategoryFilter !== "all") {
      params.set("reportCategoryFilter", query.reportCategoryFilter);
    }
    if (query.reportProductTypeFilter && query.reportProductTypeFilter !== "all") {
      params.set("reportProductTypeFilter", query.reportProductTypeFilter);
    }
    if (query.reportWarehouseFilter && query.reportWarehouseFilter !== "all") {
      params.set("reportWarehouseFilter", query.reportWarehouseFilter);
    }
    if (query.reportStockStatusFilter && query.reportStockStatusFilter !== "all") {
      params.set("reportStockStatusFilter", query.reportStockStatusFilter);
    }
    if (query.reportReservationFilter && query.reportReservationFilter !== "all") {
      params.set("reportReservationFilter", query.reportReservationFilter);
    }
    if (query.reportMovementTypeFilter && query.reportMovementTypeFilter !== "all") {
      params.set("reportMovementTypeFilter", query.reportMovementTypeFilter);
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${inventoryListPath}?${qs}` : inventoryListPath;
  }

  function getTransactionPageHref(page: number) {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }
    if (query.stockStatusFilter && query.stockStatusFilter !== "all") {
      params.set("stockStatusFilter", query.stockStatusFilter);
    }
    if (query.reservationFilter && query.reservationFilter !== "all") {
      params.set("reservationFilter", query.reservationFilter);
    }
    if (query.warehouseFilter && query.warehouseFilter !== "all") {
      params.set("warehouseFilter", query.warehouseFilter);
    }
    if (query.movementTypeFilter && query.movementTypeFilter !== "all") {
      params.set("movementTypeFilter", query.movementTypeFilter);
    }
    if (query.transactionSearch) {
      params.set("transactionSearch", query.transactionSearch);
    }
    if (query.transactionType && query.transactionType !== "all") {
      params.set("transactionType", query.transactionType);
    }
    if (query.transactionWarehouse && query.transactionWarehouse !== "all") {
      params.set("transactionWarehouse", query.transactionWarehouse);
    }
    if (query.transactionSku) {
      params.set("transactionSku", query.transactionSku);
    }
    if (query.transactionStartDate) {
      params.set("transactionStartDate", query.transactionStartDate);
    }
    if (query.transactionEndDate) {
      params.set("transactionEndDate", query.transactionEndDate);
    }
    if (page > 1) {
      params.set("transactionPage", String(page));
    }
    const qs = params.toString();
    return qs ? `${transactionListPath}?${qs}` : transactionListPath;
  }

  function goToInventoryWithFilters(filters: {
    search?: string;
    stockStatusFilter?: "low_stock" | "out_of_stock";
    warehouseFilter?: string;
  }) {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.stockStatusFilter) {
      params.set("stockStatusFilter", filters.stockStatusFilter);
    }

    if (filters.warehouseFilter) {
      params.set("warehouseFilter", filters.warehouseFilter);
    }

    router.push(params.toString() ? `${inventoryListPath}?${params.toString()}` : inventoryListPath);
  }

  const prevPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < result.totalPages ? result.page + 1 : null;

  function getRowKey(item: AdminInventoryListResult["items"][number]) {
    return `${item.productId}:${item.warehouseCode ?? "NONE"}`;
  }

  function openDrawer(item: AdminInventoryListResult["items"][number], mode: DrawerMode, openedAt: number) {
    setDrawerItem(item);
    setDrawerMode(mode);
    setDrawerFullscreen(false);
    setDrawerMovementFilter("all");
    setDrawerDateRange("all");
    setDrawerRangeNow(openedAt);
    setDrawerMovementPage(1);
    setDrawerTargetOnHand(String(item.onHandStock));
    setDrawerReorderPoint(String(item.reorderPoint));
    setDrawerSafetyStock(String(item.safetyStock));
    setDrawerNote("");
    setDrawerMovementQuantity("1");
    setDrawerPurchaseDocumentNumber("");
    setDrawerPurchaseSupplierId("");
    setDrawerPurchaseDocumentDate("");
    setDrawerPurchaseDocumentType("PURCHASE_DOCUMENT");
    setDrawerPurchaseReference("");
    setDrawerPurchaseExternalStatus("NOT_SENT");
    setDrawerPurchaseUnitCost(item.purchasePrice !== null ? String(item.purchasePrice) : "");
    setDrawerTransferWarehouseCode("");
    setDrawerTransferQuantity("1");
    setDrawerTransferNote("");
    setDrawerProductVariants([]);
    setDrawerSelectedVariantId(item.variantId ?? "");
    setPendingDrawerVariants(false);
    setFeedback(null);
  }

  function closeDrawer() {
    if (pendingRowKey) {
      return;
    }

    setDrawerItem(null);
    setDrawerMode("view");
    setDrawerFullscreen(false);
    setDrawerMovementFilter("all");
    setDrawerDateRange("all");
    setDrawerRangeNow(null);
    setDrawerMovementPage(1);
    setDrawerTargetOnHand("");
    setDrawerReorderPoint("");
    setDrawerSafetyStock("");
    setDrawerNote("");
    setDrawerMovementQuantity("1");
    setDrawerPurchaseDocumentNumber("");
    setDrawerPurchaseSupplierId("");
    setDrawerPurchaseDocumentDate("");
    setDrawerPurchaseDocumentType("PURCHASE_DOCUMENT");
    setDrawerPurchaseReference("");
    setDrawerPurchaseExternalStatus("NOT_SENT");
    setDrawerPurchaseUnitCost("");
    setDrawerTransferWarehouseCode("");
    setDrawerTransferQuantity("1");
    setDrawerTransferNote("");
    setDrawerProductVariants([]);
    setDrawerSelectedVariantId("");
    setPendingDrawerVariants(false);
  }

  useEffect(() => {
    if (!drawerItem) {
      return;
    }

    const { productId, variantId } = drawerItem;
    let cancelled = false;

    async function loadProductVariants() {
      setPendingDrawerVariants(true);
      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: "GET",
        });

        if (!response.ok) {
          if (!cancelled) {
            setDrawerProductVariants([]);
            setDrawerSelectedVariantId(variantId ?? "");
          }
          return;
        }

        const payload = await response.json() as {
          item?: {
            variants?: AdminProductVariantItem[];
          };
        };
        const variants = payload.item?.variants ?? [];

        if (cancelled) {
          return;
        }

        setDrawerProductVariants(variants);
        const defaultVariantId = variantId
          ?? variants.find((variant) => variant.isDefault)?.id
          ?? variants[0]?.id
          ?? "";
        setDrawerSelectedVariantId(defaultVariantId);
      } catch {
        if (!cancelled) {
          setDrawerProductVariants([]);
          setDrawerSelectedVariantId(variantId ?? "");
        }
      } finally {
        if (!cancelled) {
          setPendingDrawerVariants(false);
        }
      }
    }

    void loadProductVariants();

    return () => {
      cancelled = true;
    };
  }, [drawerItem]);

  const selectedDrawerVariant = useMemo(
    () => drawerProductVariants.find((variant) => variant.id === drawerSelectedVariantId) ?? null,
    [drawerProductVariants, drawerSelectedVariantId],
  );

  useEffect(() => {
    if (!drawerItem) {
      return;
    }

    if (selectedDrawerVariant) {
      setDrawerPurchaseUnitCost(
        selectedDrawerVariant.purchasePriceOverride !== null && selectedDrawerVariant.purchasePriceOverride !== undefined
          ? String(selectedDrawerVariant.purchasePriceOverride)
          : drawerItem.purchasePrice !== null
            ? String(drawerItem.purchasePrice)
            : "",
      );
      return;
    }

    setDrawerPurchaseUnitCost(drawerItem.purchasePrice !== null ? String(drawerItem.purchasePrice) : "");
  }, [drawerItem, selectedDrawerVariant]);

  async function submitQuickActionLookup(overrideQuery?: string) {
    const normalizedQuery = (overrideQuery ?? quickActionQuery).trim();
    if (!normalizedQuery) {
      setFeedback({ type: "error", message: labels.quickActionNoMatch });
      setQuickActionResult(null);
      return;
    }

    setPendingQuickAction(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/inventory/quick-lookup?query=${encodeURIComponent(normalizedQuery)}`, {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setFeedback({ type: "error", message: payload?.message ?? labels.quickActionNoMatch });
        setQuickActionResult(null);
        return;
      }

      const payload = await response.json() as AdminInventoryQuickLookupResult;
      setQuickActionResult(payload);
      if (!payload.item) {
        setFeedback({ type: "error", message: labels.quickActionNoMatch });
        return;
      }

      openDrawer(payload.item, quickActionMode, performance.now());
      setFeedback({
        type: "success",
        message: `${labels.quickActionOpen}: ${payload.item.name}`,
      });
    } catch {
      setFeedback({ type: "error", message: labels.quickActionNoMatch });
      setQuickActionResult(null);
    } finally {
      setPendingQuickAction(false);
    }
  }

  function stopQuickActionCamera() {
    if (quickActionScanFrameRef.current !== null) {
      cancelAnimationFrame(quickActionScanFrameRef.current);
      quickActionScanFrameRef.current = null;
    }

    stopMediaStream(quickActionStreamRef.current);
    quickActionStreamRef.current = null;

    if (quickActionVideoRef.current) {
      quickActionVideoRef.current.srcObject = null;
    }

    setQuickActionCameraActive(false);
  }

  function updateQuickActionMode(mode: DrawerMode) {
    setQuickActionMode(mode);
  }

  async function startQuickActionCamera() {
    if (!quickActionCameraSupported) {
      setQuickActionCameraMessage(labels.quickActionCameraUnsupported);
      return;
    }

    try {
      setQuickActionCameraMessage(labels.quickActionCameraReady);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      quickActionStreamRef.current = stream;
      setQuickActionCameraActive(true);

      if (quickActionVideoRef.current) {
        quickActionVideoRef.current.srcObject = stream;
        await quickActionVideoRef.current.play();
      }

      const scanFrame = async () => {
        const video = quickActionVideoRef.current;
        const detector = quickActionBarcodeDetectorRef.current;

        if (!video || !detector || video.readyState < 2) {
          quickActionScanFrameRef.current = requestAnimationFrame(() => {
            void scanFrame();
          });
          return;
        }

        try {
          const detections = await detector.detect(video);
          const firstValue = detections.find((item) => item.rawValue?.trim())?.rawValue?.trim();

      if (firstValue) {
            setQuickActionQuery(firstValue);
            setQuickActionCameraMessage(`${labels.quickActionCameraReady}: ${firstValue}`);
            stopQuickActionCamera();
            void submitQuickActionLookup(firstValue);
            return;
          }
        } catch {
          setQuickActionCameraMessage(labels.quickActionCameraUnsupported);
          stopQuickActionCamera();
          return;
        }

        quickActionScanFrameRef.current = requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      quickActionScanFrameRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch {
      setQuickActionCameraMessage(labels.quickActionCameraDenied);
      stopQuickActionCamera();
    }
  }

  function updateDrawerDateRange(value: string, timestamp: number) {
    setDrawerDateRange(value);
    setDrawerRangeNow(timestamp);
    setDrawerMovementPage(1);
  }

  function openWarehouseDrawer(mode: WarehouseDrawerMode, warehouse?: AdminWarehouseItem) {
    setWarehouseDrawerMode(mode);
    setWarehouseDraft(warehouse ?? null);
    setWarehouseCode(warehouse?.code ?? "");
    setWarehouseName(warehouse?.name ?? "");
    setWarehouseDescription(warehouse?.description ?? "");
    setWarehouseAddress(warehouse?.address ?? "");
    setWarehouseContactName(warehouse?.contactName ?? "");
    setWarehouseContactPhone(warehouse?.contactPhone ?? "");
    setWarehousePriority(String(warehouse?.priority ?? 100));
    setWarehouseIsActive(warehouse?.isActive ?? true);
    setWarehouseIsDefault(warehouse?.isDefault ?? false);
    setFeedback(null);
  }

  function closeWarehouseDrawer() {
    if (pendingWarehouse) {
      return;
    }

    setWarehouseDrawerMode(null);
    setWarehouseDraft(null);
    setWarehouseCode("");
    setWarehouseName("");
    setWarehouseDescription("");
    setWarehouseAddress("");
    setWarehouseContactName("");
    setWarehouseContactPhone("");
    setWarehousePriority("100");
    setWarehouseIsActive(true);
    setWarehouseIsDefault(false);
  }

  function openTransactionDrawer(item: TransactionDrawerItem) {
    setTransactionDrawerItem(item);
  }

  function closeTransactionDrawer() {
    setTransactionDrawerItem(null);
  }

  function openStockCountDrawer(mode: StockCountDrawerMode, item?: AdminStockCountItem) {
    setStockCountDrawerMode(mode);
    setStockCountDrawerItem(item ?? null);
    setStockCountDrawerStep(mode === "create" ? "preparation" : "preview");
    setStockCountApplyResult(null);
    setStockCountWarehouseCode(item?.warehouseCode ?? "all");
    setStockCountDate((item?.countedAt ?? new Date().toISOString()).slice(0, 16));
    setStockCountNote(item?.note ?? "");
    setStockCountSearch("");
    setStockCountDrafts(
      item
        ? Object.fromEntries(item.lines.map((line) => [line.id, {
            countedOnHand: line.countedOnHand === null ? "" : String(line.countedOnHand),
            note: line.note ?? "",
          }]))
        : {},
    );
    setFeedback(null);
  }

  function closeStockCountDrawer() {
    if (pendingStockCount || pendingStockCountLineId) {
      return;
    }

    setStockCountDrawerMode(null);
    setStockCountDrawerItem(null);
    setStockCountDrawerStep("preparation");
    setStockCountApplyResult(null);
    setStockCountWarehouseCode("all");
    setStockCountDate("");
    setStockCountNote("");
    setStockCountSearch("");
    setStockCountDrafts({});
    setBulkStockCountCsv("");
  }

  function setStockCountLineDraft(lineId: string, field: "countedOnHand" | "note", value: string) {
    setStockCountDrafts((current) => ({
      ...current,
      [lineId]: {
        countedOnHand: current[lineId]?.countedOnHand ?? "",
        note: current[lineId]?.note ?? "",
        [field]: value,
      },
    }));
  }

  function viewAllHistoryInList() {
    if (!drawerItem) {
      return;
    }

    const params = new URLSearchParams();
    params.set("search", drawerItem.sku);

    if (drawerItem.warehouseCode) {
      params.set("warehouseFilter", drawerItem.warehouseCode);
    }

    if (drawerMovementFilter !== "all") {
      params.set("movementTypeFilter", drawerMovementFilter);
    }

    router.push(`${transactionListPath}?${params.toString()}`);
    closeDrawer();
  }

  function startStockCountFromDrawer() {
    if (!drawerItem) {
      return;
    }

    openStockCountDrawer("create");
    setStockCountWarehouseCode(drawerItem.warehouseCode ?? "all");
    setStockCountSearch(drawerItem.sku);
    setStockCountNote(`${drawerItem.name} için ürün kartından başlatıldı.`);
  }

  async function exportVisibleRowsCsv() {
    const exportedAt = new Date().toISOString();
    const header = [
      "productName",
      "slug",
      "sku",
      "warehouseCode",
      "onHandStock",
      "reservedStock",
      "availableStock",
      "stockStatus",
      "reorderPoint",
      "safetyStock",
      "preferredSalesWarehouseCode",
      "preferredPurchaseWarehouseCode",
      "lastMovementType",
      "lastMovementAt",
      "recentMovements",
    ];

    const rows = result.items.map((item) => {
      const movementSummary = item.recentMovements
        .map((movement) => `${movement.type}:${movement.quantity}:${movement.note ?? ""}:${movement.createdAt}`)
        .join(" | ");

      return [
        item.name,
        item.slug,
        item.sku,
        item.warehouseCode ?? "",
        String(item.onHandStock),
        String(item.reservedStock),
        String(item.availableStock),
        item.stockStatus,
        String(item.reorderPoint),
        String(item.safetyStock),
        item.preferredSalesWarehouseCode ?? "",
        item.preferredPurchaseWarehouseCode ?? "",
        item.lastMovementType ?? "",
        item.lastMovementAt ?? "",
        movementSummary,
      ];
    });

    const metadataRows: string[][] = [
      ["meta", "exportedAt", exportedAt],
      ["meta", "search", query.search || "all"],
      ["meta", "stockStatusFilter", query.stockStatusFilter || "all"],
      ["meta", "reservationFilter", query.reservationFilter || "all"],
      ["meta", "warehouseFilter", query.warehouseFilter || "all"],
      ["meta", "movementTypeFilter", query.movementTypeFilter || "all"],
      ["meta", "page", String(result.page)],
      ["meta", "pageSize", String(result.pageSize)],
      ["meta", "visibleRows", String(result.items.length)],
      ["meta", "totalFilteredRows", String(result.total)],
    ];

    const serializeRows = (tableRows: Array<Array<string>>) => tableRows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const allRows = [
      serializeRows(metadataRows),
      "",
      serializeRows([header, ...rows]),
    ].join("\n");

    try {
      await fetch("/api/admin/inventory/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          total: result.items.length,
          filters: {
            search: query.search || null,
            stockStatusFilter: query.stockStatusFilter || "all",
            reservationFilter: query.reservationFilter || "all",
            warehouseFilter: query.warehouseFilter || "all",
            movementTypeFilter: query.movementTypeFilter || "all",
          },
        }),
      });
    } catch {
      // Export kaydi basarisiz olsa da dosya indirme akisi devam eder.
    }

    const blob = new Blob([allRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inventory-${exportedAt.slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function applyAdjustmentFromDrawer() {
    if (!drawerItem) {
      return;
    }
    const activeSku = selectedDrawerVariant?.sku ?? drawerItem.sku;

    const targetOnHandStock = Number(drawerTargetOnHand);
    const reorderPoint = Number(drawerReorderPoint);
    const safetyStock = Number(drawerSafetyStock);
    if (!Number.isInteger(targetOnHandStock) || targetOnHandStock < 0) {
      setFeedback({ type: "error", message: labels.adjustmentFailed });
      return;
    }
    if (!Number.isInteger(reorderPoint) || reorderPoint < 0 || !Number.isInteger(safetyStock) || safetyStock < 0) {
      setFeedback({ type: "error", message: labels.adjustmentFailed });
      return;
    }

    const rowKey = getRowKey(drawerItem);
    setPendingRowKey(rowKey);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: drawerItem.productId,
          variantId: selectedDrawerVariant?.id ?? undefined,
          sku: activeSku,
          warehouseCode: drawerItem.warehouseCode ?? undefined,
          targetOnHandStock,
          reorderPoint,
          safetyStock,
          note: drawerNote.trim() || "Stok yöneticisi manuel stok düzeltmesi",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setFeedback({ type: "error", message: payload?.message ?? labels.adjustmentFailed });
        return;
      }

      setFeedback({ type: "success", message: labels.adjustmentSaved });
      closeDrawer();
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.adjustmentFailed });
    } finally {
      setPendingRowKey(null);
    }
  }

  async function applyTransferFromDrawer() {
    if (!drawerItem || !drawerItem.warehouseCode) {
      return;
    }
    const activeSku = selectedDrawerVariant?.sku ?? drawerItem.sku;

    const quantity = Number(drawerTransferQuantity);
    if (!drawerTransferWarehouseCode.trim() || !Number.isInteger(quantity) || quantity <= 0) {
      setFeedback({ type: "error", message: labels.transferFailed });
      return;
    }

    const rowKey = getRowKey(drawerItem);
    setPendingRowKey(rowKey);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/inventory/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: drawerItem.productId,
          variantId: selectedDrawerVariant?.id ?? undefined,
          sku: activeSku,
          fromWarehouseCode: drawerItem.warehouseCode,
          toWarehouseCode: drawerTransferWarehouseCode,
          quantity,
          note: drawerTransferNote.trim() || "Stok yöneticisi depo transferi",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setFeedback({ type: "error", message: payload?.message ?? labels.transferFailed });
        return;
      }

      setFeedback({ type: "success", message: labels.transferSaved });
      closeDrawer();
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.transferFailed });
    } finally {
      setPendingRowKey(null);
    }
  }

  async function applyMovementFromDrawer(mode: "stock_in" | "stock_out") {
    if (!drawerItem || !drawerItem.warehouseCode) {
      return;
    }
    const activeSku = selectedDrawerVariant?.sku ?? drawerItem.sku;

    const quantity = Number(drawerMovementQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFeedback({ type: "error", message: mode === "stock_in" ? labels.stockInFailed : labels.stockOutFailed });
      return;
    }

    const rowKey = getRowKey(drawerItem);
    setPendingRowKey(rowKey);
    setFeedback(null);

    try {
      const endpoint = mode === "stock_in" ? "/api/admin/inventory/stock-in" : "/api/admin/inventory/stock-out";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: drawerItem.productId,
          variantId: selectedDrawerVariant?.id ?? undefined,
          sku: activeSku,
          warehouseCode: drawerItem.warehouseCode,
          quantity,
          note: drawerNote.trim() || (mode === "stock_in" ? "Stok yöneticisi stok girişi" : "Stok yöneticisi stok çıkışı"),
          ...(mode === "stock_in" && drawerPurchaseDocumentNumber.trim()
            ? {
                documentType: drawerPurchaseDocumentType,
                sourceDocumentNumber: drawerPurchaseDocumentNumber.trim(),
                sourceDocumentSupplierId: drawerPurchaseSupplierId || undefined,
                sourceDocumentDate: drawerPurchaseDocumentDate ? new Date(drawerPurchaseDocumentDate).toISOString() : undefined,
                sourceDocumentReference: drawerPurchaseReference.trim() || undefined,
                externalSystemStatus: drawerPurchaseExternalStatus,
                unitCost: drawerPurchaseUnitCost.trim() ? Number(drawerPurchaseUnitCost) : null,
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setFeedback({ type: "error", message: payload?.message ?? (mode === "stock_in" ? labels.stockInFailed : labels.stockOutFailed) });
        return;
      }

      setFeedback({ type: "success", message: mode === "stock_in" ? labels.stockInSaved : labels.stockOutSaved });
      closeDrawer();
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: mode === "stock_in" ? labels.stockInFailed : labels.stockOutFailed });
    } finally {
      setPendingRowKey(null);
    }
  }

  async function saveWarehouse() {
    if (!warehouseCode.trim() || !warehouseName.trim()) {
      setFeedback({ type: "error", message: labels.warehouseSaveFailed });
      return;
    }

    setPendingWarehouse(true);
    setFeedback(null);

    try {
      const response = await fetch(
        warehouseDrawerMode === "edit" && warehouseDraft
          ? `/api/admin/warehouses/${warehouseDraft.id}`
          : "/api/admin/warehouses",
        {
          method: warehouseDrawerMode === "edit" ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: warehouseCode.trim().toUpperCase(),
            name: warehouseName.trim(),
            description: warehouseDescription.trim() || null,
            address: warehouseAddress.trim() || null,
            contactName: warehouseContactName.trim() || null,
            contactPhone: warehouseContactPhone.trim() || null,
            priority: Number(warehousePriority || "100"),
            isActive: warehouseIsActive,
            isDefault: warehouseIsDefault,
          }),
        },
      );

      if (!response.ok) {
        setFeedback({ type: "error", message: labels.warehouseSaveFailed });
        return;
      }

      setFeedback({ type: "success", message: labels.warehouseSaved });
      closeWarehouseDrawer();
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.warehouseSaveFailed });
    } finally {
      setPendingWarehouse(false);
    }
  }

  async function createStockCount() {
    if (!stockCountDate) {
      setFeedback({ type: "error", message: labels.stockCountSaveFailed });
      return;
    }

    setPendingStockCount(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/inventory/stock-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouseCode: stockCountWarehouseCode === "all" ? null : stockCountWarehouseCode,
          countedAt: new Date(stockCountDate).toISOString(),
          note: stockCountNote.trim() || null,
          search: stockCountSearch.trim() || null,
        }),
      });

      if (!response.ok) {
        setFeedback({ type: "error", message: labels.stockCountSaveFailed });
        return;
      }

      setPendingStockCount(false);
      setFeedback({ type: "success", message: labels.stockCountSaved });
      closeStockCountDrawer();
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.stockCountSaveFailed });
    } finally {
      setPendingStockCount(false);
    }
  }

  async function saveStockCountLine(lineId: string) {
    if (!stockCountDrawerItem) {
      return;
    }

    const draft = stockCountDrafts[lineId];
    const countedOnHand = Number(draft?.countedOnHand ?? "");
    if (!Number.isInteger(countedOnHand) || countedOnHand < 0) {
      setFeedback({ type: "error", message: labels.stockCountLineSaveFailed });
      return;
    }

    setPendingStockCountLineId(lineId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/inventory/stock-counts/${stockCountDrawerItem.id}/lines/${lineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countedOnHand,
          note: draft?.note?.trim() || null,
        }),
      });

      if (!response.ok) {
        setFeedback({ type: "error", message: labels.stockCountLineSaveFailed });
        return;
      }

      setFeedback({ type: "success", message: labels.stockCountLineSaved });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.stockCountLineSaveFailed });
    } finally {
      setPendingStockCountLineId(null);
    }
  }

  async function applyStockCount() {
    if (!stockCountDrawerItem) {
      return;
    }

    setPendingStockCount(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/inventory/stock-counts/${stockCountDrawerItem.id}/apply`, {
        method: "POST",
      });

      if (!response.ok) {
        setFeedback({ type: "error", message: labels.stockCountApplyFailed });
        return;
      }

      setPendingStockCount(false);
      setFeedback({ type: "success", message: labels.stockCountApplied });
      setStockCountApplyResult({
        appliedLines: stockCountDrawerItem.lineCount,
        varianceLines: stockCountDrawerItem.varianceLineCount,
        pendingLines: stockCountSummary.pending,
        appliedAt: new Date().toISOString(),
      });
      setStockCountDrawerStep("result");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: labels.stockCountApplyFailed });
    } finally {
      setPendingStockCount(false);
    }
  }

  async function submitBulkOperation(type: "adjust" | "warehouse" | "stock-count") {
    const csv = type === "adjust" ? bulkAdjustCsv : type === "warehouse" ? bulkWarehouseCsv : bulkStockCountCsv;

    if (!csv.trim()) {
      setFeedback({ type: "error", message: "Toplu islem verisi bos olamaz." });
      return;
    }

    if (type === "stock-count" && !stockCountDrawerItem) {
      setFeedback({ type: "error", message: "Toplu sayim islemi icin bir sayim fisis acilmis olmali." });
      return;
    }

    setBulkOperationPending(type);
    setBulkOperationResult(null);
    setFeedback(null);

    try {
      const endpoint = type === "adjust"
        ? "/api/admin/inventory/bulk-adjust"
        : type === "warehouse"
          ? "/api/admin/inventory/bulk-assign-warehouse"
          : `/api/admin/inventory/stock-counts/${stockCountDrawerItem?.id}/bulk-lines`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csv }),
      });

      const payload = (await response.json().catch(() => null)) as (BulkOperationResult & { message?: string }) | null;
      if (!response.ok) {
        setFeedback({ type: "error", message: payload?.message ?? "Toplu islem basarisiz oldu." });
        return;
      }

      setBulkOperationResult(payload);
      setBulkOperationHistory((current) => [
        {
          id: `${type}-${Date.now()}`,
          type,
          createdAt: new Date().toISOString(),
          total: payload?.total ?? 0,
          successCount: payload?.successCount ?? 0,
          failureCount: payload?.failureCount ?? 0,
        },
        ...current,
      ].slice(0, 8));
      setFeedback({ type: "success", message: "Toplu islem tamamlandi." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Toplu islem basarisiz oldu." });
    } finally {
      setBulkOperationPending(null);
    }
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function downloadBulkTemplate(type: "adjust" | "warehouse" | "stock-count") {
    const content = type === "adjust"
      ? "SKU,DEPO_KODU,HEDEF_STOK,MIN_STOK,GUVENLIK_STOK,NOT\nSKU-001,MAIN,45,10,5,Sezon duzeltmesi"
      : type === "warehouse"
        ? "SKU,TERCIH_EDILEN_SATIS_DEPOSU\nSKU-001,MAIN"
        : "SKU,DEPO_KODU,SAYILAN_STOK,NOT\nSKU-001,MAIN,42,Raf sayimi";

    const filename = type === "adjust"
      ? "toplu-stok-guncelleme-sablonu.csv"
      : type === "warehouse"
        ? "tercihli-depo-sablonu.csv"
        : "stok-sayim-sablonu.csv";

    downloadTextFile(filename, content);
  }

  function toggleVisibleColumn(column: InventoryListColumn) {
    setInventoryListPreferences((current) => ({
      ...current,
      visibleColumns: {
        ...current.visibleColumns,
        [column]: !current.visibleColumns[column],
      },
    }));
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-gradient-to-b from-[color:var(--color-bg-soft)] to-[color:var(--color-surface)] shadow-sm">
      <div className={`border-b border-[color:var(--color-border)] bg-[radial-gradient(circle_at_top_right,_rgba(14,116,144,0.15),_transparent_55%),radial-gradient(circle_at_left,_rgba(245,158,11,0.10),_transparent_45%),linear-gradient(135deg,var(--color-surface),var(--color-bg-soft))] p-6`}>
        <div className={`rounded-3xl border border-[color:var(--color-border)] bg-gradient-to-r ${pageMeta.accentClass} p-5`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">{pageConfig.title}</h2>
                <p className="mt-2 max-w-3xl text-sm text-[color:var(--color-text-muted)]">{pageConfig.description}</p>
              </div>
              {heroStatCards.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {heroStatCards.map((card) => (
                    <article key={card.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${card.cardClassName}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{card.label}</p>
                      <p className={`mt-1 text-sm font-semibold ${card.valueClassName}`}>{card.value}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {pageConfig.showSummaryCards ? (
        <div className="grid gap-4 border-b border-[color:var(--color-border)] p-5 md:grid-cols-2 xl:grid-cols-6">
          <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.totalProducts}</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">{result.summary.totalProducts}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.lowStockCount}</p>
            <p className="mt-2 text-lg font-semibold text-amber-700">{result.summary.lowStockCount}</p>
          </article>
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.outOfStockCount}</p>
            <p className="mt-2 text-lg font-semibold text-rose-700">{result.summary.outOfStockCount}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.totalAvailableStock}</p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">{result.summary.totalAvailableStock}</p>
          </article>
          <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.totalReservedStock}</p>
            <p className="mt-2 text-lg font-semibold text-cyan-700">{result.summary.totalReservedStock}</p>
          </article>
          <article className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.rowsWithReservations}</p>
            <p className="mt-2 text-lg font-semibold text-orange-700">{result.summary.rowsWithReservations}</p>
          </article>
        </div>
      ) : null}

      {pageVariant === "overview" ? (
        <div className="border-b border-[color:var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-soft),var(--color-surface))] p-5">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Operasyon Merkezleri</p>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">İşine göre doğru çalışma alanını aç</h3>
                  <p className="text-sm text-[color:var(--color-text-muted)]">Genel bakış sadece yönetsel özet ve doğru operasyon ekranına geçiş için kullanılır. Aşağıdaki alanlardan doğrudan ilgili çalışma sayfasını aç.</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Link href={`${overviewPath}/quick-actions`} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100">
                    <p className="text-sm font-semibold text-neutral-900">Hızlı Barkod İşlemleri</p>
                    <p className="mt-1 text-sm text-neutral-500">Stok girişi, çıkışı, transfer ve seri operatör akışı.</p>
                  </Link>
                  <Link href={`${overviewPath}/products`} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 transition hover:bg-sky-100">
                    <p className="text-sm font-semibold text-neutral-900">Ürün Stokları</p>
                    <p className="mt-1 text-sm text-neutral-500">Filtrele, karşılaştır ve ürün kartını drawer ile yönet.</p>
                  </Link>
                  <Link href={transactionListPath} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 transition hover:bg-indigo-100">
                    <p className="text-sm font-semibold text-neutral-900">İşlemler</p>
                    <p className="mt-1 text-sm text-neutral-500">Hareket geçmişi, belge bağlantıları ve işlem detayları.</p>
                  </Link>
                  <Link href={stockCountsPath} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100">
                    <p className="text-sm font-semibold text-neutral-900">Sayımlar</p>
                    <p className="mt-1 text-sm text-neutral-500">Açık sayımları takip et, farkları uygula.</p>
                  </Link>
                  <Link href={warehousesPath} className="rounded-2xl border border-teal-200 bg-teal-50 p-4 transition hover:bg-teal-100">
                    <p className="text-sm font-semibold text-neutral-900">Depolar</p>
                    <p className="mt-1 text-sm text-neutral-500">Depo tanımları, öncelik ve varsayılan depo ayarları.</p>
                  </Link>
                  <Link href={externalEventsPath} className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 transition hover:bg-fuchsia-100">
                    <p className="text-sm font-semibold text-neutral-900">Harici Stok Olayları</p>
                    <p className="mt-1 text-sm text-neutral-500">Entegrasyon olay akışı, eşleme durumu ve hatalı kayıtları izle.</p>
                  </Link>
                </div>
              </section>

              <section className="rounded-3xl border border-[color:var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-soft),var(--color-surface))] p-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Hızlı Başlat</p>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">En sık yapılan işleri doğrudan başlat</h3>
                  <p className="text-sm text-[color:var(--color-text-muted)]">Operasyon ekranlarını aramadan en yaygın aksiyonlara tek tıkla geç.</p>
                </div>
                <div className="mt-4 grid gap-3">
                  <Link href={`${overviewPath}/quick-actions`} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 transition hover:bg-[color:var(--color-bg-soft)]">
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">Barkod ile hızlı işlem</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Mobilden veya masaüstünden ürünü bulup hızlı stok hareketi başlat.</p>
                  </Link>
                  <Link href={stockCountsPath} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 transition hover:bg-[color:var(--color-bg-soft)]">
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">Yeni sayım başlat</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Açık sayımları takip et veya yeni bir depo sayımı oluştur.</p>
                  </Link>
                  <Link href={transactionListPath} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 transition hover:bg-[color:var(--color-bg-soft)]">
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">İşlem geçmişini incele</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Belge bağlantılı hareketleri ve stok akışını doğrula.</p>
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Yönetim Özeti</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-medium text-[color:var(--color-text-muted)]">Toplam aktif depo</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{warehouses.filter((warehouse) => warehouse.isActive).length}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[color:var(--color-text-muted)]">Açık sayım</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCounts.filter((count) => count.status !== "APPLIED").length}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[color:var(--color-text-muted)]">Hatalı harici event</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{externalEventMonitoring.failedCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[color:var(--color-text-muted)]">Bekleyen entegrasyon işi</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{integrationSummary.pendingCount}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Bugün Öncelikli</p>
                <h3 className="text-lg font-semibold text-[color:var(--color-text)]">İlk bakılması gereken başlıklar</h3>
                <p className="text-sm text-[color:var(--color-text-muted)]">Ekrana ilk girişte operasyon sırasını buradan belirleyebilirsin.</p>
              </div>
              <div className="mt-4 grid gap-3">
                <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-neutral-900">Kritik stok uyarıları</p>
                  <p className="mt-1 text-sm text-neutral-500">{alertResult.summary.activeCount} aktif uyarı var. Düşük ve tükenen ürünleri önceliklendir.</p>
                </article>
                <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-neutral-900">Açık sayımlar</p>
                  <p className="mt-1 text-sm text-neutral-500">{stockCounts.filter((count) => count.status !== "APPLIED").length} sayım henüz kapanmadı.</p>
                </article>
                <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-neutral-900">Harici stok hataları</p>
                  <p className="mt-1 text-sm text-neutral-500">{externalEventMonitoring.failedCount} hatalı event, {externalEventMonitoring.unresolvedCount} çözülmemiş kayıt bulunuyor.</p>
                </article>
                <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">Entegrasyon kuyruğu</p>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{integrationSummary.pendingCount} bekleyen, {integrationSummary.processingCount} işlenen stok entegrasyon işi var.</p>
                </article>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 p-5 backdrop-blur">
        <div className="flex flex-col gap-3">
          {availableSectionGroups.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {availableSectionGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionGroup(group.id);
                    setActiveSection(group.sections[0]);
                  }}
                  className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                    activeSectionGroup === group.id
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          ) : null}
          {visibleActiveSections.length > 1 ? (
            <div className="sticky top-0 z-20 -mx-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
              <div className="flex min-w-max gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 p-2 shadow-sm backdrop-blur">
                {visibleActiveSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                        activeSection === section.id
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                      }`}
                    >
                      {labels[section.key]}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pageVariant === "overview" ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-[color:var(--color-border)] bg-[linear-gradient(180deg,var(--color-surface),var(--color-bg-soft))] p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Yönetsel İzleme</p>
              <h3 className="text-lg font-semibold text-[color:var(--color-text)]">Önce durumu izle, sonra aksiyona geç</h3>
              <p className="text-sm text-[color:var(--color-text-muted)]">Bu bölüm yalnızca karar özeti içindir. Detaylı tablo ve operasyon ekranlarına gerektiğinde alt sayfalardan geç.</p>
            </div>

            <div id="inventory-reports" className={getSectionPanelClass(activeSection, "inventory-reports")}>
              <InventoryReportsPanel
                labels={labels}
                locale={locale}
                reports={reports}
                stockCounts={stockCounts}
                activePeriodDays={query.reportPeriodDays}
                onPeriodChange={(value) => router.push(getOverviewHref({ reportPeriodDays: value }))}
                onReviewLowStock={() => goToInventoryWithFilters({ stockStatusFilter: "low_stock" })}
                onReviewSlowMoving={(sku) => goToInventoryWithFilters({ search: sku })}
                onStartStockCount={() => router.push(stockCountsPath)}
                formatDate={formatDate}
              />
            </div>

            <div id="inventory-critical" className={getSectionPanelClass(activeSection, "inventory-critical")}>
              <InventoryCriticalPanel
                labels={labels}
                locale={locale}
                alertResult={alertResult}
                formatDate={formatDate}
                alertTypeLabel={alertTypeLabel}
              />
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <article className="rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700">Operasyon İzleme</p>
                    <h4 className="mt-2 text-base font-semibold text-[color:var(--color-text)]">Harici stok olayları</h4>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Hata, eşleme ve projection detayları için özel ekrana geç.</p>
                  </div>
                  <Link
                    href={externalEventsPath}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-fuchsia-300 bg-[color:var(--color-surface)] px-4 text-sm font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
                  >
                    Ekranı aç
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Başarısız olay</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{externalEventMonitoring.failedCount}</p>
                  </article>
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Çözülmemiş kayıt</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{externalEventMonitoring.unresolvedCount}</p>
                  </article>
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Bekleyen iş</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{integrationSummary.pendingCount}</p>
                  </article>
                </div>
              </article>

              <article className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Kayıt ve Çıktı</p>
                    <h4 className="mt-2 text-base font-semibold text-[color:var(--color-text)]">Dışa aktarım geçmişi</h4>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">CSV geçmişini, kullanıcıyı ve kapsamı ayrı ekranda izle.</p>
                  </div>
                  <Link
                    href={`${overviewPath}/exports`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-300 bg-[color:var(--color-surface)] px-4 text-sm font-medium text-sky-800 transition hover:bg-sky-100"
                  >
                    Geçmişi aç
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Toplam kayıt</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{exportHistory.length}</p>
                  </article>
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Filtreli çıktı</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{exportHistory.filter((item) => item.hasFilters).length}</p>
                  </article>
                  <article className="rounded-2xl border border-white/70 bg-[color:var(--color-surface)]/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Son kullanıcı</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{exportHistory[0]?.actorLabel ?? labels.notSpecified}</p>
                  </article>
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Operasyon Alanları</p>
              <h3 className="text-lg font-semibold text-[color:var(--color-text)]">Günlük stok işlemlerini buradan yürüt</h3>
              <p className="text-sm text-[color:var(--color-text-muted)]">Hızlı işlem, sayım, depo ve hareket yönetimi için operasyonel çalışma alanları aşağıda sıralanır.</p>
            </div>

            <div id="quick-actions" className={getSectionPanelClass(activeSection, "quick-actions")}>
              <InventoryQuickActionsPanel
                labels={labels}
                quickActionMode={quickActionMode}
                onQuickActionModeChange={updateQuickActionMode}
                quickActionInputRef={quickActionInputRef}
                quickActionQuery={quickActionQuery}
                onQuickActionQueryChange={setQuickActionQuery}
                pendingQuickAction={pendingQuickAction}
                onQuickActionLookup={() => submitQuickActionLookup()}
                quickActionCameraSupported={quickActionCameraSupported}
                quickActionCameraActive={quickActionCameraActive}
                onQuickActionCameraToggle={() => {
                  if (quickActionCameraActive) {
                    stopQuickActionCamera();
                    return;
                  }

                  return startQuickActionCamera();
                }}
                quickActionVideoRef={quickActionVideoRef}
                quickActionCameraMessage={quickActionCameraMessage}
                quickActionSerialModeEnabled={quickActionSerialModeEnabled}
                onQuickActionSerialModeChange={setQuickActionSerialModeEnabled}
                quickActionResult={quickActionResult}
              />
            </div>

            <div id="inventory-counts" className={getSectionPanelClass(activeSection, "inventory-counts")}>
              <InventoryCountsPanel
                labels={labels}
                locale={locale}
                stockCounts={stockCounts}
                formatDate={formatDate}
                stockCountStatusClass={stockCountStatusClass}
                stockCountStatusLabel={(status) => stockCountStatusLabel(status, labels)}
                onOpenStockCountDrawer={openStockCountDrawer}
              />
            </div>

            <div id="inventory-warehouses" className={getSectionPanelClass(activeSection, "inventory-warehouses")}>
              <InventoryWarehousesPanel
                labels={labels}
                warehouses={warehouses}
                onFocusWarehouse={(warehouseCode) => goToInventoryWithFilters({ warehouseFilter: warehouseCode })}
                onOpenWarehouseDrawer={openWarehouseDrawer}
              />
            </div>

            <div id="inventory-transactions" className={getSectionPanelClass(activeSection, "inventory-transactions")}>
              <InventoryTransactionsPanel
                labels={labels}
                locale={locale}
                query={query}
                warehouses={warehouses}
                transactionResult={transactionResult}
                formatDate={formatDate}
                formatInventoryNote={formatInventoryNote}
                formatSourceDocument={formatSourceDocument}
                formatSourceDocumentMeta={formatSourceDocumentMeta}
                formatTransactionType={(type) => formatTransactionType(type, labels)}
                getTransactionBadgeClass={getTransactionBadgeClass}
                onOpenTransactionDrawer={openTransactionDrawer}
                getTransactionPageHref={getTransactionPageHref}
              />
            </div>
          </section>
        </div>
      ) : (
        <>
          <div id="quick-actions" className={getSectionPanelClass(activeSection, "quick-actions")}>
            <InventoryQuickActionsPanel
              labels={labels}
              quickActionMode={quickActionMode}
              onQuickActionModeChange={updateQuickActionMode}
              quickActionInputRef={quickActionInputRef}
              quickActionQuery={quickActionQuery}
              onQuickActionQueryChange={setQuickActionQuery}
              pendingQuickAction={pendingQuickAction}
              onQuickActionLookup={() => submitQuickActionLookup()}
              quickActionCameraSupported={quickActionCameraSupported}
              quickActionCameraActive={quickActionCameraActive}
              onQuickActionCameraToggle={() => {
                if (quickActionCameraActive) {
                  stopQuickActionCamera();
                  return;
                }

                return startQuickActionCamera();
              }}
              quickActionVideoRef={quickActionVideoRef}
              quickActionCameraMessage={quickActionCameraMessage}
              quickActionSerialModeEnabled={quickActionSerialModeEnabled}
              onQuickActionSerialModeChange={setQuickActionSerialModeEnabled}
              quickActionResult={quickActionResult}
            />
          </div>

          <div id="inventory-reports" className={getSectionPanelClass(activeSection, "inventory-reports")}>
            <InventoryReportsPanel
              labels={labels}
              locale={locale}
              reports={reports}
              stockCounts={stockCounts}
              activePeriodDays={query.reportPeriodDays}
              onPeriodChange={(value) => router.push(getOverviewHref({ reportPeriodDays: value }))}
              onReviewLowStock={() => goToInventoryWithFilters({ stockStatusFilter: "low_stock" })}
              onReviewSlowMoving={(sku) => goToInventoryWithFilters({ search: sku })}
              onStartStockCount={() => router.push(stockCountsPath)}
              formatDate={formatDate}
            />
          </div>

          <div id="inventory-sync" className={getSectionPanelClass(activeSection, "inventory-sync")}>
            <InventorySyncPanel
              labels={labels}
              locale={locale}
              integrationSummary={integrationSummary}
              externalEventMonitoring={externalEventMonitoring}
              formatDate={formatDate}
            />
          </div>

          <div id="inventory-critical" className={getSectionPanelClass(activeSection, "inventory-critical")}>
            <InventoryCriticalPanel
              labels={labels}
              locale={locale}
              alertResult={alertResult}
              formatDate={formatDate}
              alertTypeLabel={alertTypeLabel}
            />
          </div>

          <div id="inventory-counts" className={getSectionPanelClass(activeSection, "inventory-counts")}>
            <InventoryCountsPanel
              labels={labels}
              locale={locale}
              stockCounts={stockCounts}
              formatDate={formatDate}
              stockCountStatusClass={stockCountStatusClass}
              stockCountStatusLabel={(status) => stockCountStatusLabel(status, labels)}
              onOpenStockCountDrawer={openStockCountDrawer}
            />
          </div>

          <div id="inventory-warehouses" className={getSectionPanelClass(activeSection, "inventory-warehouses")}>
            <InventoryWarehousesPanel
              labels={labels}
              warehouses={warehouses}
              onFocusWarehouse={(warehouseCode) => goToInventoryWithFilters({ warehouseFilter: warehouseCode })}
              onOpenWarehouseDrawer={openWarehouseDrawer}
            />
          </div>

          <div id="inventory-transactions" className={getSectionPanelClass(activeSection, "inventory-transactions")}>
            <InventoryTransactionsPanel
              labels={labels}
              locale={locale}
              query={query}
              warehouses={warehouses}
              transactionResult={transactionResult}
              formatDate={formatDate}
              formatInventoryNote={formatInventoryNote}
              formatSourceDocument={formatSourceDocument}
              formatSourceDocumentMeta={formatSourceDocumentMeta}
              formatTransactionType={(type) => formatTransactionType(type, labels)}
              getTransactionBadgeClass={getTransactionBadgeClass}
              onOpenTransactionDrawer={openTransactionDrawer}
              getTransactionPageHref={getTransactionPageHref}
            />
          </div>

          <div id="inventory-exports" className={getSectionPanelClass(activeSection, "inventory-exports")}>
            <InventoryExportsPanel
              labels={labels}
              locale={locale}
              exportHistory={exportHistory}
              formatDate={formatDate}
            />
          </div>
        </>
      )}

      {pageVariant === "inventory-list" ? (
        <>
      <form id="inventory-list" className={getSectionPanelClass(activeSection, "inventory-list")} aria-label="Stok listesi filtre formu">
        <div className="mb-5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Toplu İşlem Alanı</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBulkToolsExpanded((current) => !current);
                setActiveBulkToolTab("adjust");
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
            >
              {bulkToolsExpanded ? "Toplu islemleri gizle" : "Toplu islemleri ac"}
            </button>
          </div>

          {bulkToolsExpanded ? (
            <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "adjust" as const, label: "Stok Güncelleme" },
                  { id: "warehouse" as const, label: "Depo Atama" },
                  { id: "history" as const, label: "Geçmiş" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveBulkToolTab(tab.id)}
                    className={`inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition ${
                      activeBulkToolTab === tab.id
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeBulkToolTab === "adjust" ? (
                <section className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Toplu Stok Güncelleme</p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Format: `SKU,DEPO_KODU,HEDEF_STOK,MIN_STOK,GUVENLIK_STOK,NOT`</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadBulkTemplate("adjust")}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                      >
                        Şablon indir
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitBulkOperation("adjust")}
                        disabled={bulkOperationPending !== null}
                        className="h-10 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Toplu Güncelle
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={bulkAdjustCsv}
                    onChange={(event) => setBulkAdjustCsv(event.target.value)}
                    rows={7}
                    placeholder="SKU-001,MAIN,45,10,5,Sezon duzeltmesi"
                    className="mt-4 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 text-sm outline-none transition focus:border-neutral-500"
                  />
                </section>
              ) : null}

              {activeBulkToolTab === "warehouse" ? (
                <section className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Toplu Tercihli Depo Atama</p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Format: `SKU,TERCIH_EDILEN_SATIS_DEPOSU`</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadBulkTemplate("warehouse")}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                      >
                        Şablon indir
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitBulkOperation("warehouse")}
                        disabled={bulkOperationPending !== null}
                        className="h-10 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Toplu Ata
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={bulkWarehouseCsv}
                    onChange={(event) => setBulkWarehouseCsv(event.target.value)}
                    rows={7}
                    placeholder="SKU-001,MAIN"
                    className="mt-4 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 text-sm outline-none transition focus:border-neutral-500"
                  />
                </section>
              ) : null}

              {activeBulkToolTab === "history" ? (
                <section className="mt-4 space-y-4">
                  {bulkOperationHistory.length > 0 ? (
                    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Toplu İşlem Geçmişi</p>
                          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Bu oturumda çalıştırılan son toplu işlemler.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {bulkOperationHistory.map((historyItem) => (
                          <article key={historyItem.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[color:var(--color-text)]">
                                {historyItem.type === "adjust"
                                  ? "Toplu stok güncelleme"
                                  : historyItem.type === "warehouse"
                                    ? "Toplu depo atama"
                                    : "Toplu sayım güncelleme"}
                              </p>
                              <span className="text-xs text-[color:var(--color-text-muted)]">{formatDate(historyItem.createdAt, locale, labels.notSpecified)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">Başarılı: {historyItem.successCount}</span>
                              <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">Hatalı: {historyItem.failureCount}</span>
                              <span className="rounded-full bg-neutral-200 px-2 py-1 font-semibold text-neutral-900">Toplam: {historyItem.total}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {operationHistory.length > 0 ? (
                    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Kalıcı Operasyon Geçmişi</p>
                          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Inventory için özel geçmiş projeksiyonundan beslenen son stok ve depo operasyonları.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {operationHistory.map((historyItem) => (
                          <article key={historyItem.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-[color:var(--color-text)]">{historyItem.title}</p>
                                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{historyItem.summary}</p>
                              </div>
                              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                historyItem.entityType === "WAREHOUSE"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-neutral-200 text-neutral-900"
                              }`}>
                                {historyItem.entityType === "WAREHOUSE" ? "Depo" : "Stok"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--color-text-muted)]">
                              <span>{formatDate(historyItem.createdAt, locale, labels.notSpecified)}</span>
                              {historyItem.actorLabel ? <span>• {historyItem.actorLabel}</span> : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Liste Filtreleri</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                {labels.search}
              </Button>
              <Button
                type="button"
                onClick={() => router.push(`${overviewPath}/products`)}
                variant="secondary"
              >
                Filtreleri Temizle
              </Button>
              <Button
                type="button"
                onClick={() => void exportVisibleRowsCsv()}
                aria-label={labels.exportCsv}
                title={labels.exportCsv}
                variant="secondary"
              >
                <Download className="mr-2 h-5 w-5" />
                {labels.exportCsv}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.search}</span>
              <Input
                type="search"
                name="search"
                defaultValue={query.search}
                placeholder="Ürün adı, SKU veya barkod ara"
                aria-label={labels.search}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.stockFilter}</span>
              <Select name="stockStatusFilter" defaultValue={query.stockStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.stockFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.all}</SelectItem>
                  <SelectItem value="in_stock">{labels.inStock}</SelectItem>
                  <SelectItem value="low_stock">{labels.lowStock}</SelectItem>
                  <SelectItem value="out_of_stock">{labels.outOfStock}</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.reservationFilter}</span>
              <Select name="reservationFilter" defaultValue={query.reservationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.reservationFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.all}</SelectItem>
                  <SelectItem value="with_reserved">{labels.withReservations}</SelectItem>
                  <SelectItem value="without_reserved">{labels.withoutReservations}</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.warehouseFilter}</span>
              <Select name="warehouseFilter" defaultValue={query.warehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.warehouseFilter} />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((warehouseCode) => (
                    <SelectItem key={warehouseCode} value={warehouseCode}>
                      {warehouseCode === "all" ? labels.allWarehouses : warehouseCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.movementTypeFilter}</span>
              <Select name="movementTypeFilter" defaultValue={query.movementTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.movementTypeFilter} />
                </SelectTrigger>
                <SelectContent>
                  {movementTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Hızlı Kısayollar</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goToInventoryWithFilters({ stockStatusFilter: "low_stock" })}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
              >
                Düşük stokları aç
              </button>
              <button
                type="button"
                onClick={() => goToInventoryWithFilters({ stockStatusFilter: "out_of_stock" })}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-800 transition hover:bg-rose-100"
              >
                Tükenenleri aç
              </button>
              <button
                type="button"
                onClick={() => goToInventoryWithFilters({})}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-xs font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
              >
                Tüm kayıtları göster
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Liste Tercihleri</p>
            </div>
            <button
              type="button"
              onClick={() => setInventoryListPreferences((current) => ({
                ...current,
                compactInventoryList: !current.compactInventoryList,
              }))}
              className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition ${
                compactInventoryList
                  ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
              }`}
            >
              {compactInventoryList ? "Kompakt görünüm aktif" : "Kompakt görünümü etkinleştir"}
            </button>
          </div>

          <div className="mt-4">
            <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Görünür Bilgi Alanları</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { key: "warehouse" as const, label: "Depo alanı" },
                  { key: "stock" as const, label: "Stok özeti" },
                  { key: "movement" as const, label: "Hareket alanı" },
                  { key: "reservation" as const, label: "Rezervasyon bilgisi" },
                  { key: "preference" as const, label: "Tercihli depo bilgisi" },
                ].map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => toggleVisibleColumn(column.key)}
                    className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                      visibleColumns[column.key]
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                    }`}
                  >
                    {column.label}
                  </button>
                ))}
              </div>
            </article>
          </div>
        </div>
      </form>

      <InventoryListResultsPanel
        labels={labels}
        locale={locale}
        result={result}
        compactInventoryList={compactInventoryList}
        visibleColumns={visibleColumns}
        bulkOperationResult={bulkOperationResult}
        bulkFailureSummary={bulkFailureSummary}
        feedback={feedback}
        formatDate={formatDate}
        formatProductType={formatProductType}
        formatUnitType={formatUnitType}
        statusClass={statusClass}
        statusLabel={(status, inventoryLabels) => statusLabel(status, inventoryLabels as Labels)}
        movementTypeClass={movementTypeClass}
        movementTypeLabel={(movementType, inventoryLabels) => movementTypeLabel(movementType, inventoryLabels as Labels)}
        getRowKey={getRowKey}
        getPageHref={getPageHref}
        prevPage={prevPage}
        nextPage={nextPage}
        onOpenDrawer={(item, timestamp) => openDrawer(item, "view", timestamp)}
      />
        </>
      ) : null}

      {drawerItem ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.adjustStock} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl ${drawerFullscreen ? "max-w-none" : "max-w-[1040px]"}`}>
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">Stok Karti</h3>
                <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.drawerInfo}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDrawerFullscreen((prev) => !prev)}
                  disabled={Boolean(pendingRowKey)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                  aria-label={drawerFullscreen ? "Daralt" : "Tam ekran"}
                  title={drawerFullscreen ? "Daralt" : "Tam ekran"}
                >
                  {drawerFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={Boolean(pendingRowKey)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                  aria-label="Kapat"
                  title="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-5">
                <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Hızlı Aksiyonlar</p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Ürünü inceledikten sonra en sık yapılan işlemleri buradan başlat.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerMode("stock_in")}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
                      >
                        {labels.stockIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerMode("stock_out")}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-800 transition hover:bg-rose-100"
                      >
                        {labels.stockOut}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerMode("transfer")}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                      >
                        {labels.transferStock}
                      </button>
                      <button
                        type="button"
                        onClick={startStockCountFromDrawer}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-800 transition hover:bg-sky-100"
                      >
                        {labels.startStockCount}
                      </button>
                      <button
                        type="button"
                        onClick={viewAllHistoryInList}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                      >
                        {labels.viewAllHistory}
                      </button>
                    </div>
                  </div>
                </section>

                <InventoryDrawerOverviewPanel
                  item={drawerItem}
                  labels={labels}
                  locale={locale}
                  drawerStockCoverage={drawerStockCoverage}
                  drawerMarginEstimate={drawerMarginEstimate}
                  formatCurrency={formatCurrency}
                  formatProductType={formatProductType}
                  formatUnitType={formatUnitType}
                  statusClass={statusClass}
                  statusLabel={(status, inventoryLabels) => statusLabel(status, inventoryLabels as Labels)}
                />

                <InventoryDrawerDistributionPanel item={drawerItem} />

                <InventoryDrawerMovementsPanel
                  item={{ ...drawerItem, recentMovements: drawerMovementItems }}
                  labels={labels}
                  locale={locale}
                  drawerDateRange={drawerDateRange}
                  drawerMovementFilter={drawerMovementFilter}
                  drawerMovementPage={drawerMovementPage}
                  drawerMovementTotalPages={drawerMovementTotalPages}
                  movementTypeOptions={movementTypeOptions}
                  formatDate={formatDate}
                  formatInventoryNote={formatInventoryNote}
                  formatSourceDocument={formatSourceDocument}
                  movementTypeClass={movementTypeClass}
                  movementTypeLabel={(movementType, inventoryLabels) => movementTypeLabel(movementType, inventoryLabels as Labels)}
                  onDateRangeChange={updateDrawerDateRange}
                  onMovementFilterChange={(value) => {
                    setDrawerMovementFilter(value);
                    setDrawerMovementPage(1);
                  }}
                  onMovementPageChange={setDrawerMovementPage}
                  onViewAllHistory={viewAllHistoryInList}
                />
              </div>

              <InventoryDrawerOperationPanel
                item={drawerItem}
                labels={labels}
                locale={locale}
                warehouses={warehouses}
                suppliers={suppliers}
                drawerMode={drawerMode}
                pendingRowKey={pendingRowKey}
                drawerTargetOnHand={drawerTargetOnHand}
                drawerReorderPoint={drawerReorderPoint}
                drawerSafetyStock={drawerSafetyStock}
                drawerNote={drawerNote}
                drawerMovementQuantity={drawerMovementQuantity}
                drawerTransferWarehouseCode={drawerTransferWarehouseCode}
                drawerTransferQuantity={drawerTransferQuantity}
                drawerTransferNote={drawerTransferNote}
                drawerPurchaseDocumentNumber={drawerPurchaseDocumentNumber}
                drawerPurchaseSupplierId={drawerPurchaseSupplierId}
                drawerPurchaseDocumentDate={drawerPurchaseDocumentDate || defaultDateTimeLocal}
                drawerPurchaseDocumentType={drawerPurchaseDocumentType}
                drawerPurchaseReference={drawerPurchaseReference}
                drawerPurchaseExternalStatus={drawerPurchaseExternalStatus}
                drawerPurchaseUnitCost={drawerPurchaseUnitCost}
                drawerProductVariants={drawerProductVariants}
                drawerSelectedVariantId={drawerSelectedVariantId}
                pendingDrawerVariants={pendingDrawerVariants}
                setDrawerMode={setDrawerMode}
                setDrawerTargetOnHand={setDrawerTargetOnHand}
                setDrawerReorderPoint={setDrawerReorderPoint}
                setDrawerSafetyStock={setDrawerSafetyStock}
                setDrawerNote={setDrawerNote}
                setDrawerMovementQuantity={setDrawerMovementQuantity}
                setDrawerTransferWarehouseCode={setDrawerTransferWarehouseCode}
                setDrawerTransferQuantity={setDrawerTransferQuantity}
                setDrawerTransferNote={setDrawerTransferNote}
                setDrawerPurchaseDocumentNumber={setDrawerPurchaseDocumentNumber}
                setDrawerPurchaseSupplierId={setDrawerPurchaseSupplierId}
                setDrawerPurchaseDocumentDate={setDrawerPurchaseDocumentDate}
                setDrawerPurchaseDocumentType={setDrawerPurchaseDocumentType}
                setDrawerPurchaseReference={setDrawerPurchaseReference}
                setDrawerPurchaseExternalStatus={setDrawerPurchaseExternalStatus}
                setDrawerPurchaseUnitCost={setDrawerPurchaseUnitCost}
                setDrawerSelectedVariantId={setDrawerSelectedVariantId}
                formatDate={formatDate}
                formatInventoryNote={formatInventoryNote}
                formatSourceDocument={formatSourceDocument}
                movementTypeClass={movementTypeClass}
                movementTypeLabel={(movementType, inventoryLabels) => movementTypeLabel(movementType, inventoryLabels as Labels)}
                onHistoryShortcut={(value) => {
                  setDrawerMovementFilter(value);
                  setDrawerMovementPage(1);
                  viewAllHistoryInList();
                }}
                onViewAllHistory={viewAllHistoryInList}
                onApplyAdjustment={applyAdjustmentFromDrawer}
                onApplyMovement={applyMovementFromDrawer}
                onApplyTransfer={applyTransferFromDrawer}
              />
            </div>
          </aside>
        </div>
      ) : null}

      {warehouseDrawerMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-neutral-950/35">
          <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.warehousesTitle}</p>
                <h3 className="mt-1 text-xl font-semibold text-[color:var(--color-text)]">
                  {warehouseDrawerMode === "create" ? labels.createWarehouse : labels.editWarehouse}
                </h3>
              </div>
              <Button type="button" onClick={closeWarehouseDrawer} variant="secondary" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseCode}</label>
                <Input
                  value={warehouseCode}
                  onChange={(event) => setWarehouseCode(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseName}</label>
                <Input
                  value={warehouseName}
                  onChange={(event) => setWarehouseName(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseDescription}</label>
                <Textarea
                  value={warehouseDescription}
                  onChange={(event) => setWarehouseDescription(event.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseAddress}</label>
                <Textarea
                  value={warehouseAddress}
                  onChange={(event) => setWarehouseAddress(event.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseContactName}</label>
                  <Input
                    value={warehouseContactName}
                    onChange={(event) => setWarehouseContactName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehouseContactPhone}</label>
                  <Input
                    value={warehouseContactPhone}
                    onChange={(event) => setWarehouseContactPhone(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.warehousePriority}</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={warehousePriority}
                  onChange={(event) => setWarehousePriority(event.target.value)}
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                <input type="checkbox" checked={warehouseIsActive} onChange={(event) => setWarehouseIsActive(event.target.checked)} />
                {labels.active}
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                <input type="checkbox" checked={warehouseIsDefault} onChange={(event) => setWarehouseIsDefault(event.target.checked)} />
                {labels.defaultLabel}
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-5 py-4">
              <Button type="button" onClick={closeWarehouseDrawer} variant="secondary">
                {labels.prev}
              </Button>
              <Button
                type="button"
                disabled={pendingWarehouse}
                onClick={saveWarehouse}
              >
                {labels.saveWarehouse}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {stockCountDrawerMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-neutral-950/35">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.stockCountTitle}</p>
                <h3 className="mt-1 text-xl font-semibold text-[color:var(--color-text)]">
                  {stockCountDrawerMode === "create" ? labels.createStockCount : stockCountDrawerItem?.countNumber}
                </h3>
              </div>
              <button type="button" onClick={closeStockCountDrawer} className="rounded-full border border-[color:var(--color-border)] p-2 text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg-soft)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {stockCountDrawerMode === "create" ? (
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.stockCountWarehouseScope}</label>
                    <Select value={stockCountWarehouseCode} onValueChange={setStockCountWarehouseCode}>
                      <SelectTrigger>
                        <SelectValue placeholder={labels.stockCountWarehouseScope} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{labels.allWarehouses}</SelectItem>
                        {warehouses.filter((warehouse) => warehouse.isActive).map((warehouse) => (
                          <SelectItem key={`count-create-${warehouse.id}`} value={warehouse.code}>
                            {warehouse.code} - {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.stockCountDate}</label>
                    <Input
                      type="datetime-local"
                      value={stockCountDate || defaultDateTimeLocal}
                      onChange={(event) => setStockCountDate(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.stockCountSearch}</label>
                  <Input
                    value={stockCountSearch}
                    onChange={(event) => setStockCountSearch(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">{labels.stockCountNote}</label>
                  <Textarea
                    value={stockCountNote}
                    onChange={(event) => setStockCountNote(event.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            ) : stockCountDrawerItem ? (
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4 md:grid-cols-3">
                {[
                  { id: "preparation" as const, label: "Hazırlık", description: "Sayım bağlamı ve özet" },
                  { id: "preview" as const, label: "Fark Önizleme", description: "Varyans ve rezervasyon etkisi" },
                  { id: "result" as const, label: "Uygulama Sonucu", description: "İşlem sonrası çıktı" },
                ].map((step, index) => {
                  const isActive = stockCountDrawerStep === step.id;
                  const isDone = stockCountDrawerStep === "result" && step.id !== "result";

                  return (
                    <article
                      key={step.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        isActive
                          ? "border-neutral-900 bg-[color:var(--color-surface)]"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-neutral-900 text-white"
                            : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-neutral-200 text-neutral-500"
                        }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--color-text)]">{step.label}</p>
                          <p className="text-xs text-[color:var(--color-text-muted)]">{step.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountWarehouseScope}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountDrawerItem.warehouseCode ?? labels.allWarehouses}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                    <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountDate}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{formatDate(stockCountDrawerItem.countedAt, locale, labels.notSpecified)}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                    <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountLineCount}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountDrawerItem.lineCount}</p>
                  </div>
                <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountVarianceCount}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountDrawerItem.varianceLineCount}</p>
                </div>
              </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Eşleşen satır</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-900">{stockCountSummary.matched}</p>
                  </article>
                  <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Fazla sayım</p>
                    <p className="mt-1 text-lg font-semibold text-sky-900">{stockCountSummary.positive}</p>
                  </article>
                  <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Eksik sayım</p>
                    <p className="mt-1 text-lg font-semibold text-rose-900">{stockCountSummary.negative}</p>
                  </article>
                  <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Bekleyen satır</p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">{stockCountSummary.pending}</p>
                  </article>
                  <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Net fark</p>
                    <p className={`mt-1 text-lg font-semibold ${stockCountSummary.netDifference >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                      {stockCountSummary.netDifference >= 0 ? `+${stockCountSummary.netDifference}` : stockCountSummary.netDifference}
                    </p>
                  </article>
                </div>

                <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountNote}</p>
                      <p className="mt-1 text-sm text-[color:var(--color-text)]">{stockCountDrawerItem.note ?? labels.notSpecified}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${stockCountStatusClass(stockCountDrawerItem.status)}`}>
                      {stockCountStatusLabel(stockCountDrawerItem.status, labels)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {stockCountDrawerStep === "preparation" ? (
                    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Hazırlık Özeti</p>
                          <p className="mt-1 text-sm text-[color:var(--color-text)]">Sayım kapsamını, notlarını ve genel fark dağılımını doğrula. Sonraki adımda sadece sorunlu satırları odaklı incele.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStockCountDrawerStep("preview")}
                          className="h-10 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
                        >
                          Fark Önizleme
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {stockCountDrawerStep === "preview" ? (
                    <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Varyanslı Satırlar</p>
                        <p className="mt-2 text-sm text-[color:var(--color-text)]">
                          {stockCountDrawerItem.varianceLineCount > 0
                            ? `${stockCountDrawerItem.varianceLineCount} satır sistem stoktan farklı. Önce bu satırları gözden geçir.`
                            : "Varyanslı satır bulunmuyor. Sayım sistemle uyumlu görünüyor."}
                        </p>
                      </article>
                      <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Rezervasyon Etkisi</p>
                        <p className="mt-2 text-sm text-[color:var(--color-text)]">
                          Rezervasyon baskısı olan ürünlerde sayım uygulaması öncesi kullanılabilir stok ve açık sipariş etkisini ayrıca doğrula.
                        </p>
                      </article>
                      <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm lg:col-span-2">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Uygulama Özeti</p>
                            <p className="mt-1 text-sm text-[color:var(--color-text)]">
                              Uygulama sırasında farklı satırlar için stok hareketi üretilir, bekleyen satırlar ise son kontrol gerektirir.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void applyStockCount()}
                            disabled={pendingStockCount || stockCountDrawerItem.status === "APPLIED"}
                            className="h-10 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {labels.stockCountApply}
                          </button>
                        </div>
                      </article>
                    </section>
                  ) : null}

                  {stockCountDrawerItem.status !== "APPLIED" ? (
                    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Toplu Sayım Satırı Güncelleme</p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Format: `SKU,DEPO_KODU,SAYILAN_STOK,NOT`</p>
                      </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => downloadBulkTemplate("stock-count")}
                            className="h-10 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                          >
                            Şablon indir
                          </button>
                          <button
                            type="button"
                            onClick={() => void submitBulkOperation("stock-count")}
                            disabled={bulkOperationPending !== null}
                            className="h-10 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Toplu Uygula
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={bulkStockCountCsv}
                        onChange={(event) => setBulkStockCountCsv(event.target.value)}
                        rows={5}
                        placeholder="SKU-001,MAIN,42,Raf sayimi"
                        className="mt-4 w-full rounded-2xl border border-[color:var(--color-border)] px-3 py-3 text-sm outline-none transition focus:border-neutral-500"
                      />
                    </section>
                  ) : null}

                  {stockCountDrawerItem.status !== "APPLIED" && stockCountDrawerStep !== "result" ? (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Uygulama Özeti</p>
                          <p className="mt-1 text-sm text-[color:var(--color-text)]">
                            Sayım uygulandığında farklı satırlar için stok hareketi oluşturulur ve sistem stokları sayılan değerle hizalanır.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                          <p>Farklı satır: <span className="font-semibold text-[color:var(--color-text)]">{stockCountSummary.positive + stockCountSummary.negative}</span></p>
                          <p>Bekleyen satır: <span className="font-semibold text-[color:var(--color-text)]">{stockCountSummary.pending}</span></p>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {stockCountDrawerStep === "result" && stockCountApplyResult ? (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Uygulama Sonucu</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-xl border border-emerald-200 bg-[color:var(--color-surface)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Uygulanan satır</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountApplyResult.appliedLines}</p>
                        </article>
                        <article className="rounded-xl border border-amber-200 bg-[color:var(--color-surface)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Varyanslı satır</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountApplyResult.varianceLines}</p>
                        </article>
                        <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Bekleyen satır</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{stockCountApplyResult.pendingLines}</p>
                        </article>
                        <article className="rounded-xl border border-sky-200 bg-[color:var(--color-surface)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Uygulama zamanı</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{formatDate(stockCountApplyResult.appliedAt, locale, labels.notSpecified)}</p>
                        </article>
                      </div>
                    </section>
                  ) : null}

                  {stockCountDrawerItem.lines.map((line) => {
                    const draft = stockCountDrafts[line.id] ?? {
                      countedOnHand: line.countedOnHand === null ? "" : String(line.countedOnHand),
                      note: line.note ?? "",
                    };

                    return (
                      <article key={line.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/80 p-4 shadow-sm">
                        <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))_120px]">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--color-text)]">{line.productName}</p>
                            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.sku}: {line.sku} • {line.warehouseCode}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[color:var(--color-text-muted)]">{labels.onHandStock}</p>
                            <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{line.systemOnHand}</p>
                          </div>
                          <div>
                            <label className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountCountedOnHand}</label>
                            <input
                              type="number"
                              min={0}
                              value={draft.countedOnHand}
                              onChange={(event) => setStockCountLineDraft(line.id, "countedOnHand", event.target.value)}
                              disabled={stockCountDrawerItem.status === "APPLIED"}
                              className="mt-1 h-10 w-full rounded-md border border-[color:var(--color-border)] px-2 text-sm"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountDifference}</p>
                            <p className={`mt-1 text-sm font-semibold ${(Number(draft.countedOnHand || line.countedOnHand || 0) - line.systemOnHand) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {draft.countedOnHand === "" && line.countedOnHand === null
                                ? labels.notSpecified
                                : Number(draft.countedOnHand || line.countedOnHand || 0) - line.systemOnHand}
                            </p>
                          </div>
                          <div className="lg:col-span-2">
                            <label className="text-xs text-[color:var(--color-text-muted)]">{labels.stockCountNote}</label>
                            <textarea
                              value={draft.note}
                              onChange={(event) => setStockCountLineDraft(line.id, "note", event.target.value)}
                              disabled={stockCountDrawerItem.status === "APPLIED"}
                              rows={2}
                              className="mt-1 w-full rounded-md border border-[color:var(--color-border)] px-2 py-2 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => void saveStockCountLine(line.id)}
                              disabled={pendingStockCountLineId === line.id || stockCountDrawerItem.status === "APPLIED"}
                              className="h-10 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {labels.stockCountEditLine}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-5 py-4">
              <button type="button" onClick={closeStockCountDrawer} className="h-11 rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]">
                {labels.prev}
              </button>
              {stockCountDrawerMode === "create" ? (
                <button
                  type="button"
                  disabled={pendingStockCount}
                  onClick={() => void createStockCount()}
                  className="h-11 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {labels.stockCountCreateAction}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {stockCountDrawerStep !== "preparation" ? (
                    <button
                      type="button"
                      onClick={() => setStockCountDrawerStep(stockCountDrawerStep === "result" ? "preview" : "preparation")}
                      className="h-11 rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                    >
                      Geri
                    </button>
                  ) : null}
                  {stockCountDrawerStep === "preparation" ? (
                    <button
                      type="button"
                      onClick={() => setStockCountDrawerStep("preview")}
                      className="h-11 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
                    >
                      Fark Önizleme
                    </button>
                  ) : stockCountDrawerStep === "preview" ? (
                    <button
                      type="button"
                      disabled={pendingStockCount || !stockCountDrawerItem || stockCountDrawerItem.status === "APPLIED"}
                      onClick={() => void applyStockCount()}
                      className="h-11 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {labels.stockCountApply}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeStockCountDrawer}
                      className="h-11 rounded-xl border border-[color:var(--color-border)] bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
                    >
                      Tamam
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {transactionDrawerItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-neutral-950/35">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.transactionsTitle}</p>
                <h3 className="mt-1 text-xl font-semibold text-[color:var(--color-text)]">{transactionDrawerItem.transactionNumber}</h3>
              </div>
              <button type="button" onClick={closeTransactionDrawer} className="rounded-full border border-[color:var(--color-border)] p-2 text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg-soft)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <p className="text-xs text-[color:var(--color-text-muted)]">Belge</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{formatTransactionType(transactionDrawerItem.type, labels)}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.transactionCreatedAt}: {formatDate(transactionDrawerItem.createdAt, locale, labels.notSpecified)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <p className="text-xs text-[color:var(--color-text-muted)]">Harici referans</p>
                  <p className="mt-1 text-sm text-[color:var(--color-text)]">{transactionDrawerItem.reference ?? transactionDrawerItem.sourceDocument.externalReference ?? labels.notSpecified}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                <p className="text-xs text-[color:var(--color-text-muted)]">Kaynak Belge</p>
                {formatSourceDocument({
                  type: transactionDrawerItem.sourceDocument.type,
                  number: transactionDrawerItem.sourceDocument.number,
                }) ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm font-medium text-[color:var(--color-text)]">
                      {formatSourceDocument({
                        type: transactionDrawerItem.sourceDocument.type,
                        number: transactionDrawerItem.sourceDocument.number,
                      })}
                    </p>
                    {formatSourceDocumentMeta(transactionDrawerItem.sourceDocument, locale, labels.notSpecified) ? (
                      <p className="text-xs text-[color:var(--color-text-muted)]">
                        {formatSourceDocumentMeta(transactionDrawerItem.sourceDocument, locale, labels.notSpecified)}
                      </p>
                    ) : null}
                    {transactionDrawerItem.sourceDocument.url ? (
                      <Link href={`/${locale}${transactionDrawerItem.sourceDocument.url}`} className="text-xs font-medium text-[color:var(--color-text-muted)] underline decoration-neutral-300 underline-offset-4">
                        Kaynak belgeye git
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[color:var(--color-text)]">{labels.notSpecified}</p>
                )}
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                <p className="text-xs text-[color:var(--color-text-muted)]">Karşı taraf</p>
                <p className="mt-1 text-sm text-[color:var(--color-text)]">{transactionDrawerItem.sourceDocument.counterpartyName ?? labels.notSpecified}</p>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                <p className="text-xs text-[color:var(--color-text-muted)]">Dış sistem durumu</p>
                <p className="mt-1 text-sm text-[color:var(--color-text)]">{transactionDrawerItem.sourceDocument.externalSystemStatus ?? labels.notSpecified}</p>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                <h4 className="text-sm font-semibold text-[color:var(--color-text)]">{labels.transactionLines}</h4>
                <div className="mt-3 space-y-3">
                  {transactionDrawerItem.lines.map((line) => (
                    <article key={line.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--color-text)]">{line.inventoryItemName}</p>
                          {line.variantTitle ? (
                            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                              Varyant: {line.variantTitle}
                              {line.variantSku ? ` • ${line.variantSku}` : ""}
                            </p>
                          ) : null}
                          <p className="text-xs text-[color:var(--color-text-muted)]">{labels.sku}: {line.inventoryItemSku}</p>
                        </div>
                        <p className="text-sm font-semibold text-[color:var(--color-text)]">{line.quantity}</p>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-[color:var(--color-text-muted)]">
                        <p>{labels.warehouse}: {line.fromWarehouseCode ?? labels.notSpecified} {line.toWarehouseCode ? `→ ${line.toWarehouseCode}` : ""}</p>
                        {line.unitCost !== null && line.unitCost !== undefined ? (
                          <p>Birim maliyet: {formatCurrency(line.unitCost, locale)}</p>
                        ) : null}
                        {line.lineTotal !== null && line.lineTotal !== undefined ? (
                          <p>Satır toplamı: {formatCurrency(line.lineTotal, locale)}</p>
                        ) : null}
                        {line.note ? <p>{labels.adjustmentNote}: {line.note}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                <h4 className="text-sm font-semibold text-[color:var(--color-text)]">Etkilenen Depolar</h4>
                <div className="mt-3 space-y-2 text-sm text-[color:var(--color-text)]">
                  {transactionDrawerItem.lines.map((line) => (
                    <p key={`warehouse-impact-${line.id}`}>
                      {line.inventoryItemSku}: {line.fromWarehouseCode ?? labels.notSpecified}
                      {line.toWarehouseCode ? ` → ${line.toWarehouseCode}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
