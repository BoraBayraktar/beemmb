import { Prisma } from "@prisma/client";
import { z } from "zod";

import tr from "@/i18n/tr.json";
import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";
import { requireTenantId } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { integrationService } from "@/modules/integration/services/integration.service";
import type { IntegrationChannel, MarketplaceIntegrationChannel } from "@/modules/integration/contracts/integration.contract";
import type {
  AdminInventoryListPreferences,
  AdminCreateStockCountInput,
  AdminCreateWarehouseInput,
  AdminExternalStockEventItem,
  AdminExternalStockEventMonitoring,
  AdminInventoryAlertItem,
  AdminInventoryAlertSummary,
  AdminInventoryConsistencyReportItem,
  AdminInventoryExportHistoryItem,
  AdminInventoryIntegrationSummary,
  AdminInventoryIntegrationMappingItem,
  AdminInventoryItem,
  AdminInventoryListQuery,
  AdminInventoryListResult,
  AdminInventoryQuickLookupResult,
  AdminInventoryOperationHistoryItem,
  AdminInventoryReportsQuery,
  AdminInventoryReportsResult,
  AdminInventorySummary,
  AdminUpsertInventoryIntegrationMappingInput,
  AdminInventoryTransactionItem,
  AdminInventoryTransactionListQuery,
  AdminInventoryTransactionListResult,
  AdminInventoryTransactionFinanceSummary,
  AdminStockCountItem,
  AdminUpdateStockCountLineInput,
  AdminUpdateWarehouseInput,
  AdminWarehouseItem,
  BulkAssignPreferredWarehouseRowInput,
  BulkInventoryAdjustmentRowInput,
  BulkOperationResult,
  BulkStockCountLineRowInput,
  ProductInventoryAvailability,
  ReceiveExternalStockEventInput,
  ReceiveExternalStockEventResult,
  RecordProductInventoryMovementInput,
  SyncProductInventoryInput,
  TransferProductInventoryInput,
} from "@/modules/inventory/contracts/inventory.contract";
import { InventoryRepository } from "@/modules/inventory/repositories/inventory.repository";
import { notificationService } from "@/modules/system/services/notification.service";

const adminDictionary = tr.admin;

function formatNotificationMessage(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

const availabilityQuerySchema = z.object({
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    variantId: z.string().trim().min(1).optional(),
  })).min(1).max(100),
});

const syncProductInventorySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  warehouseId: z.string().trim().min(1).optional(),
  warehouseCode: z.string().trim().min(1).max(32).optional(),
  targetOnHandStock: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  safetyStock: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().min(3).max(280).optional(),
});

const upsertInventoryIntegrationMappingSchema = z.object({
  channel: z.enum(["TRENDYOL", "N11", "HEPSIBURADA"]),
  externalProductId: z.string().trim().min(1).max(120).optional().nullable(),
  externalSku: z.string().trim().min(1).max(120).optional().nullable(),
  externalWarehouseCode: z.string().trim().min(1).max(120).optional().nullable(),
  productId: z.string().trim().min(1),
  warehouseCode: z.string().trim().min(1).max(32).optional().nullable(),
  allowInboundUpdates: z.boolean().default(false),
}).refine((value) => Boolean(value.externalProductId || value.externalSku), {
  message: "Harici ürün kimliği veya harici SKU zorunludur.",
});

const receiveExternalStockEventSchema = z.object({
  channel: z.enum(["TRENDYOL", "N11", "HEPSIBURADA"]),
  eventKey: z.string().trim().min(3).max(160),
  eventType: z.enum(["SNAPSHOT_ON_HAND", "SNAPSHOT_AVAILABLE"]),
  externalProductId: z.string().trim().min(1).max(120).optional().nullable(),
  externalSku: z.string().trim().min(1).max(120).optional().nullable(),
  externalWarehouseCode: z.string().trim().min(1).max(120).optional().nullable(),
  quantity: z.coerce.number().int().min(0),
  reference: z.string().trim().min(1).max(160).optional().nullable(),
  note: z.string().trim().min(3).max(280).optional().nullable(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}).refine((value) => Boolean(value.externalProductId || value.externalSku), {
  message: "Harici ürün kimliği veya harici SKU zorunludur.",
});

const transferInventorySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  fromWarehouseCode: z.string().trim().min(1).max(32),
  toWarehouseCode: z.string().trim().min(1).max(32),
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().min(3).max(280).optional(),
});

const recordInventoryMovementSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().min(1).max(32),
  quantity: z.coerce.number().int().min(1),
  type: z.enum(["PURCHASE_RECEIPT", "DAMAGE_WRITE_OFF"]),
  note: z.string().trim().min(3).max(280).optional(),
  documentType: z.enum(["PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE", "E_DISPATCH"]).optional(),
  sourceDocumentNumber: z.string().trim().min(1).max(120).optional(),
  sourceDocumentDate: z.string().datetime().optional(),
  sourceDocumentSupplierId: z.string().trim().min(1).optional(),
  sourceDocumentSupplier: z.string().trim().min(2).max(160).optional(),
  sourceDocumentReference: z.string().trim().min(1).max(160).optional(),
  externalSystemStatus: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional(),
  unitCost: z.coerce.number().nonnegative().optional().nullable(),
}).refine((value) => {
  const wantsPurchaseDocument = Boolean(
    value.type === "PURCHASE_RECEIPT"
    && (value.documentType === undefined || value.documentType === "PURCHASE_DOCUMENT")
    && (value.sourceDocumentNumber || value.sourceDocumentSupplierId || value.sourceDocumentSupplier || value.sourceDocumentDate || value.sourceDocumentReference || value.unitCost !== undefined),
  );

  if (!wantsPurchaseDocument) {
    return true;
  }

  return Boolean(value.sourceDocumentNumber && (value.sourceDocumentSupplierId || value.sourceDocumentSupplier) && value.sourceDocumentDate);
}, {
  message: "Satın alma belgesi için belge numarası, tedarikçi ve belge tarihi zorunludur.",
});

const adminInventoryListQuerySchema = z.object({
  search: z.string().trim().optional(),
  stockStatusFilter: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).default("all"),
  reservationFilter: z.enum(["all", "with_reserved", "without_reserved"]).default("all"),
  warehouseFilter: z.string().trim().max(32).optional(),
  movementTypeFilter: z
    .enum([
      "all",
      "INITIAL_LOAD",
      "MANUAL_ADJUSTMENT",
      "PURCHASE_RECEIPT",
      "TRANSFER_OUT",
      "TRANSFER_IN",
      "RESERVATION_HOLD",
      "RESERVATION_RELEASE",
      "ORDER_COMMIT",
      "ORDER_CANCEL_RESTOCK",
      "RETURN_RESTOCK",
      "DAMAGE_WRITE_OFF",
    ])
    .default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

const inventoryPreferencesSchema = z.object({
  compactInventoryList: z.boolean(),
  visibleColumns: z.object({
    warehouse: z.boolean(),
    stock: z.boolean(),
    movement: z.boolean(),
    reservation: z.boolean(),
    preference: z.boolean(),
  }),
});

const createWarehouseSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(9999).default(100),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const adminInventoryTransactionListQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum(["all", "MANUAL_ADJUSTMENT", "STOCK_IN", "STOCK_OUT", "TRANSFER", "STOCK_COUNT"]).default("all"),
  warehouseCode: z.string().trim().max(32).optional(),
  sku: z.string().trim().max(64).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(8),
});

const adminInventoryReportsQuerySchema = z.object({
  periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  comparePreviousPeriod: z.boolean().default(true),
  costingMethod: z.enum(["AVERAGE_COST", "LAST_PURCHASE_COST"]).default("AVERAGE_COST"),
  categoryId: z.string().trim().min(1).optional(),
  productType: z.enum(["PHYSICAL", "SERVICE", "RAW_MATERIAL", "SEMI_FINISHED"]).optional(),
  warehouseCode: z.string().trim().min(1).max(32).optional(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  reservationStatus: z.enum(["with_reserved", "without_reserved"]).optional(),
  movementType: z.enum([
    "INITIAL_LOAD",
    "MANUAL_ADJUSTMENT",
    "PURCHASE_RECEIPT",
    "DAMAGE_WRITE_OFF",
    "TRANSFER_OUT",
    "TRANSFER_IN",
    "RESERVATION_HOLD",
    "RESERVATION_RELEASE",
    "ORDER_COMMIT",
    "ORDER_CANCEL_RESTOCK",
    "RETURN_RESTOCK",
  ]).optional(),
});

const createStockCountSchema = z.object({
  warehouseCode: z.string().trim().min(1).max(32).optional().nullable(),
  countedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
});

const updateStockCountLineSchema = z.object({
  stockCountId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
  countedOnHand: z.coerce.number().int().min(0),
  note: z.string().trim().max(500).optional().nullable(),
});

const bulkInventoryAdjustmentRowSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().max(32).optional(),
  targetOnHandStock: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  safetyStock: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().max(280).optional(),
});

const bulkAssignPreferredWarehouseRowSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  preferredSalesWarehouseCode: z.string().trim().min(1).max(32),
});

const bulkStockCountLineRowSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().min(1).max(32),
  countedOnHand: z.coerce.number().int().min(0),
  note: z.string().trim().max(500).optional(),
});

const updateWarehouseSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(2).max(32).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
}).refine((value) => (
  value.code !== undefined
  || value.name !== undefined
  || value.description !== undefined
  || value.address !== undefined
  || value.contactName !== undefined
  || value.contactPhone !== undefined
  || value.priority !== undefined
  || value.isActive !== undefined
  || value.isDefault !== undefined
), {
  message: "At least one warehouse field must be provided",
});

function toAvailableStock(onHandStock: number, reservedStock: number) {
  return Math.max(0, onHandStock - reservedStock);
}

function resolveAggregateAvailabilityFromLevels(
  inventoryLevels: Array<{
    onHand: number;
    reserved: number;
  }>,
  legacySummaryStock: number,
) {
  if (inventoryLevels.length === 0) {
    // Sprint 1 kuralı: Product.stock burada yalnızca aggregate oluşmamış ürünler için legacy summary fallback'tir.
    return {
      onHandStock: legacySummaryStock,
      reservedStock: 0,
      availableStock: legacySummaryStock,
      usedLegacySummaryFallback: true,
    };
  }

  const onHandStock = inventoryLevels.reduce((sum, level) => sum + level.onHand, 0);
  const reservedStock = inventoryLevels.reduce((sum, level) => sum + level.reserved, 0);

  return {
    onHandStock,
    reservedStock,
    availableStock: toAvailableStock(onHandStock, reservedStock),
    usedLegacySummaryFallback: false,
  };
}

function differenceInCalendarDays(from: Date, to: Date) {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / day));
}

function resolveInventoryReportStockStatus(level: {
  onHand: number;
  reserved: number;
  reorderPoint: number;
  safetyStock: number;
}) {
  const availableUnits = toAvailableStock(level.onHand, level.reserved);
  const threshold = Math.max(level.reorderPoint, level.safetyStock);

  if (availableUnits <= 0) {
    return "out_of_stock" as const;
  }

  if (threshold > 0 && availableUnits <= threshold) {
    return "low_stock" as const;
  }

  return "in_stock" as const;
}

function resolveInventoryUnitCost(level: {
  inventoryItem: {
    costingMethod?: "AVERAGE_COST" | "LAST_PURCHASE_COST";
    averageUnitCost?: { toNumber: () => number } | null;
    lastPurchaseUnitCost?: { toNumber: () => number } | null;
    product: {
      purchasePrice?: { toNumber: () => number } | null;
    };
  };
}) {
  // Sprint 4 kuralı: resmi maliyet otoritesi daima ağırlıklı ortalama maliyettir.
  return level.inventoryItem.averageUnitCost?.toNumber()
    ?? level.inventoryItem.lastPurchaseUnitCost?.toNumber()
    ?? level.inventoryItem.product.purchasePrice?.toNumber()
    ?? 0;
}

function resolveInventoryUnitCostByPreference(
  level: Parameters<typeof resolveInventoryUnitCost>[0],
  costingMethod: "AVERAGE_COST" | "LAST_PURCHASE_COST",
) {
  if (costingMethod === "LAST_PURCHASE_COST") {
    return level.inventoryItem.lastPurchaseUnitCost?.toNumber()
      ?? level.inventoryItem.averageUnitCost?.toNumber()
      ?? level.inventoryItem.product.purchasePrice?.toNumber()
      ?? 0;
  }

  return resolveInventoryUnitCost(level);
}

function buildBulkOperationRowError(message: string) {
  const normalized = message.toLocaleUpperCase("tr-TR");

  if (normalized.includes("ÜRÜN BULUNAMADI") || normalized.includes("URUN BULUNAMADI")) {
    return {
      code: "PRODUCT_NOT_FOUND",
      message: "Ürün bulunamadı.",
      hint: "SKU bilgisinin ürün kartındaki stok koduyla birebir aynı olduğundan emin ol.",
    };
  }

  if (normalized.includes("DEPO BULUNAMADI")) {
    return {
      code: "WAREHOUSE_NOT_FOUND",
      message: "Depo bulunamadı.",
      hint: "Depo kodunu kontrol et veya önce ilgili depoyu tanımla.",
    };
  }

  if (normalized.includes("SAYIM SATIRI BULUNAMADI")) {
    return {
      code: "COUNT_LINE_NOT_FOUND",
      message: "Sayım satırı bulunamadı.",
      hint: "Sayım fişindeki SKU ve depo kodunun aynı satırda yer aldığını kontrol et.",
    };
  }

  if (normalized.includes("INVALID") || normalized.includes("DOĞRULAMA")) {
    return {
      code: "VALIDATION_ERROR",
      message: "Satır verisi doğrulamadan geçemedi.",
      hint: "Şablon kolon sırasını koru ve sayısal alanlarda yalnızca sayı kullan.",
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message,
    hint: "Satır biçimini ve zorunlu alanları kontrol ederek işlemi tekrar çalıştır.",
  };
}

function mapMovementPreview(movement: {
  type: string;
  quantity: number;
  note: string | null;
  createdAt: Date;
  metadata?: unknown;
}) {
  const metadata = movement.metadata && typeof movement.metadata === "object" && !Array.isArray(movement.metadata)
    ? movement.metadata as Record<string, unknown>
    : null;

  const fromWarehouseCode = typeof metadata?.fromWarehouseCode === "string" ? metadata.fromWarehouseCode : null;
  const toWarehouseCode = typeof metadata?.toWarehouseCode === "string" ? metadata.toWarehouseCode : null;
  const transferReference = typeof metadata?.transferReference === "string" ? metadata.transferReference : null;
  const transactionNumber = typeof metadata?.transactionNumber === "string" ? metadata.transactionNumber : null;
  const sourceDocumentType = typeof metadata?.sourceDocumentType === "string" ? metadata.sourceDocumentType : null;
  const sourceDocumentId = typeof metadata?.sourceDocumentId === "string" ? metadata.sourceDocumentId : null;
  const sourceDocumentNumber = typeof metadata?.sourceDocumentNumber === "string" ? metadata.sourceDocumentNumber : null;
  const sourceDocumentUrl = typeof metadata?.sourceDocumentUrl === "string" ? metadata.sourceDocumentUrl : null;

  const counterpartyWarehouseCode = movement.type === "TRANSFER_OUT"
    ? toWarehouseCode
    : movement.type === "TRANSFER_IN"
      ? fromWarehouseCode
      : null;

  return {
    type: movement.type,
    quantity: movement.quantity,
    note: movement.note,
    reference: transactionNumber ?? transferReference,
    sourceDocumentType,
    sourceDocumentId,
    sourceDocumentNumber,
    sourceDocumentUrl,
    counterpartyWarehouseCode,
    createdAt: movement.createdAt.toISOString(),
  };
}

type OverviewBaseProduct = Awaited<ReturnType<InventoryRepository["listInventoryOverview"]>>[number];
type OverviewMovement = Awaited<ReturnType<InventoryRepository["listInventoryOverviewMovements"]>>[number];

function buildInventoryOverviewItems(
  products: OverviewBaseProduct[],
  movementsByInventoryItemId: Map<string, OverviewMovement[]>,
  options?: {
    includeWarehouseDistribution?: boolean;
    includeRecentMovements?: boolean;
  },
) {
  const items: AdminInventoryItem[] = [];
  const includeWarehouseDistribution = options?.includeWarehouseDistribution ?? true;
  const includeRecentMovements = options?.includeRecentMovements ?? true;

  for (const product of products) {
    const variantTargets = product.variants
      .filter((variant) => variant.inventoryItem)
      .map((variant) => ({
        variantId: variant.id,
        variantSku: variant.sku,
        variantTitle: variant.title,
        variantOptionSummary: variant.optionSummary,
        barcode: variant.barcode ?? product.barcode,
        imageUrl: variant.imageUrl ?? product.imageUrl,
        unitPrice: variant.priceOverride?.toNumber() ?? product.price.toNumber(),
        purchasePrice: variant.purchasePriceOverride?.toNumber() ?? product.purchasePrice?.toNumber() ?? null,
        compareAtPrice: variant.compareAtPriceOverride?.toNumber() ?? product.compareAtPrice?.toNumber() ?? null,
        inventoryItem: variant.inventoryItem,
      }));

    const inventoryTargets = variantTargets.length > 0
      ? variantTargets
      : [{
          variantId: null,
          variantSku: null,
          variantTitle: null,
          variantOptionSummary: null,
          barcode: product.barcode,
          imageUrl: product.imageUrl,
          unitPrice: product.price.toNumber(),
          purchasePrice: product.purchasePrice?.toNumber() ?? null,
          compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
          inventoryItem: product.inventoryItem,
        }];

    for (const target of inventoryTargets) {
      const inventoryLevels = target.inventoryItem?.inventoryLevels ?? [];
      const inventoryMovements = target.inventoryItem?.id
        ? (movementsByInventoryItemId.get(target.inventoryItem.id) ?? [])
        : [];

      if (inventoryLevels.length === 0) {
        items.push({
          productId: product.id,
          variantId: target.variantId,
          variantSku: target.variantSku,
          variantTitle: target.variantTitle,
          variantOptionSummary: target.variantOptionSummary,
          slug: product.slug,
          sku: target.variantSku ?? product.sku,
          name: product.name,
          imageUrl: target.imageUrl,
          currency: product.currency,
          barcode: target.barcode,
          unitType: product.unitType,
          productType: product.productType,
          unitPrice: target.unitPrice,
          purchasePrice: target.purchasePrice,
          compareAtPrice: target.compareAtPrice,
          onHandStock: target.variantId ? 0 : product.stock,
          reservedStock: 0,
          availableStock: target.variantId ? 0 : product.stock,
          reorderPoint: 0,
          safetyStock: 0,
          warehouseCode: null,
          warehouseName: null,
          isDefaultWarehouse: false,
          hasReservations: false,
          preferredSalesWarehouseCode: product.preferredSalesWarehouse?.code ?? null,
          preferredPurchaseWarehouseCode: product.preferredPurchaseWarehouse?.code ?? null,
          warehouseDistribution: includeWarehouseDistribution ? [] : [],
          lastMovementType: inventoryMovements[0]?.type ?? null,
          recentMovements: includeRecentMovements
            ? inventoryMovements.map((movement) => mapMovementPreview(movement))
            : [],
          stockStatus: toStockStatus(target.variantId ? 0 : product.stock),
          lastMovementAt: inventoryMovements[0]?.createdAt?.toISOString() ?? null,
        });
        continue;
      }

      for (const level of inventoryLevels) {
        const availableStock = toAvailableStock(level.onHand, level.reserved);
        const recentWarehouseMovements = inventoryMovements
          .filter((movement) => movement.warehouseId === level.warehouse.id)
          .map((movement) => mapMovementPreview(movement));
        const lastWarehouseMovement = inventoryMovements.find((movement) => movement.warehouseId === level.warehouse.id);

        items.push({
          productId: product.id,
          variantId: target.variantId,
          variantSku: target.variantSku,
          variantTitle: target.variantTitle,
          variantOptionSummary: target.variantOptionSummary,
          slug: product.slug,
          sku: target.variantSku ?? product.sku,
          name: product.name,
          imageUrl: target.imageUrl,
          currency: product.currency,
          barcode: target.barcode,
          unitType: product.unitType,
          productType: product.productType,
          unitPrice: target.unitPrice,
          purchasePrice: target.purchasePrice,
          compareAtPrice: target.compareAtPrice,
          onHandStock: level.onHand,
          reservedStock: level.reserved,
          availableStock,
          reorderPoint: level.reorderPoint,
          safetyStock: level.safetyStock,
          warehouseCode: level.warehouse.code,
          warehouseName: level.warehouse.name,
          isDefaultWarehouse: level.warehouse.isDefault,
          hasReservations: level.reserved > 0,
          preferredSalesWarehouseCode: product.preferredSalesWarehouse?.code ?? null,
          preferredPurchaseWarehouseCode: product.preferredPurchaseWarehouse?.code ?? null,
          warehouseDistribution: includeWarehouseDistribution
            ? inventoryLevels.map((distributionLevel) => ({
              warehouseCode: distributionLevel.warehouse.code,
              warehouseName: distributionLevel.warehouse.name,
              onHandStock: distributionLevel.onHand,
              reservedStock: distributionLevel.reserved,
              availableStock: toAvailableStock(distributionLevel.onHand, distributionLevel.reserved),
              isDefaultWarehouse: distributionLevel.warehouse.isDefault,
            }))
            : [],
          lastMovementType: lastWarehouseMovement?.type ?? null,
          recentMovements: includeRecentMovements ? recentWarehouseMovements : [],
          stockStatus: toStockStatus(availableStock),
          lastMovementAt: lastWarehouseMovement?.createdAt?.toISOString() ?? null,
        });
      }
    }
  }

  return items;
}

function buildInventoryOverviewSummary(items: AdminInventoryItem[]): AdminInventorySummary {
  return {
    totalProducts: items.length,
    lowStockCount: items.filter((item) => item.stockStatus === "LOW_STOCK").length,
    outOfStockCount: items.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
    totalAvailableStock: items.reduce((sum, item) => sum + item.availableStock, 0),
    totalReservedStock: items.reduce((sum, item) => sum + item.reservedStock, 0),
    rowsWithReservations: items.filter((item) => item.hasReservations).length,
  };
}

function countInventoryExportFilters(filters: AdminInventoryExportHistoryItem["filters"]) {
  return [
    filters.search,
    filters.stockStatusFilter && filters.stockStatusFilter !== "all" ? filters.stockStatusFilter : null,
    filters.reservationFilter && filters.reservationFilter !== "all" ? filters.reservationFilter : null,
    filters.warehouseFilter && filters.warehouseFilter !== "all" ? filters.warehouseFilter : null,
    filters.movementTypeFilter && filters.movementTypeFilter !== "all" ? filters.movementTypeFilter : null,
  ].filter(Boolean).length;
}

function toStockStatus(availableStock: number): AdminInventoryItem["stockStatus"] {
  if (availableStock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableStock <= 5) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

function inferInventoryTransactionSource(item: {
  type: "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  sourceDocumentNumber: string | null;
  sourceDocumentUrl: string | null;
  sourceDocumentDate: Date | null;
  externalReference: string | null;
  externalSystemStatus: string | null;
  counterpartyName: string | null;
  reference: string | null;
  purchaseReceipt?: {
    id: string;
    receiptNumber: string;
    receiptDate: Date;
    externalReference: string | null;
    supplierName: string;
  } | null;
  lines: Array<{
    inventoryItem: {
      skuSnapshot: string;
    };
  }>;
}) {
  if (item.sourceDocumentType || item.sourceDocumentNumber || item.sourceDocumentId) {
    return {
      type: item.sourceDocumentType,
      id: item.sourceDocumentId,
      number: item.sourceDocumentNumber,
      url: item.sourceDocumentUrl,
      date: item.purchaseReceipt?.receiptDate?.toISOString() ?? item.sourceDocumentDate?.toISOString() ?? null,
      externalReference: item.purchaseReceipt?.externalReference ?? item.externalReference,
      externalSystemStatus: item.externalSystemStatus,
      counterpartyName: item.purchaseReceipt?.supplierName ?? item.counterpartyName,
    };
  }

  if (item.type === "STOCK_COUNT") {
    return {
      type: "STOCK_COUNT",
      id: null,
      number: item.reference,
      url: "/admin/inventory/counts",
      date: null,
      externalReference: null,
      externalSystemStatus: null,
      counterpartyName: null,
    };
  }

  if (item.type === "TRANSFER") {
    return {
      type: "WAREHOUSE_TRANSFER",
      id: null,
      number: item.reference,
      url: "/admin/inventory/transactions",
      date: null,
      externalReference: null,
      externalSystemStatus: null,
      counterpartyName: null,
    };
  }

  if (item.type === "STOCK_IN") {
    return {
      type: "PURCHASE_RECEIPT",
      id: null,
      number: item.reference ?? item.lines[0]?.inventoryItem.skuSnapshot ?? null,
      url: null,
      date: null,
      externalReference: null,
      externalSystemStatus: null,
      counterpartyName: null,
    };
  }

  if (item.type === "STOCK_OUT") {
    return {
      type: "STOCK_WRITE_OFF",
      id: null,
      number: item.reference ?? item.lines[0]?.inventoryItem.skuSnapshot ?? null,
      url: null,
      date: null,
      externalReference: null,
      externalSystemStatus: null,
      counterpartyName: null,
    };
  }

  return {
    type: "INVENTORY_ADJUSTMENT",
    id: null,
    number: item.reference ?? item.lines[0]?.inventoryItem.skuSnapshot ?? null,
    url: null,
    date: null,
    externalReference: null,
    externalSystemStatus: null,
    counterpartyName: null,
  };
}

function mapInventoryConsistencyItem(item: {
  id: string;
  name: string;
  sku: string;
  stock: number;
  inventoryItem?: {
    inventoryLevels: Array<{
      onHand: number;
      reserved: number;
    }>;
  } | null;
}): AdminInventoryConsistencyReportItem {
  const inventoryLevels = item.inventoryItem?.inventoryLevels ?? [];
  const aggregateAvailableStock = inventoryLevels.reduce((sum, level) => sum + toAvailableStock(level.onHand, level.reserved), 0);

  return {
    productId: item.id,
    productName: item.name,
    sku: item.sku,
    legacyStock: item.stock,
    aggregateAvailableStock,
    difference: aggregateAvailableStock - item.stock,
    hasInventoryLevels: inventoryLevels.length > 0,
  };
}

function mapWarehouse(warehouse: {
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
  createdAt: Date;
  updatedAt: Date;
  _count: {
    inventoryLevels: number;
  };
}): AdminWarehouseItem {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    description: warehouse.description,
    address: warehouse.address,
    contactName: warehouse.contactName,
    contactPhone: warehouse.contactPhone,
    priority: warehouse.priority,
    isActive: warehouse.isActive,
    isDefault: warehouse.isDefault,
    levelCount: warehouse._count.inventoryLevels,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  };
}

function mapInventoryIntegrationMapping(item: {
  id: string;
  channel: IntegrationChannel;
  externalProductId: string | null;
  externalSku: string | null;
  externalWarehouseCode: string | null;
  allowInboundUpdates: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
}): AdminInventoryIntegrationMappingItem {
  if (item.channel === "EDOCS_MOCK" || item.channel === "BANK_SANDBOX") {
    throw new Error(`Unsupported inventory integration channel: ${item.channel}`);
  }

  return {
    id: item.id,
    channel: item.channel,
    externalProductId: item.externalProductId,
    externalSku: item.externalSku,
    externalWarehouseCode: item.externalWarehouseCode,
    productId: item.product.id,
    productName: item.product.name,
    productSku: item.product.sku,
    warehouseId: item.warehouse?.id ?? null,
    warehouseCode: item.warehouse?.code ?? null,
    warehouseName: item.warehouse?.name ?? null,
    allowInboundUpdates: item.allowInboundUpdates,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapExternalStockEvent(item: {
  id: string;
  channel: IntegrationChannel;
  eventKey: string;
  eventType: "SNAPSHOT_ON_HAND" | "SNAPSHOT_AVAILABLE";
  direction: "INBOUND" | "OUTBOUND";
  status: "RECEIVED" | "APPLIED" | "FAILED" | "DUPLICATE";
  externalProductId: string | null;
  externalSku: string | null;
  externalWarehouseCode: string | null;
  mappingId: string | null;
  quantity: number;
  reference: string | null;
  note: string | null;
  payload: Prisma.JsonValue | null;
  appliedOnHand: number | null;
  appliedAvailable: number | null;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
  } | null;
  warehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
}): AdminExternalStockEventItem {
  if (item.channel === "EDOCS_MOCK" || item.channel === "BANK_SANDBOX") {
    throw new Error(`Unsupported external stock event channel: ${item.channel}`);
  }

  const mappingMode = item.mappingId
    ? item.externalProductId
      ? "EXTERNAL_PRODUCT_ID"
      : item.externalSku
        ? "EXTERNAL_SKU"
        : "UNRESOLVED"
    : "UNRESOLVED";
  const warehouseResolution = item.warehouse
    ? item.externalWarehouseCode
      ? "MAPPING_WAREHOUSE"
      : "DEFAULT_WAREHOUSE"
    : "UNRESOLVED";
  const payloadSummary = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? Object.entries(item.payload)
      .slice(0, 3)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(" • ")
    : null;

  return {
    id: item.id,
    channel: item.channel,
    eventKey: item.eventKey,
    eventType: item.eventType,
    direction: item.direction,
    status: item.status,
    externalProductId: item.externalProductId,
    externalSku: item.externalSku,
    externalWarehouseCode: item.externalWarehouseCode,
    mappingId: item.mappingId,
    mappingMode,
    warehouseResolution,
    projectionStatus: item.status === "RECEIVED"
      ? "PENDING"
      : item.status,
    productId: item.product?.id ?? null,
    productName: item.product?.name ?? null,
    productSku: item.product?.sku ?? null,
    warehouseId: item.warehouse?.id ?? null,
    warehouseCode: item.warehouse?.code ?? null,
    warehouseName: item.warehouse?.name ?? null,
    quantity: item.quantity,
    reference: item.reference,
    note: item.note,
    payloadSummary,
    appliedOnHand: item.appliedOnHand,
    appliedAvailable: item.appliedAvailable,
    errorMessage: item.errorMessage,
    processedAt: item.processedAt ? item.processedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  };
}

function mapInventoryTransaction(item: {
  id: string;
  transactionNumber: string;
  type: "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
  reference: string | null;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  sourceDocumentNumber: string | null;
  sourceDocumentUrl: string | null;
  sourceDocumentDate: Date | null;
  externalReference: string | null;
  externalSystemStatus: string | null;
  counterpartyName: string | null;
  note: string | null;
  createdAt: Date;
  purchaseReceipt?: {
    id: string;
    receiptNumber: string;
    receiptDate: Date;
    externalReference: string | null;
    supplierName: string;
    lines: Array<{
      productId: string;
      productVariantId: string | null;
      unitCost: { toNumber: () => number } | null;
      lineTotal: { toNumber: () => number } | null;
    }>;
  } | null;
  lines: Array<{
    id: string;
    quantity: number;
    note: string | null;
    fromWarehouse: { code: string } | null;
    toWarehouse: { code: string } | null;
    inventoryItem: {
      skuSnapshot: string;
      product: {
        id: string;
        name: string;
      } | null;
      productVariant: {
        id: string;
        sku: string;
        title: string;
      } | null;
    };
  }>;
}): AdminInventoryTransactionItem {
  const purchaseReceiptLines = item.purchaseReceipt?.lines ?? [];

  return {
    id: item.id,
    transactionNumber: item.transactionNumber,
    type: item.type,
    reference: item.reference,
    note: item.note,
    sourceDocument: inferInventoryTransactionSource(item),
    createdAt: item.createdAt.toISOString(),
    lines: item.lines.map((line) => {
      const matchingReceiptLine = line.inventoryItem.productVariant?.id
        ? purchaseReceiptLines.find((receiptLine) => receiptLine.productVariantId === line.inventoryItem.productVariant?.id)
        : purchaseReceiptLines.find((receiptLine) => (
          receiptLine.productVariantId === null
          && receiptLine.productId === line.inventoryItem.product?.id
        ));

      return {
        id: line.id,
        quantity: line.quantity,
        note: line.note,
        fromWarehouseCode: line.fromWarehouse?.code ?? null,
        toWarehouseCode: line.toWarehouse?.code ?? null,
        inventoryItemSku: line.inventoryItem.skuSnapshot,
        inventoryItemName: line.inventoryItem.product?.name ?? line.inventoryItem.skuSnapshot,
        variantId: line.inventoryItem.productVariant?.id ?? null,
        variantSku: line.inventoryItem.productVariant?.sku ?? null,
        variantTitle: line.inventoryItem.productVariant?.title ?? null,
        unitCost: matchingReceiptLine?.unitCost?.toNumber() ?? null,
        lineTotal: matchingReceiptLine?.lineTotal?.toNumber() ?? null,
      };
    }),
  };
}

function mapInventoryAlert(item: {
  id: string;
  warehouseId: string;
  type: "LOW_STOCK" | "OUT_OF_STOCK";
  status: "ACTIVE" | "RESOLVED";
  message: string;
  createdAt: Date;
  updatedAt: Date;
  warehouse: {
    code: string;
    name: string;
  };
  inventoryItem: {
    product: {
      id: string;
      name: string;
    } | null;
    skuSnapshot: string;
    inventoryLevels: Array<{
      warehouseId: string;
      onHand: number;
      reserved: number;
      reorderPoint: number;
      safetyStock: number;
    }>;
  };
}): AdminInventoryAlertItem {
  const level = item.inventoryItem.inventoryLevels.find((entry) => entry.warehouseId === (item as { warehouseId?: string }).warehouseId)
    ?? item.inventoryItem.inventoryLevels[0];
  const availableStock = level ? toAvailableStock(level.onHand, level.reserved) : 0;

  return {
    id: item.id,
    productId: item.inventoryItem.product?.id ?? item.inventoryItem.skuSnapshot,
    sku: item.inventoryItem.skuSnapshot,
    productName: item.inventoryItem.product?.name ?? item.inventoryItem.skuSnapshot,
    warehouseCode: item.warehouse.code,
    warehouseName: item.warehouse.name,
    availableStock,
    reorderPoint: level?.reorderPoint ?? 0,
    safetyStock: level?.safetyStock ?? 0,
    type: item.type,
    status: item.status,
    message: item.message,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapStockCount(item: {
  id: string;
  countNumber: string;
  status: "DRAFT" | "COUNTED" | "APPLIED";
  countedAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  warehouse: {
    code: string;
    name: string;
  } | null;
  lines: Array<{
    id: string;
    systemOnHand: number;
    countedOnHand: number | null;
    note: string | null;
    warehouse: {
      code: string;
      name: string;
    };
    inventoryItem: {
      id: string;
      skuSnapshot: string;
      product: {
        id: string;
        name: string;
      } | null;
    };
  }>;
}): AdminStockCountItem {
  const lines = item.lines.map((line) => ({
    id: line.id,
    inventoryItemId: line.inventoryItem.id,
    productId: line.inventoryItem.product?.id ?? line.inventoryItem.id,
    sku: line.inventoryItem.skuSnapshot,
    productName: line.inventoryItem.product?.name ?? line.inventoryItem.skuSnapshot,
    warehouseCode: line.warehouse.code,
    warehouseName: line.warehouse.name,
    systemOnHand: line.systemOnHand,
    countedOnHand: line.countedOnHand,
    difference: line.countedOnHand === null ? null : line.countedOnHand - line.systemOnHand,
    note: line.note,
  }));

  return {
    id: item.id,
    countNumber: item.countNumber,
    status: item.status,
    countedAt: item.countedAt.toISOString(),
    note: item.note,
    warehouseCode: item.warehouse?.code ?? null,
    warehouseName: item.warehouse?.name ?? null,
    lineCount: lines.length,
    varianceLineCount: lines.filter((line) => line.difference !== null && line.difference !== 0).length,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lines,
  };
}

function getDefaultInventoryListPreferences(): AdminInventoryListPreferences {
  return {
    compactInventoryList: false,
    visibleColumns: {
      warehouse: true,
      stock: true,
      movement: true,
      reservation: true,
      preference: false,
    },
  };
}

async function invalidateCatalogCache() {
  await Promise.all([
    redisCache.delByPrefix("catalog:list:"),
    redisCache.delByPrefix("catalog:detail:"),
  ]);
}

async function invalidateInventoryCache() {
  const tenantId = requireTenantId();
  await Promise.all([
    redisCache.delByPrefix(buildTenantCacheKey(tenantId, "inventory", "overview")),
    redisCache.delByPrefix(buildTenantCacheKey(tenantId, "inventory", "reports")),
    redisCache.delByPrefix(buildTenantCacheKey(tenantId, "inventory", "integrations")),
    redisCache.delByPrefix(buildTenantCacheKey(tenantId, "inventory", "exports")),
  ]);
}

async function queueInventoryStockSync(args: {
  productIds: string[];
  trigger: string;
  reference: string;
  warehouseCode?: string;
}) {
  const uniqueProductIds = Array.from(new Set(args.productIds.filter((item) => item.trim().length > 0)));
  if (uniqueProductIds.length === 0) {
    return;
  }

  const channels: Array<"TRENDYOL" | "N11" | "HEPSIBURADA"> = ["TRENDYOL", "N11", "HEPSIBURADA"];

  await Promise.all(channels.map((channel) => integrationService.dispatchJobs({
    channel,
    jobType: "STOCK_SYNC",
    entityType: "PRODUCT",
    entityIds: uniqueProductIds,
    idempotencySuffix: args.reference,
    payload: {
      trigger: args.trigger,
      reference: args.reference,
      warehouseCode: args.warehouseCode ?? null,
    },
  })));
}

async function notifyBackofficeUsersForInventoryAlerts(alerts: Array<{
  type: "LOW_STOCK" | "OUT_OF_STOCK";
  message: string;
  warehouseCode: string;
  productName: string;
}>) {
  if (alerts.length === 0) {
    return;
  }

  const recipients = await identityAdminService.listBackofficeUsers(requireTenantId());
  if (recipients.length === 0) {
    return;
  }

  await Promise.all(alerts.map((alert) => (
    notificationService.createForRecipients({
      recipients: recipients.map((recipient) => ({ id: recipient.id })),
      type: "INVENTORY_ALERT_CREATED",
      title: alert.type === "OUT_OF_STOCK"
        ? adminDictionary.notificationInventoryOutOfStockTitle
        : adminDictionary.notificationInventoryLowStockTitle,
      message: alert.message,
      linkUrl: "/admin/inventory",
      channels: ["IN_APP"],
    })
  )));
}

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  private async findResolvedInventoryTarget(input: { productId: string; variantId?: string }) {
    const target = await this.repository.findInventoryTarget(input);
    if (!target) {
      return null;
    }

    const variant = input.variantId ? target.variants[0] ?? null : null;
    const inventoryItem = variant?.inventoryItem ?? target.inventoryItem ?? null;
    const inventoryLevels = inventoryItem?.inventoryLevels ?? [];
    const defaultWarehouse = inventoryLevels.find((level) => level.warehouse.isDefault) ?? inventoryLevels[0] ?? null;

    return {
      product: target,
      variant,
      inventoryItemId: inventoryItem?.id ?? null,
      defaultWarehouseCode: defaultWarehouse?.warehouse.code ?? null,
    };
  }

  private async recordHistory(input: {
    eventType:
      | "STOCK_ADJUSTMENT"
      | "STOCK_TRANSFER"
      | "STOCK_IN"
      | "STOCK_OUT"
      | "STOCK_COUNT"
      | "WAREHOUSE_CREATED"
      | "WAREHOUSE_UPDATED"
      | "BULK_OPERATION";
    entityType: "PRODUCT" | "WAREHOUSE" | "STOCK_COUNT" | "TRANSACTION" | "PURCHASE_RECEIPT" | "BULK_OPERATION";
    entityId?: string | null;
    productId?: string | null;
    warehouseId?: string | null;
    transactionId?: string | null;
    stockCountId?: string | null;
    purchaseReceiptId?: string | null;
    actorUserId?: string | null;
    title: string;
    summary: string;
    metadata?: Record<string, unknown> | null;
  }) {
    await this.repository.createInventoryHistoryEvent(input);
  }

  private async syncProductInventoryStateCore(
    input: z.infer<typeof syncProductInventorySchema>,
    options?: { queueIntegrationSync?: boolean },
  ): Promise<void> {
    let warehouseCode = input.warehouseCode;

    if (!warehouseCode && input.warehouseId) {
      const warehouse = await this.repository.findWarehouseById(input.warehouseId);
      warehouseCode = warehouse?.code;
    }

    await this.repository.syncProductInventoryState({
      ...input,
      warehouseCode,
    });
    const target = await this.findResolvedInventoryTarget({
      productId: input.productId,
      variantId: input.variantId,
    });
    const inventoryItemId = target?.inventoryItemId ?? null;
    const resolvedWarehouseCode = warehouseCode ?? target?.defaultWarehouseCode ?? null;
    if (inventoryItemId && resolvedWarehouseCode) {
      const warehouses = await this.repository.listWarehouses();
      const warehouse = warehouses.find((item) => item.code === resolvedWarehouseCode);
      if (warehouse) {
        const alerts = await this.repository.refreshInventoryAlerts([{ inventoryItemId, warehouseId: warehouse.id }]);
        await notifyBackofficeUsersForInventoryAlerts(alerts);
      }
    }

    if (options?.queueIntegrationSync !== false) {
      await queueInventoryStockSync({
        productIds: [input.productId],
        trigger: "MANUAL_ADJUSTMENT",
        reference: `inventory-adjust:${input.productId}:${Date.now()}`,
        warehouseCode: resolvedWarehouseCode ?? undefined,
      });
    }

    await invalidateCatalogCache();
    await invalidateInventoryCache();
  }

  async getOperationHistory(): Promise<AdminInventoryOperationHistoryItem[]> {
    const items = await this.repository.listInventoryHistoryEvents(12);
    const actorIds = Array.from(new Set(items.map((item) => item.actorUserId).filter((value): value is string => Boolean(value))));
    const actors = await this.repository.findUsersByIds(actorIds);
    const actorMap = new Map(actors.map((item) => [item.id, `${item.name} • ${item.email}`]));

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      actorLabel: item.actorUserId ? (actorMap.get(item.actorUserId) ?? item.actorUserId.slice(0, 8)) : null,
      createdAt: item.createdAt.toISOString(),
      entityType: item.entityType as AdminInventoryOperationHistoryItem["entityType"],
      action: item.eventType as AdminInventoryOperationHistoryItem["action"],
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    }));
  }

  async listInventoryExportHistory(): Promise<AdminInventoryExportHistoryItem[]> {
    const cacheKey = buildTenantCacheKey(requireTenantId(), "inventory", "exports", "history", "v1");
    const cached = await redisCache.get<AdminInventoryExportHistoryItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.repository.listInventoryExportHistories(24);
    const result = items.map((item: Awaited<ReturnType<InventoryRepository["listInventoryExportHistories"]>>[number]) => ({
      id: item.id,
      actorLabel: item.actor ? `${item.actor.name} • ${item.actor.email}` : null,
      summary: `${item.total} satır dışa aktarıldı`,
      total: item.total,
      createdAt: item.createdAt.toISOString(),
      scopeLabel: "Stok listesi CSV dışa aktarımı",
      filterCount: countInventoryExportFilters({
        search: item.search,
        stockStatusFilter: item.stockStatusFilter,
        reservationFilter: item.reservationFilter,
        warehouseFilter: item.warehouseFilter,
        movementTypeFilter: item.movementTypeFilter,
      }),
      hasFilters: countInventoryExportFilters({
        search: item.search,
        stockStatusFilter: item.stockStatusFilter,
        reservationFilter: item.reservationFilter,
        warehouseFilter: item.warehouseFilter,
        movementTypeFilter: item.movementTypeFilter,
      }) > 0,
      filters: {
        search: item.search,
        stockStatusFilter: item.stockStatusFilter,
        reservationFilter: item.reservationFilter,
        warehouseFilter: item.warehouseFilter,
        movementTypeFilter: item.movementTypeFilter,
      },
    }));

    await redisCache.set(cacheKey, result, 300);
    return result;
  }

  async recordInventoryExportHistory(input: {
    actorUserId?: string | null;
    total: number;
    filters: AdminInventoryExportHistoryItem["filters"];
  }): Promise<AdminInventoryExportHistoryItem | null> {
    const created = await this.repository.createInventoryExportHistory(input);
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "exports"));
    if (!created) {
      return null;
    }

    const filters = {
      search: created.search,
      stockStatusFilter: created.stockStatusFilter,
      reservationFilter: created.reservationFilter,
      warehouseFilter: created.warehouseFilter,
      movementTypeFilter: created.movementTypeFilter,
    };

    return {
      id: created.id,
      actorLabel: null,
      summary: `${created.total} satır dışa aktarıldı`,
      total: created.total,
      createdAt: created.createdAt.toISOString(),
      scopeLabel: "Stok listesi CSV dışa aktarımı",
      filterCount: countInventoryExportFilters(filters),
      hasFilters: countInventoryExportFilters(filters) > 0,
      filters,
    };
  }

  async getUserInventoryPreferences(userId: string): Promise<AdminInventoryListPreferences> {
    const parsedUserId = z.string().trim().min(1).parse(userId);
    const stored = await this.repository.getUserInventoryPreferences(parsedUserId);
    const fallback = getDefaultInventoryListPreferences();

    if (!stored) {
      return fallback;
    }

    const parsed = inventoryPreferencesSchema.safeParse({
      compactInventoryList: stored.compactInventoryList,
      visibleColumns: stored.visibleColumns,
    });

    return parsed.success ? parsed.data : fallback;
  }

  async saveUserInventoryPreferences(userId: string, input: AdminInventoryListPreferences): Promise<AdminInventoryListPreferences> {
    const parsedUserId = z.string().trim().min(1).parse(userId);
    const parsed = inventoryPreferencesSchema.parse(input);
    const saved = await this.repository.upsertUserInventoryPreferences(parsedUserId, parsed);

    return inventoryPreferencesSchema.parse({
      compactInventoryList: saved.compactInventoryList,
      visibleColumns: saved.visibleColumns,
    });
  }

  private parseCsvRows(raw: string) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(",").map((cell) => cell.trim()));
  }

  async listInventoryOverview(query: AdminInventoryListQuery): Promise<AdminInventoryListResult> {
    const parsed = adminInventoryListQuerySchema.parse(query);
    const cacheKey = buildTenantCacheKey(
      requireTenantId(),
      "inventory",
      "overview",
      "v4",
      parsed.search ?? "",
      parsed.stockStatusFilter ?? "all",
      parsed.reservationFilter ?? "all",
      parsed.warehouseFilter ?? "all",
      parsed.movementTypeFilter ?? "all",
      parsed.page,
      parsed.pageSize,
    );
    const cached = await redisCache.get<AdminInventoryListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.repository.listInventoryOverview({
      search: parsed.search,
      warehouseCode: parsed.warehouseFilter,
    });

    const mappedItems = buildInventoryOverviewItems(products, new Map(), {
      includeWarehouseDistribution: false,
      includeRecentMovements: false,
    });

    const stockAndReservationFilteredItems = mappedItems.filter((item) => {
      const stockStatusMatch = parsed.stockStatusFilter === "all"
        || (parsed.stockStatusFilter === "in_stock" && item.stockStatus === "IN_STOCK")
        || (parsed.stockStatusFilter === "low_stock" && item.stockStatus === "LOW_STOCK")
        || (parsed.stockStatusFilter === "out_of_stock" && item.stockStatus === "OUT_OF_STOCK");

      const reservationMatch = parsed.reservationFilter === "all"
        || (parsed.reservationFilter === "with_reserved" && item.hasReservations)
        || (parsed.reservationFilter === "without_reserved" && !item.hasReservations);

      return stockStatusMatch && reservationMatch;
    });

    const pagedBaseItems = stockAndReservationFilteredItems.slice((parsed.page - 1) * parsed.pageSize, parsed.page * parsed.pageSize);

    const movementRelevantProductIds = parsed.movementTypeFilter === "all"
      ? Array.from(new Set(pagedBaseItems.map((item) => item.productId)))
      : Array.from(new Set(stockAndReservationFilteredItems.map((item) => item.productId)));

    const movementRelevantInventoryItemIds = products
      .filter((product) => movementRelevantProductIds.includes(product.id))
      .map((product) => product.inventoryItem?.id)
      .filter((inventoryItemId): inventoryItemId is string => Boolean(inventoryItemId));

    const movements = await this.repository.listInventoryOverviewMovements(movementRelevantInventoryItemIds, 12);
    const movementsByInventoryItemId = new Map<string, OverviewMovement[]>();
    for (const movement of movements) {
      const current = movementsByInventoryItemId.get(movement.inventoryItemId) ?? [];
      if (current.length < 12) {
        current.push(movement);
        movementsByInventoryItemId.set(movement.inventoryItemId, current);
      }
    }

    const productsForDecoration = parsed.movementTypeFilter === "all"
      ? products.filter((product) => pagedBaseItems.some((item) => item.productId === product.id))
      : products;

    const decoratedItems = buildInventoryOverviewItems(productsForDecoration, movementsByInventoryItemId, {
      includeWarehouseDistribution: true,
      includeRecentMovements: true,
    });

    const movementFilteredItems = (parsed.movementTypeFilter === "all" ? decoratedItems : decoratedItems.filter((item) => {
        const stockStatusMatch = parsed.stockStatusFilter === "all"
          || (parsed.stockStatusFilter === "in_stock" && item.stockStatus === "IN_STOCK")
          || (parsed.stockStatusFilter === "low_stock" && item.stockStatus === "LOW_STOCK")
          || (parsed.stockStatusFilter === "out_of_stock" && item.stockStatus === "OUT_OF_STOCK");

        const reservationMatch = parsed.reservationFilter === "all"
          || (parsed.reservationFilter === "with_reserved" && item.hasReservations)
          || (parsed.reservationFilter === "without_reserved" && !item.hasReservations);

        const movementMatch = parsed.movementTypeFilter === "all"
          || item.lastMovementType === parsed.movementTypeFilter;

        return stockStatusMatch && reservationMatch && movementMatch;
      }));

    const total = parsed.movementTypeFilter === "all"
      ? stockAndReservationFilteredItems.length
      : movementFilteredItems.length;
    const pagedItems = parsed.movementTypeFilter === "all"
      ? movementFilteredItems
      : movementFilteredItems.slice((parsed.page - 1) * parsed.pageSize, parsed.page * parsed.pageSize);
    const summarySourceItems = parsed.movementTypeFilter === "all"
      ? stockAndReservationFilteredItems
      : movementFilteredItems;

    const result = {
      items: pagedItems,
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
      summary: buildInventoryOverviewSummary(summarySourceItems),
    };

    await redisCache.set(cacheKey, result, 120);
    return result;
  }

  async findInventoryItemQuickMatch(rawQuery: string): Promise<AdminInventoryQuickLookupResult> {
    const query = rawQuery.trim();
    if (!query) {
      return {
        item: null,
        matchType: "NONE",
        query,
      };
    }

    const products = await this.repository.listInventoryOverview({
      search: query,
    });

    const items = buildInventoryOverviewItems(products, new Map(), {
      includeWarehouseDistribution: true,
      includeRecentMovements: false,
    });

    const normalizedQuery = query.toLocaleLowerCase("tr-TR");
    const exactBarcode = items.find((item) => item.barcode?.toLocaleLowerCase("tr-TR") === normalizedQuery);
    if (exactBarcode) {
      return { item: exactBarcode, matchType: "BARCODE", query };
    }

    const exactSku = items.find((item) => item.sku.toLocaleLowerCase("tr-TR") === normalizedQuery);
    if (exactSku) {
      return { item: exactSku, matchType: "SKU", query };
    }

    const bestName = items.find((item) => (
      item.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
      || item.variantTitle?.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
      || item.variantOptionSummary?.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
    )) ?? items[0] ?? null;
    return {
      item: bestName,
      matchType: bestName ? "NAME" : "NONE",
      query,
    };
  }

  async listInventoryTransactions(query: AdminInventoryTransactionListQuery): Promise<AdminInventoryTransactionListResult> {
    const parsed = adminInventoryTransactionListQuerySchema.parse(query);
    const startDate = parsed.startDate ? new Date(`${parsed.startDate}T00:00:00.000Z`) : undefined;
    const endDate = parsed.endDate ? new Date(`${parsed.endDate}T23:59:59.999Z`) : undefined;
    const [items, total] = await Promise.all([
      this.repository.listInventoryTransactions({
        ...parsed,
        startDate,
        endDate,
      }),
      this.repository.countInventoryTransactions({
        search: parsed.search,
        type: parsed.type,
        warehouseCode: parsed.warehouseCode,
        sku: parsed.sku,
        startDate,
        endDate,
      }),
    ]);

    return {
      items: items.map(mapInventoryTransaction),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async listInventoryAlerts(): Promise<{
    items: AdminInventoryAlertItem[];
    summary: AdminInventoryAlertSummary;
  }> {
    const alerts = await this.repository.listInventoryAlerts();
    const items = alerts.map(mapInventoryAlert);

    return {
      items,
      summary: {
        activeCount: items.length,
        outOfStockCount: items.filter((item) => item.type === "OUT_OF_STOCK").length,
        lowStockCount: items.filter((item) => item.type === "LOW_STOCK").length,
      },
    };
  }

  async listStockCounts(): Promise<AdminStockCountItem[]> {
    const items = await this.repository.listStockCounts();
    return items.map(mapStockCount);
  }

  async getInventoryReports(query: AdminInventoryReportsQuery = {}): Promise<AdminInventoryReportsResult> {
    const parsed = adminInventoryReportsQuerySchema.parse(query);
    const cacheKey = buildTenantCacheKey(
      requireTenantId(),
      "inventory",
      "reports",
      "dashboard",
      "v3",
      parsed.periodDays,
      parsed.comparePreviousPeriod ? "cmp1" : "cmp0",
      parsed.costingMethod,
      parsed.categoryId ?? "all-categories",
      parsed.productType ?? "all-product-types",
      parsed.warehouseCode ?? "all-warehouses",
      parsed.stockStatus ?? "all-stock-status",
      parsed.reservationStatus ?? "all-reservation-status",
      parsed.movementType ?? "all-movement-types",
    );
    const cached = await redisCache.get<AdminInventoryReportsResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const currentPeriodEnd = new Date();
    const currentPeriodStart = new Date(currentPeriodEnd);
    currentPeriodStart.setUTCDate(currentPeriodStart.getUTCDate() - parsed.periodDays + 1);
    currentPeriodStart.setUTCHours(0, 0, 0, 0);

    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - parsed.periodDays);
    previousPeriodStart.setUTCHours(0, 0, 0, 0);

    const [levels, movements, consistencyRows] = await Promise.all([
      this.repository.listInventoryReportLevels(),
      this.repository.listInventoryReportMovements({
        startDate: parsed.comparePreviousPeriod ? previousPeriodStart : currentPeriodStart,
        endDate: currentPeriodEnd,
      }),
      this.repository.listInventoryConsistencyRows(),
    ]);
    const levelsWithProducts = levels.filter((level) => level.inventoryItem.product !== null);
    const movementsWithProducts = movements.filter((movement) => movement.inventoryItem.product !== null);

    const filterOptions: AdminInventoryReportsResult["filterOptions"] = {
      categories: Array.from(
        new Map(
          levelsWithProducts
            .filter((level) => level.inventoryItem.product?.category)
            .map((level) => [
              level.inventoryItem.product!.category!.id,
              {
                id: level.inventoryItem.product!.category!.id,
                name: level.inventoryItem.product!.category!.name,
              },
            ]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name, "tr")),
      productTypes: Array.from(
        new Set(levelsWithProducts.map((level) => level.inventoryItem.product!.productType)),
      ).sort((left, right) => left.localeCompare(right)),
      warehouses: Array.from(
        new Map(
          levelsWithProducts.map((level) => [
            level.warehouse.code,
            {
              code: level.warehouse.code,
              name: level.warehouse.name,
            },
          ]),
        ).values(),
      ).sort((left, right) => left.code.localeCompare(right.code, "tr")),
      movementTypes: Array.from(new Set(movementsWithProducts.map((movement) => movement.type))).sort((left, right) => left.localeCompare(right)),
    };

    const filteredLevels = levelsWithProducts.filter((level) => {
      const product = level.inventoryItem.product;
      if (!product) {
        return false;
      }

      if (parsed.categoryId && product.categoryId !== parsed.categoryId) {
        return false;
      }

      if (parsed.productType && product.productType !== parsed.productType) {
        return false;
      }

      if (parsed.warehouseCode && level.warehouse.code !== parsed.warehouseCode) {
        return false;
      }

      if (parsed.stockStatus && resolveInventoryReportStockStatus(level) !== parsed.stockStatus) {
        return false;
      }

      if (parsed.reservationStatus === "with_reserved" && level.reserved <= 0) {
        return false;
      }

      if (parsed.reservationStatus === "without_reserved" && level.reserved > 0) {
        return false;
      }

      return true;
    });

    const filteredInventoryItemIds = new Set(filteredLevels.map((level) => level.inventoryItemId));
    const filteredProductIds = new Set(filteredLevels.map((level) => level.inventoryItem.product!.id));
    const filteredWarehouseCodes = new Set(filteredLevels.map((level) => level.warehouse.code));

    const filteredMovements = movementsWithProducts.filter((movement) => {
      const product = movement.inventoryItem.product;
      if (!product) {
        return false;
      }

      if (
        filteredLevels.length === 0
        && (parsed.warehouseCode || parsed.stockStatus || parsed.reservationStatus)
      ) {
        return false;
      }

      if (parsed.categoryId && product.categoryId !== parsed.categoryId) {
        return false;
      }

      if (parsed.productType && product.productType !== parsed.productType) {
        return false;
      }

      if (parsed.warehouseCode && movement.warehouse.code !== parsed.warehouseCode) {
        return false;
      }

      if (parsed.movementType && movement.type !== parsed.movementType) {
        return false;
      }

      if (filteredInventoryItemIds.size > 0 && !filteredInventoryItemIds.has(movement.inventoryItemId)) {
        return false;
      }

      if (filteredWarehouseCodes.size > 0 && !filteredWarehouseCodes.has(movement.warehouse.code)) {
        return false;
      }

      return true;
    });

    const filteredConsistencyRows = consistencyRows.filter((item) => {
      if (
        filteredLevels.length === 0
        && (parsed.warehouseCode || parsed.stockStatus || parsed.reservationStatus)
      ) {
        return false;
      }

      if (parsed.categoryId && item.categoryId !== parsed.categoryId) {
        return false;
      }

      if (parsed.productType && item.productType !== parsed.productType) {
        return false;
      }

      if (filteredProductIds.size > 0 && !filteredProductIds.has(item.id)) {
        return false;
      }

      return true;
    });

    const warehouseMap = new Map<string, AdminInventoryReportsResult["warehouses"][number]>();
    const productAnalyticsMap = new Map<string, {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      availableUnits: number;
      onHandUnits: number;
      outboundUnits30d: number;
      lastMovementAt: string | null;
    }>();
    const lowStock = filteredLevels
      .filter((level) => {
        const availableUnits = toAvailableStock(level.onHand, level.reserved);
        const threshold = Math.max(level.reorderPoint, level.safetyStock);
        return threshold > 0 && availableUnits <= threshold;
      })
      .map((level) => ({
        productId: level.inventoryItem.product!.id,
        productName: level.inventoryItem.product!.name,
        sku: level.inventoryItem.product!.sku,
        warehouseCode: level.warehouse.code,
        warehouseName: level.warehouse.name,
        availableUnits: toAvailableStock(level.onHand, level.reserved),
        reorderPoint: level.reorderPoint,
        safetyStock: level.safetyStock,
        unitCost: resolveInventoryUnitCostByPreference(level as Parameters<typeof resolveInventoryUnitCostByPreference>[0], parsed.costingMethod),
        unitPrice: level.inventoryItem.product!.price.toNumber(),
      }))
      .sort((left, right) => left.availableUnits - right.availableUnits)
      .slice(0, 8);

    let totalOnHandUnits = 0;
    let totalAvailableUnits = 0;
    let totalCostValue = 0;
    let totalSalesValue = 0;
    let lowStockRowCount = 0;
    let outOfStockRowCount = 0;

    for (const level of filteredLevels) {
      const onHandUnits = level.onHand;
      const availableUnits = toAvailableStock(level.onHand, level.reserved);
      const unitCost = resolveInventoryUnitCostByPreference(level as Parameters<typeof resolveInventoryUnitCostByPreference>[0], parsed.costingMethod);
      const unitPrice = level.inventoryItem.product!.price.toNumber();
      const threshold = Math.max(level.reorderPoint, level.safetyStock);
      const productId = level.inventoryItem.product!.id;
      const existingProduct = productAnalyticsMap.get(productId);

      totalOnHandUnits += onHandUnits;
      totalAvailableUnits += availableUnits;
      totalCostValue += onHandUnits * unitCost;
      totalSalesValue += availableUnits * unitPrice;

      if (existingProduct) {
        existingProduct.availableUnits += availableUnits;
        existingProduct.onHandUnits += onHandUnits;
      } else {
        productAnalyticsMap.set(productId, {
          productId,
          productName: level.inventoryItem.product!.name,
          sku: level.inventoryItem.product!.sku,
          unitPrice,
          availableUnits,
          onHandUnits,
          outboundUnits30d: 0,
          lastMovementAt: null,
        });
      }

      if (availableUnits <= 0) {
        outOfStockRowCount += 1;
      } else if (threshold > 0 && availableUnits <= threshold) {
        lowStockRowCount += 1;
      }

      const existingWarehouse = warehouseMap.get(level.warehouse.id);
      if (existingWarehouse) {
        existingWarehouse.skuCount += 1;
        existingWarehouse.onHandUnits += onHandUnits;
        existingWarehouse.availableUnits += availableUnits;
        existingWarehouse.costValue += onHandUnits * unitCost;
        existingWarehouse.salesValue += availableUnits * unitPrice;
      } else {
        warehouseMap.set(level.warehouse.id, {
          warehouseCode: level.warehouse.code,
          warehouseName: level.warehouse.name,
          skuCount: 1,
          onHandUnits,
          availableUnits,
          costValue: onHandUnits * unitCost,
          salesValue: availableUnits * unitPrice,
        });
      }
    }

    const movementSummaryMap = new Map<string, AdminInventoryReportsResult["movementSummary"][number]>();
    const trendMap = new Map<string, { stockInQuantity: number; stockOutQuantity: number }>();
    const currentPeriodSummary = {
      startDate: currentPeriodStart.toISOString(),
      endDate: currentPeriodEnd.toISOString(),
      periodDays: parsed.periodDays,
      movementCount: 0,
      totalStockInQuantity: 0,
      totalStockOutQuantity: 0,
      netQuantity: 0,
    };
    const previousPeriodSummary = parsed.comparePreviousPeriod
      ? {
        startDate: previousPeriodStart.toISOString(),
        endDate: previousPeriodEnd.toISOString(),
        periodDays: parsed.periodDays,
        movementCount: 0,
        totalStockInQuantity: 0,
        totalStockOutQuantity: 0,
        netQuantity: 0,
      }
      : null;

    for (const movement of filteredMovements) {
      const movementAt = movement.createdAt.getTime();
      const isCurrentPeriod = movementAt >= currentPeriodStart.getTime() && movementAt <= currentPeriodEnd.getTime();
      const isPreviousPeriod = Boolean(
        previousPeriodSummary
        && movementAt >= previousPeriodStart.getTime()
        && movementAt <= previousPeriodEnd.getTime(),
      );
      const movementAbsQuantity = Math.abs(movement.quantity);
      const product = movement.inventoryItem.product;
      const productAnalytics = product ? productAnalyticsMap.get(product.id) : undefined;

      if (isCurrentPeriod) {
        const existingMovement = movementSummaryMap.get(movement.type);
        if (existingMovement) {
          existingMovement.movementCount += 1;
          existingMovement.totalQuantity += movementAbsQuantity;
          existingMovement.lastMovementAt = movement.createdAt.toISOString();
        } else {
          movementSummaryMap.set(movement.type, {
            movementType: movement.type,
            movementCount: 1,
            totalQuantity: movementAbsQuantity,
            lastMovementAt: movement.createdAt.toISOString(),
          });
        }

        const dateKey = movement.createdAt.toISOString().slice(0, 10);
        const trendItem = trendMap.get(dateKey) ?? { stockInQuantity: 0, stockOutQuantity: 0 };
        currentPeriodSummary.movementCount += 1;

        if (movement.quantity >= 0) {
          trendItem.stockInQuantity += movement.quantity;
          currentPeriodSummary.totalStockInQuantity += movement.quantity;
        } else {
          const outboundQuantity = Math.abs(movement.quantity);
          trendItem.stockOutQuantity += outboundQuantity;
          currentPeriodSummary.totalStockOutQuantity += outboundQuantity;
          if (productAnalytics) {
            productAnalytics.outboundUnits30d += outboundQuantity;
          }
        }

        trendMap.set(dateKey, trendItem);

        if (productAnalytics) {
          productAnalytics.lastMovementAt = movement.createdAt.toISOString();
        }
      } else if (isPreviousPeriod && previousPeriodSummary) {
        previousPeriodSummary.movementCount += 1;
        if (movement.quantity >= 0) {
          previousPeriodSummary.totalStockInQuantity += movement.quantity;
        } else {
          previousPeriodSummary.totalStockOutQuantity += Math.abs(movement.quantity);
        }
      }
    }

    currentPeriodSummary.netQuantity = currentPeriodSummary.totalStockInQuantity - currentPeriodSummary.totalStockOutQuantity;
    if (previousPeriodSummary) {
      previousPeriodSummary.netQuantity = previousPeriodSummary.totalStockInQuantity - previousPeriodSummary.totalStockOutQuantity;
    }

    const trend: AdminInventoryReportsResult["trend"] = [];
    for (let index = parsed.periodDays - 1; index >= 0; index -= 1) {
      const date = new Date(currentPeriodEnd);
      date.setUTCDate(date.getUTCDate() - index);
      const dateKey = date.toISOString().slice(0, 10);
      const point = trendMap.get(dateKey) ?? { stockInQuantity: 0, stockOutQuantity: 0 };
      trend.push({
        date: dateKey,
        stockInQuantity: point.stockInQuantity,
        stockOutQuantity: point.stockOutQuantity,
        netQuantity: point.stockInQuantity - point.stockOutQuantity,
      });
    }

    const consistency = filteredConsistencyRows
      .map(mapInventoryConsistencyItem)
      .filter((item) => !item.hasInventoryLevels || item.difference !== 0)
      .sort((left, right) => {
        if (left.hasInventoryLevels !== right.hasInventoryLevels) {
          return left.hasInventoryLevels ? 1 : -1;
        }

        return Math.abs(right.difference) - Math.abs(left.difference);
      })
      .slice(0, 8);

    const velocity = Array.from(productAnalyticsMap.values())
      .filter((item) => item.availableUnits > 0 || item.outboundUnits30d > 0)
      .map((item) => {
        const dailyOutbound = item.outboundUnits30d / parsed.periodDays;
        const coverageDays = dailyOutbound > 0 ? Number((item.availableUnits / dailyOutbound).toFixed(1)) : null;
        const turnoverRate = item.availableUnits > 0
          ? Number((item.outboundUnits30d / Math.max(item.availableUnits, 1)).toFixed(2))
          : Number(item.outboundUnits30d.toFixed(2));

        return {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          availableUnits: item.availableUnits,
          last30DayOutboundUnits: item.outboundUnits30d,
          turnoverRate,
          coverageDays,
        };
      })
      .sort((left, right) => right.turnoverRate - left.turnoverRate)
      .slice(0, 8);

    const slowMoving = Array.from(productAnalyticsMap.values())
      .filter((item) => item.availableUnits > 0)
      .map((item) => {
        const inactivityDays = item.lastMovementAt
          ? differenceInCalendarDays(new Date(item.lastMovementAt), new Date())
          : null;

        return {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          availableUnits: item.availableUnits,
          salesValue: item.availableUnits * item.unitPrice,
          lastMovementAt: item.lastMovementAt,
          inactivityDays,
        };
      })
      .filter((item) => item.inactivityDays === null || item.inactivityDays >= 14)
      .sort((left, right) => {
        const leftScore = (left.inactivityDays ?? 999) * left.salesValue;
        const rightScore = (right.inactivityDays ?? 999) * right.salesValue;
        return rightScore - leftScore;
      })
      .slice(0, 8);

    const abcBase = Array.from(productAnalyticsMap.values())
      .map((item) => ({
        productId: item.productId,
        estimatedSalesValue: item.availableUnits * item.unitPrice,
      }))
      .filter((item) => item.estimatedSalesValue > 0)
      .sort((left, right) => right.estimatedSalesValue - left.estimatedSalesValue);

    const totalEstimatedSalesValue = abcBase.reduce((sum, item) => sum + item.estimatedSalesValue, 0);
    const abcAccumulator = {
      A: { segment: "A" as const, productCount: 0, estimatedSalesValue: 0, sharePercent: 0 },
      B: { segment: "B" as const, productCount: 0, estimatedSalesValue: 0, sharePercent: 0 },
      C: { segment: "C" as const, productCount: 0, estimatedSalesValue: 0, sharePercent: 0 },
    };
    let cumulativeRatio = 0;

    for (const item of abcBase) {
      cumulativeRatio += totalEstimatedSalesValue > 0 ? item.estimatedSalesValue / totalEstimatedSalesValue : 0;
      const bucket = cumulativeRatio <= 0.8 ? abcAccumulator.A : cumulativeRatio <= 0.95 ? abcAccumulator.B : abcAccumulator.C;
      bucket.productCount += 1;
      bucket.estimatedSalesValue += item.estimatedSalesValue;
    }

    const abcSegments = Object.values(abcAccumulator).map((segment) => ({
      ...segment,
      sharePercent: totalEstimatedSalesValue > 0
        ? Number(((segment.estimatedSalesValue / totalEstimatedSalesValue) * 100).toFixed(1))
        : 0,
    }));

    const averageCoverageDays = velocity.length > 0
      ? Number(
        (
          velocity.reduce((sum, item) => sum + (item.coverageDays ?? 0), 0)
          / Math.max(velocity.filter((item) => item.coverageDays !== null).length, 1)
        ).toFixed(1),
      )
      : null;
    const stockTurnoverRate = velocity.length > 0
      ? Number((velocity.reduce((sum, item) => sum + item.turnoverRate, 0) / velocity.length).toFixed(2))
      : 0;

    const result: AdminInventoryReportsResult = {
      overview: {
        officialCostingMethod: "AVERAGE_COST",
        officialCostingMethodLabel: "Ağırlıklı ortalama maliyet",
        displayCostingMethod: parsed.costingMethod,
        displayCostingMethodLabel: parsed.costingMethod === "LAST_PURCHASE_COST"
          ? "Son alış maliyeti"
          : "Ağırlıklı ortalama maliyet",
        comparisonCostingModeEnabled: parsed.costingMethod !== "AVERAGE_COST",
        totalOnHandUnits,
        totalAvailableUnits,
        totalCostValue,
        totalSalesValue,
        totalPotentialProfit: totalSalesValue - totalCostValue,
        averageCoverageDays,
        stockTurnoverRate,
        warehouseCount: warehouseMap.size,
        lowStockRowCount,
        outOfStockRowCount,
        legacyStockFallbackCount: filteredConsistencyRows.filter((item) => (item.inventoryItem?.inventoryLevels?.length ?? 0) === 0).length,
        stockMismatchCount: filteredConsistencyRows.filter((item) => {
          const inventoryLevels = item.inventoryItem?.inventoryLevels ?? [];
          if (inventoryLevels.length === 0) {
            return false;
          }

          const aggregateAvailableStock = inventoryLevels.reduce((sum, level) => sum + toAvailableStock(level.onHand, level.reserved), 0);
          return aggregateAvailableStock !== item.stock;
        }).length,
      },
      periodDays: parsed.periodDays,
      comparison: {
        enabled: parsed.comparePreviousPeriod,
        current: currentPeriodSummary,
        previous: previousPeriodSummary,
        stockInDelta: previousPeriodSummary
          ? currentPeriodSummary.totalStockInQuantity - previousPeriodSummary.totalStockInQuantity
          : null,
        stockOutDelta: previousPeriodSummary
          ? currentPeriodSummary.totalStockOutQuantity - previousPeriodSummary.totalStockOutQuantity
          : null,
        netDelta: previousPeriodSummary
          ? currentPeriodSummary.netQuantity - previousPeriodSummary.netQuantity
          : null,
        movementCountDelta: previousPeriodSummary
          ? currentPeriodSummary.movementCount - previousPeriodSummary.movementCount
          : null,
      },
      filterOptions,
      warehouses: Array.from(warehouseMap.values()).sort((left, right) => right.salesValue - left.salesValue),
      lowStock,
      movementSummary: Array.from(movementSummaryMap.values()).sort((left, right) => right.totalQuantity - left.totalQuantity),
      trend,
      velocity,
      slowMoving,
      abcSegments,
      consistency,
    };

    await redisCache.set(cacheKey, result, 300);
    return result;
  }

  async getInventoryIntegrationSummary(): Promise<AdminInventoryIntegrationSummary> {
    const cacheKey = buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "dashboard", "v1");
    const cached = await redisCache.get<AdminInventoryIntegrationSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const dashboard = await integrationService.getStockSyncDashboard();
    const result: AdminInventoryIntegrationSummary = {
      pendingCount: dashboard.pendingCount,
      processingCount: dashboard.processingCount,
      failedCount: dashboard.failedCount,
      deadLetterCount: dashboard.deadLetterCount,
      successCount: dashboard.successCount,
      channelCounts: dashboard.channelCounts,
      recentJobs: dashboard.recentJobs
        .filter((job) => job.channel !== "BANK_SANDBOX")
        .map((job) => ({
        id: job.id,
        channel: job.channel as MarketplaceIntegrationChannel,
        status: job.status,
        entityId: job.entityId,
        createdAt: job.createdAt,
        lastError: job.lastError,
      })),
    };

    await redisCache.set(cacheKey, result, 300);
    return result;
  }

  async listInventoryIntegrationMappings(): Promise<AdminInventoryIntegrationMappingItem[]> {
    const items = await this.repository.listInventoryIntegrationMappings();
    return items.map(mapInventoryIntegrationMapping);
  }

  async upsertInventoryIntegrationMapping(input: AdminUpsertInventoryIntegrationMappingInput): Promise<AdminInventoryIntegrationMappingItem> {
    const parsed = upsertInventoryIntegrationMappingSchema.parse(input);
    const mapping = await this.repository.upsertInventoryIntegrationMapping(parsed);
    await invalidateInventoryCache();
    return mapInventoryIntegrationMapping(mapping);
  }

  async listRecentExternalStockEvents(): Promise<AdminExternalStockEventItem[]> {
    const items = await this.repository.listRecentExternalStockEvents(20);
    return items.map(mapExternalStockEvent);
  }

  async getExternalStockEventMonitoring(): Promise<AdminExternalStockEventMonitoring> {
    const cacheKey = buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "external-events", "v1");
    const cached = await redisCache.get<AdminExternalStockEventMonitoring>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.listRecentExternalStockEvents();
    const result: AdminExternalStockEventMonitoring = {
      receivedCount: items.filter((item) => item.status === "RECEIVED").length,
      appliedCount: items.filter((item) => item.status === "APPLIED").length,
      failedCount: items.filter((item) => item.status === "FAILED").length,
      duplicateCount: items.filter((item) => item.status === "DUPLICATE").length,
      unresolvedCount: items.filter((item) => item.errorMessage?.includes("eşlemesi bulunamadı")).length,
      readOnlyCount: items.filter((item) => item.errorMessage?.includes("yazımına kapalıdır")).length,
      targetLevelMissingCount: items.filter((item) => item.errorMessage?.includes("aktif depo stoku bulunamadı")).length,
      latestFailedMessage: items.find((item) => item.status === "FAILED")?.errorMessage ?? null,
      items,
    };

    await redisCache.set(cacheKey, result, 180);
    return result;
  }

  async receiveExternalStockEvent(input: ReceiveExternalStockEventInput): Promise<ReceiveExternalStockEventResult> {
    const parsed = receiveExternalStockEventSchema.parse(input);
    const created = await this.repository.createExternalStockEvent({
      ...parsed,
      payload: parsed.payload as Prisma.InputJsonValue | undefined,
    });

    if (created.duplicate) {
      return {
        eventId: created.event.id,
        duplicate: true,
        status: "DUPLICATE",
        productId: created.event.product?.id ?? null,
        warehouseId: created.event.warehouse?.id ?? null,
      };
    }

    const mapping = await this.repository.findInventoryIntegrationMapping({
      channel: parsed.channel,
      externalProductId: parsed.externalProductId,
      externalSku: parsed.externalSku,
      externalWarehouseCode: parsed.externalWarehouseCode,
    });

    if (!mapping) {
      await this.repository.markExternalStockEventFailed({
        eventId: created.event.id,
        errorMessage: "Eşleşen entegrasyon eşlemesi bulunamadı.",
      });
      await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "external-events"));
      throw new Error("EXTERNAL_STOCK_MAPPING_NOT_FOUND");
    }

    if (!mapping.allowInboundUpdates) {
      await this.repository.markExternalStockEventFailed({
        eventId: created.event.id,
        mappingId: mapping.id,
        productId: mapping.product.id,
        warehouseId: mapping.warehouse?.id ?? null,
        errorMessage: "Bu eşleme harici stok yazımına kapalıdır.",
      });
      await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "external-events"));
      throw new Error("EXTERNAL_STOCK_MAPPING_READ_ONLY");
    }

    const inventoryLevels = mapping.product.inventoryItem?.inventoryLevels ?? [];
    const targetLevel = mapping.warehouse
      ? inventoryLevels.find((level) => level.warehouseId === mapping.warehouse?.id)
      : inventoryLevels.find((level) => level.warehouse.isDefault) ?? inventoryLevels[0];

    if (!targetLevel) {
      await this.repository.markExternalStockEventFailed({
        eventId: created.event.id,
        mappingId: mapping.id,
        productId: mapping.product.id,
        warehouseId: mapping.warehouse?.id ?? null,
        errorMessage: "Eşleme için aktif depo stoku bulunamadı.",
      });
      await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "external-events"));
      throw new Error("EXTERNAL_STOCK_TARGET_LEVEL_NOT_FOUND");
    }

    const targetOnHandStock = parsed.eventType === "SNAPSHOT_AVAILABLE"
      ? parsed.quantity + targetLevel.reserved
      : parsed.quantity;
    const projectionNote = parsed.note ?? `${parsed.channel} harici stok eventi`;

    await this.syncProductInventoryStateCore({
      productId: mapping.product.id,
      sku: mapping.product.sku,
      warehouseCode: targetLevel.warehouse.code,
      targetOnHandStock,
      note: projectionNote,
    }, {
      queueIntegrationSync: false,
    });

    await this.repository.markExternalStockEventApplied({
      eventId: created.event.id,
      mappingId: mapping.id,
      productId: mapping.product.id,
      warehouseId: targetLevel.warehouse.id,
      appliedOnHand: targetOnHandStock,
      appliedAvailable: Math.max(0, targetOnHandStock - targetLevel.reserved),
    });

    await invalidateInventoryCache();
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "inventory", "integrations", "external-events"));

    return {
      eventId: created.event.id,
      duplicate: false,
      status: "APPLIED",
      productId: mapping.product.id,
      warehouseId: targetLevel.warehouse.id,
    };
  }

  async getProductAvailability(
    inputs: Array<string | { productId: string; variantId?: string }>,
  ): Promise<ProductInventoryAvailability[]> {
    const parsed = availabilityQuerySchema.parse({
      items: inputs.map((item) => (typeof item === "string" ? { productId: item } : item)),
    });

    const targets = await Promise.all(parsed.items.map((item) => this.findResolvedInventoryTarget(item)));

    return targets.flatMap((target) => {
      if (!target) {
        return [];
      }

      const inventoryLevels = target.variant?.inventoryItem?.inventoryLevels ?? target.product.inventoryItem?.inventoryLevels ?? [];
      const availability = resolveAggregateAvailabilityFromLevels(inventoryLevels, target.product.stock);
      const defaultWarehouse = inventoryLevels.find((level) => level.warehouse.isDefault) ?? inventoryLevels[0];

      return [{
        productId: target.product.id,
        variantId: target.variant?.id ?? null,
        slug: target.product.slug,
        sku: target.variant?.sku ?? target.product.sku,
        name: target.variant?.title ?? target.product.name,
        imageUrl: target.variant?.imageUrl ?? target.product.imageUrl,
        currency: target.product.currency,
        unitPrice: target.variant?.priceOverride?.toNumber() ?? target.product.price.toNumber(),
        compareAtPrice: target.variant?.compareAtPriceOverride?.toNumber() ?? target.product.compareAtPrice?.toNumber() ?? null,
        onHandStock: availability.onHandStock,
        reservedStock: availability.reservedStock,
        availableStock: availability.availableStock,
        inStock: availability.availableStock > 0,
        warehouseCode: defaultWarehouse?.warehouse.code ?? null,
      }];
    });
  }

  async syncProductInventoryState(input: SyncProductInventoryInput): Promise<void> {
    const parsed = syncProductInventorySchema.parse(input);
    await this.syncProductInventoryStateCore(parsed);
    await this.recordHistory({
      eventType: "STOCK_ADJUSTMENT",
      entityType: "PRODUCT",
      entityId: parsed.productId,
      productId: parsed.productId,
      title: "Stok düzeltmesi",
      summary: `${parsed.sku} için stok düzeltmesi uygulandı.`,
      metadata: {
        variantId: parsed.variantId ?? null,
        sku: parsed.sku,
        warehouseCode: parsed.warehouseCode ?? null,
        targetOnHandStock: parsed.targetOnHandStock ?? null,
        reorderPoint: parsed.reorderPoint ?? null,
        safetyStock: parsed.safetyStock ?? null,
      },
    });
  }

  async transferProductInventory(input: TransferProductInventoryInput): Promise<void> {
    const parsed = transferInventorySchema.parse(input);
    await this.repository.transferProductInventory(parsed);
    const target = await this.findResolvedInventoryTarget({
      productId: parsed.productId,
      variantId: parsed.variantId,
    });
    const inventoryItemId = target?.inventoryItemId ?? null;
    if (inventoryItemId) {
      const warehouses = await this.repository.listWarehouses();
      const targets = warehouses
        .filter((warehouse) => warehouse.code === parsed.fromWarehouseCode || warehouse.code === parsed.toWarehouseCode)
        .map((warehouse) => ({ inventoryItemId, warehouseId: warehouse.id }));
      const alerts = await this.repository.refreshInventoryAlerts(targets);
      await notifyBackofficeUsersForInventoryAlerts(alerts);
    }
    await queueInventoryStockSync({
      productIds: [parsed.productId],
      trigger: "TRANSFER",
      reference: `inventory-transfer:${parsed.productId}:${parsed.fromWarehouseCode}:${parsed.toWarehouseCode}:${Date.now()}`,
    });
    await invalidateCatalogCache();
    await invalidateInventoryCache();
    await this.recordHistory({
      eventType: "STOCK_TRANSFER",
      entityType: "PRODUCT",
      entityId: parsed.productId,
      productId: parsed.productId,
      title: "Depolar arası transfer",
      summary: `${parsed.sku} için ${parsed.fromWarehouseCode} -> ${parsed.toWarehouseCode} transferi uygulandı.`,
      metadata: {
        variantId: parsed.variantId ?? null,
        sku: parsed.sku,
        fromWarehouseCode: parsed.fromWarehouseCode,
        toWarehouseCode: parsed.toWarehouseCode,
        quantity: parsed.quantity,
      },
    });
  }

  async recordProductInventoryMovement(input: RecordProductInventoryMovementInput): Promise<void> {
    const parsed = recordInventoryMovementSchema.parse(input);
    const resolvedSupplier = parsed.sourceDocumentSupplierId
      ? await catalogAdminService.getSupplierById(parsed.sourceDocumentSupplierId)
      : null;

    if (parsed.sourceDocumentSupplierId && !resolvedSupplier) {
      throw new Error("SUPPLIER_NOT_FOUND");
    }

    await this.repository.recordProductInventoryMovement({
      ...parsed,
      sourceDocumentSupplier: resolvedSupplier?.name ?? parsed.sourceDocumentSupplier,
      sourceDocumentDate: parsed.sourceDocumentDate ? new Date(parsed.sourceDocumentDate) : undefined,
    });
    const target = await this.findResolvedInventoryTarget({
      productId: parsed.productId,
      variantId: parsed.variantId,
    });
    const inventoryItemId = target?.inventoryItemId ?? null;
    if (inventoryItemId) {
      const warehouses = await this.repository.listWarehouses();
      const warehouse = warehouses.find((item) => item.code === parsed.warehouseCode);
      if (warehouse) {
        const alerts = await this.repository.refreshInventoryAlerts([{ inventoryItemId, warehouseId: warehouse.id }]);
        await notifyBackofficeUsersForInventoryAlerts(alerts);
      }
    }
    await queueInventoryStockSync({
      productIds: [parsed.productId],
      trigger: parsed.type,
      reference: `inventory-movement:${parsed.type}:${parsed.productId}:${Date.now()}`,
      warehouseCode: parsed.warehouseCode,
    });
    await invalidateCatalogCache();
    await invalidateInventoryCache();
    await this.recordHistory({
      eventType: parsed.type === "PURCHASE_RECEIPT" ? "STOCK_IN" : "STOCK_OUT",
      entityType: parsed.type === "PURCHASE_RECEIPT" && parsed.sourceDocumentNumber ? "PURCHASE_RECEIPT" : "PRODUCT",
      entityId: parsed.type === "PURCHASE_RECEIPT" ? (parsed.sourceDocumentNumber ?? parsed.productId) : parsed.productId,
      productId: parsed.productId,
      title: parsed.type === "PURCHASE_RECEIPT" ? "Stok girişi" : "Stok çıkışı",
      summary: `${parsed.sku} için ${parsed.quantity} adet ${parsed.type === "PURCHASE_RECEIPT" ? "stok girişi" : "stok çıkışı"} işlendi.`,
      metadata: {
        variantId: parsed.variantId ?? null,
        sku: parsed.sku,
        warehouseCode: parsed.warehouseCode,
        quantity: parsed.quantity,
        documentType: parsed.documentType ?? null,
        sourceDocumentNumber: parsed.sourceDocumentNumber ?? null,
        sourceDocumentSupplierId: parsed.sourceDocumentSupplierId ?? null,
        sourceDocumentSupplier: resolvedSupplier?.name ?? parsed.sourceDocumentSupplier ?? null,
        sourceDocumentReference: parsed.sourceDocumentReference ?? null,
        externalSystemStatus: parsed.externalSystemStatus ?? null,
      },
    });
  }

  async listWarehouses(): Promise<AdminWarehouseItem[]> {
    const warehouses = await this.repository.listWarehouses();
    return warehouses.map(mapWarehouse);
  }

  async createWarehouse(input: AdminCreateWarehouseInput): Promise<AdminWarehouseItem> {
    const parsed = createWarehouseSchema.parse(input);
    const created = await this.repository.createWarehouse(parsed);
    await invalidateInventoryCache();
    await this.recordHistory({
      eventType: "WAREHOUSE_CREATED",
      entityType: "WAREHOUSE",
      entityId: created.id,
      warehouseId: created.id,
      title: "Depo oluşturuldu",
      summary: `${created.name} (${created.code}) deposu oluşturuldu.`,
      metadata: {
        warehouseCode: created.code,
        warehouseName: created.name,
      },
    });
    return mapWarehouse(created);
  }

  async updateWarehouse(input: AdminUpdateWarehouseInput): Promise<AdminWarehouseItem> {
    const parsed = updateWarehouseSchema.parse(input);
    const updated = await this.repository.updateWarehouse(parsed);
    await invalidateInventoryCache();
    await this.recordHistory({
      eventType: "WAREHOUSE_UPDATED",
      entityType: "WAREHOUSE",
      entityId: updated.id,
      warehouseId: updated.id,
      title: "Depo güncellendi",
      summary: `${updated.name} (${updated.code}) deposu güncellendi.`,
      metadata: {
        warehouseCode: updated.code,
        warehouseName: updated.name,
      },
    });
    return mapWarehouse(updated);
  }

  async createStockCount(input: AdminCreateStockCountInput): Promise<AdminStockCountItem> {
    const parsed = createStockCountSchema.parse(input);
    const created = await this.repository.createStockCount(parsed);
    await this.recordHistory({
      eventType: "STOCK_COUNT",
      entityType: "STOCK_COUNT",
      entityId: created.id,
      stockCountId: created.id,
      title: "Stok sayımı oluşturuldu",
      summary: `${created.countNumber} numaralı stok sayımı oluşturuldu.`,
      metadata: {
        countNumber: created.countNumber,
        warehouseCode: created.warehouse?.code ?? null,
      },
    });
    return mapStockCount(created);
  }

  async updateStockCountLine(input: AdminUpdateStockCountLineInput): Promise<void> {
    const parsed = updateStockCountLineSchema.parse(input);
    await this.repository.updateStockCountLine(parsed);
  }

  async bulkAdjustInventory(rawRows: BulkInventoryAdjustmentRowInput[]): Promise<BulkOperationResult> {
    const parsedRows: Array<{ rowNumber: number; row: BulkInventoryAdjustmentRowInput }> = [];
    const results: BulkOperationResult["rows"] = [];

    rawRows.forEach((row, index) => {
      const parsed = bulkInventoryAdjustmentRowSchema.safeParse(row);

      if (!parsed.success) {
        const error = buildBulkOperationRowError("Doğrulama hatası");
        results.push({
          rowNumber: index + 1,
          sku: row.sku ?? "",
          warehouseCode: row.warehouseCode ?? null,
          success: false,
          code: error.code,
          message: error.message,
          hint: error.hint,
          inputSummary: `${row.sku ?? "SKU yok"} • ${row.warehouseCode ?? "Varsayılan depo"}`,
        });
        return;
      }

      parsedRows.push({
        rowNumber: index + 1,
        row: parsed.data,
      });
    });

    const products = await this.repository.findProductsBySkus(parsedRows.map((item) => item.row.sku));
    const productMap = new Map(products.map((product) => [product.sku, product]));

    for (const item of parsedRows) {
      const { rowNumber, row } = item;
      const product = productMap.get(row.sku);
      if (!product) {
        const error = buildBulkOperationRowError("Ürün bulunamadı");
        results.push({
          rowNumber,
          sku: row.sku,
          warehouseCode: row.warehouseCode ?? null,
          success: false,
          code: error.code,
          message: error.message,
          hint: error.hint,
          inputSummary: `${row.sku} • ${row.warehouseCode ?? "Varsayılan depo"}`,
        });
        continue;
      }

      try {
        await this.syncProductInventoryState({
          productId: product.id,
          sku: row.sku,
          warehouseCode: row.warehouseCode,
          targetOnHandStock: row.targetOnHandStock,
          reorderPoint: row.reorderPoint,
          safetyStock: row.safetyStock,
          note: row.note ?? "Toplu stok guncelleme",
        });
        results.push({
          rowNumber,
          sku: row.sku,
          warehouseCode: row.warehouseCode ?? null,
          success: true,
          code: "UPDATED",
          message: "Güncellendi.",
          hint: null,
          inputSummary: `${row.sku} • ${row.warehouseCode ?? "Varsayılan depo"}`,
        });
      } catch (error) {
        const rowError = buildBulkOperationRowError(error instanceof Error ? error.message : "İşlem başarısız");
        results.push({
          rowNumber,
          sku: row.sku,
          warehouseCode: row.warehouseCode ?? null,
          success: false,
          code: rowError.code,
          message: rowError.message,
          hint: rowError.hint,
          inputSummary: `${row.sku} • ${row.warehouseCode ?? "Varsayılan depo"}`,
        });
      }
    }

    const result = {
      total: results.length,
      successCount: results.filter((row) => row.success).length,
      failureCount: results.filter((row) => !row.success).length,
      rows: results,
    };
    await this.recordHistory({
      eventType: "BULK_OPERATION",
      entityType: "BULK_OPERATION",
      title: "Toplu stok güncelleme",
      summary: `Toplu stok güncelleme tamamlandı. Başarılı: ${result.successCount}, hatalı: ${result.failureCount}.`,
      metadata: result,
    });
    return result;
  }

  async bulkAssignPreferredSalesWarehouse(rows: BulkAssignPreferredWarehouseRowInput[]): Promise<BulkOperationResult> {
    const parsedRows: Array<{ rowNumber: number; row: BulkAssignPreferredWarehouseRowInput }> = [];
    const results: BulkOperationResult["rows"] = [];

    rows.forEach((row, index) => {
      const parsed = bulkAssignPreferredWarehouseRowSchema.safeParse(row);

      if (!parsed.success) {
        const error = buildBulkOperationRowError("Doğrulama hatası");
        results.push({
          rowNumber: index + 1,
          sku: row.sku ?? "",
          warehouseCode: row.preferredSalesWarehouseCode ?? null,
          success: false,
          code: error.code,
          message: error.message,
          hint: error.hint,
          inputSummary: `${row.sku ?? "SKU yok"} • ${row.preferredSalesWarehouseCode ?? "Depo yok"}`,
        });
        return;
      }

      parsedRows.push({
        rowNumber: index + 1,
        row: parsed.data,
      });
    });

    const products = await this.repository.findProductsBySkus(parsedRows.map((item) => item.row.sku));
    const warehouses = await this.repository.listWarehouses();
    const productSet = new Set(products.map((product) => product.sku));
    const warehouseSet = new Set(warehouses.map((warehouse) => warehouse.code));
    const validRows = parsedRows
      .map((item) => item.row)
      .filter((row) => productSet.has(row.sku) && warehouseSet.has(row.preferredSalesWarehouseCode));

    await this.repository.assignPreferredSalesWarehouses(validRows);

    results.push(...parsedRows.map((item) => {
      const row = item.row;
      const success = productSet.has(row.sku) && warehouseSet.has(row.preferredSalesWarehouseCode);
      const error = !productSet.has(row.sku)
        ? buildBulkOperationRowError("Ürün bulunamadı")
        : !warehouseSet.has(row.preferredSalesWarehouseCode)
          ? buildBulkOperationRowError("Depo bulunamadı")
          : null;

      return {
        rowNumber: item.rowNumber,
        sku: row.sku,
        warehouseCode: row.preferredSalesWarehouseCode,
        success,
        code: success ? "ASSIGNED" : error?.code ?? "UNKNOWN_ERROR",
        message: success ? "Atandı." : error?.message ?? "İşlem başarısız.",
        hint: success ? null : error?.hint ?? "Depo kodunu ve SKU bilgisini yeniden kontrol et.",
        inputSummary: `${row.sku} • ${row.preferredSalesWarehouseCode}`,
      };
    }));

    await invalidateCatalogCache();
    await invalidateInventoryCache();

    const result = {
      total: results.length,
      successCount: results.filter((row) => row.success).length,
      failureCount: results.filter((row) => !row.success).length,
      rows: results,
    };
    await this.recordHistory({
      eventType: "BULK_OPERATION",
      entityType: "BULK_OPERATION",
      title: "Toplu depo atama",
      summary: `Toplu depo atama tamamlandı. Başarılı: ${result.successCount}, hatalı: ${result.failureCount}.`,
      metadata: result,
    });
    return result;
  }

  async bulkUpdateStockCountLines(stockCountId: string, rows: BulkStockCountLineRowInput[]): Promise<BulkOperationResult> {
    const parsedId = z.string().trim().min(1).parse(stockCountId);
    const parsedRows: Array<{ rowNumber: number; row: BulkStockCountLineRowInput }> = [];
    const results: BulkOperationResult["rows"] = [];

    rows.forEach((row, index) => {
      const parsed = bulkStockCountLineRowSchema.safeParse(row);

      if (!parsed.success) {
        const error = buildBulkOperationRowError("Doğrulama hatası");
        results.push({
          rowNumber: index + 1,
          sku: row.sku ?? "",
          warehouseCode: row.warehouseCode ?? null,
          success: false,
          code: error.code,
          message: error.message,
          hint: error.hint,
          inputSummary: `${row.sku ?? "SKU yok"} • ${row.warehouseCode ?? "Depo yok"}`,
        });
        return;
      }

      parsedRows.push({
        rowNumber: index + 1,
        row: parsed.data,
      });
    });

    const existingTargets = await this.repository.findStockCountLineTargets(
      parsedId,
      parsedRows.map((item) => item.row),
    );
    const targetSet = new Set(existingTargets.map((line) => `${line.inventoryItem.skuSnapshot}:${line.warehouse.code}`));
    const validRows = parsedRows
      .map((item) => item.row)
      .filter((row) => targetSet.has(`${row.sku}:${row.warehouseCode}`));
    await this.repository.updateStockCountLinesBulk(parsedId, validRows);

    results.push(...parsedRows.map((item) => {
      const row = item.row;
      const success = targetSet.has(`${row.sku}:${row.warehouseCode}`);
      const error = success ? null : buildBulkOperationRowError("Sayım satırı bulunamadı");

      return {
        rowNumber: item.rowNumber,
        sku: row.sku,
        warehouseCode: row.warehouseCode,
        success,
        code: success ? "COUNT_LINE_UPDATED" : error?.code ?? "UNKNOWN_ERROR",
        message: success ? "Sayım satırı güncellendi." : error?.message ?? "İşlem başarısız.",
        hint: success ? null : error?.hint ?? "Sayım fişi, SKU ve depo kodu eşleşmesini kontrol et.",
        inputSummary: `${row.sku} • ${row.warehouseCode}`,
      };
    }));

    const result = {
      total: results.length,
      successCount: results.filter((row) => row.success).length,
      failureCount: results.filter((row) => !row.success).length,
      rows: results,
    };
    await this.recordHistory({
      eventType: "BULK_OPERATION",
      entityType: "BULK_OPERATION",
      title: "Toplu sayım güncelleme",
      summary: `Toplu sayım güncelleme tamamlandı. Başarılı: ${result.successCount}, hatalı: ${result.failureCount}.`,
      metadata: result,
    });
    return result;
  }

  parseBulkAdjustmentCsv(raw: string): BulkInventoryAdjustmentRowInput[] {
    return this.parseCsvRows(raw).map((cells) => ({
      sku: cells[0] ?? "",
      warehouseCode: cells[1] || undefined,
      targetOnHandStock: Number(cells[2] ?? "0"),
      reorderPoint: cells[3] ? Number(cells[3]) : undefined,
      safetyStock: cells[4] ? Number(cells[4]) : undefined,
      note: cells[5] || undefined,
    }));
  }

  parseBulkPreferredWarehouseCsv(raw: string): BulkAssignPreferredWarehouseRowInput[] {
    return this.parseCsvRows(raw).map((cells) => ({
      sku: cells[0] ?? "",
      preferredSalesWarehouseCode: cells[1] ?? "",
    }));
  }

  parseBulkStockCountCsv(raw: string): BulkStockCountLineRowInput[] {
    return this.parseCsvRows(raw).map((cells) => ({
      sku: cells[0] ?? "",
      warehouseCode: cells[1] ?? "",
      countedOnHand: Number(cells[2] ?? "0"),
      note: cells[3] || undefined,
    }));
  }

  async applyStockCount(stockCountId: string): Promise<{ transactionNumber: string; countNumber: string }> {
    const parsedId = z.string().trim().min(1).parse(stockCountId);
    const applied = await this.repository.applyStockCount(parsedId);
    const alerts = await this.repository.refreshInventoryAlerts(applied.touchedTargets);
    await notifyBackofficeUsersForInventoryAlerts(alerts);

    const recipients = await identityAdminService.listBackofficeUsers(requireTenantId());
    if (recipients.length > 0) {
      await notificationService.createForRecipients({
        recipients: recipients.map((recipient) => ({ id: recipient.id })),
        type: "STOCK_COUNT_APPLIED",
        title: adminDictionary.notificationStockCountAppliedTitle,
        message: formatNotificationMessage(adminDictionary.notificationStockCountAppliedMessage, {
          countNumber: applied.countNumber,
          transactionNumber: applied.transactionNumber,
        }),
        linkUrl: "/admin/inventory",
        channels: ["IN_APP"],
      });
    }

    await invalidateCatalogCache();
    await invalidateInventoryCache();
    await queueInventoryStockSync({
      productIds: applied.productIds,
      trigger: "STOCK_COUNT",
      reference: applied.countNumber,
    });
    await this.recordHistory({
      eventType: "STOCK_COUNT",
      entityType: "STOCK_COUNT",
      entityId: parsedId,
      stockCountId: parsedId,
      title: "Stok sayımı uygulandı",
      summary: `${applied.countNumber} stok sayımı uygulandı.`,
      metadata: {
        transactionNumber: applied.transactionNumber,
        countNumber: applied.countNumber,
      },
    });

    return {
      transactionNumber: applied.transactionNumber,
      countNumber: applied.countNumber,
    };
  }

  async listTransactionSummariesForFinance(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return [] as AdminInventoryTransactionFinanceSummary[];
    }

    const items = await this.repository.findInventoryTransactionSummariesByIds(uniqueIds);

    return items.map((item) => ({
      id: item.id,
      transactionNumber: item.transactionNumber,
      type: item.type,
      createdAt: item.createdAt.toISOString(),
    }));
  }
}

export const inventoryService = new InventoryService(new InventoryRepository());
