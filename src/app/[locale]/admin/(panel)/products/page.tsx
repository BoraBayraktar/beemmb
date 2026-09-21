import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogService } from "@/modules/catalog/services/catalog.service";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { ProductManager } from "@/ui/admin/product-manager";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: string;
    brandId?: string;
    supplierId?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "products.read"))) {
    notFound();
  }

  const enabledModuleKeys = await platformService.getEnabledModuleKeys(user.tenantId);
  const query = await searchParams;
  const [productResult, categories, warehouses, brands, suppliers, attributeDefinitions] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      catalogAdminService.listProducts({
        search: query.search,
        categoryId: query.categoryId,
        status: (query.status as "all" | "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined) ?? "all",
        brandId: query.brandId,
        supplierId: query.supplierId,
        page: query.page ? Number(query.page) : 1,
        pageSize: 10,
      }),
      catalogService.listCategories(),
      inventoryService.listWarehouses(),
      catalogAdminService.listBrands(),
      catalogAdminService.listSuppliers(),
      catalogAdminService.listAttributeDefinitions(),
    ]),
  );

  return (
    <ProductManager
      key="admin-products"
      locale={locale as Locale}
      initialResult={productResult}
      initialQuery={{
        search: query.search ?? "",
        categoryId: query.categoryId ?? "",
        status: query.status ?? "all",
        brandId: query.brandId ?? "",
        supplierId: query.supplierId ?? "",
      }}
      categories={categories}
      brands={brands}
      suppliers={suppliers}
      attributeDefinitions={attributeDefinitions}
      warehouses={warehouses}
      canDelete={await rbacService.hasPermission(user, "products.manage")}
      canManageIntegrations={await rbacService.hasPermission(user, "integrations.manage")}
      canManageSuppliers={enabledModuleKeys.has("finance")}
      labels={{
        title: dictionary.admin.productManager,
        createTitle: dictionary.admin.createProduct,
        listTitle: dictionary.admin.productList,
        search: dictionary.admin.search,
        allCategories: dictionary.admin.allCategories,
        page: dictionary.admin.page,
        prev: dictionary.admin.prev,
        next: dictionary.admin.next,
        slug: dictionary.admin.slug,
        sort: dictionary.admin.sort,
        sku: dictionary.admin.sku,
        barcode: dictionary.admin.barcode,
        name: dictionary.admin.productCardName,
        description: dictionary.admin.description,
        productType: dictionary.admin.productType,
        unitType: dictionary.admin.unitType,
        price: dictionary.catalog.price,
        purchasePrice: dictionary.admin.purchasePrice,
        compareAtPrice: dictionary.admin.compareAtPrice,
        stock: dictionary.admin.stock,
        vatRate: dictionary.admin.vatRate,
        stockTrackingEnabled: dictionary.admin.stockTrackingEnabled,
        preferredSalesWarehouse: dictionary.admin.preferredSalesWarehouse,
        preferredPurchaseWarehouse: dictionary.admin.preferredPurchaseWarehouse,
        imageUrl: dictionary.admin.imageUrl,
        additionalImageUrls: dictionary.admin.additionalImageUrls,
        additionalImageUrlsHint: dictionary.admin.additionalImageUrlsHint,
        category: dictionary.catalog.category,
        brand: dictionary.admin.brand,
        supplier: dictionary.admin.supplier,
        statusLabel: dictionary.admin.status,
        statusDraft: dictionary.admin.stockCardStatusDraft,
        statusActive: dictionary.admin.stockCardStatusActive,
        statusArchived: dictionary.admin.stockCardStatusArchived,
        variantActiveBadge: dictionary.admin.productStatusActive,
        salesEnabled: dictionary.admin.salesEnabled,
        purchaseEnabled: dictionary.admin.purchaseEnabled,
        internalNote: dictionary.admin.internalNote,
        searchKeywords: dictionary.admin.searchKeywords,
        searchKeywordsHint: dictionary.admin.searchKeywordsHint,
        allStatuses: dictionary.admin.allStatuses,
        allBrands: dictionary.admin.allBrands,
        allSuppliers: dictionary.admin.allSuppliers,
        createBrand: dictionary.admin.createBrand,
        createSupplier: dictionary.admin.createSupplier,
        manageBrands: dictionary.admin.manageBrands,
        manageSuppliers: dictionary.admin.manageSuppliers,
        manageCategories: dictionary.admin.manageCategories,
        searchBrand: dictionary.admin.searchBrand,
        searchSupplier: dictionary.admin.searchSupplier,
        searchCategory: dictionary.admin.searchCategory,
        noBrandResults: dictionary.admin.noBrandResults,
        noSupplierResults: dictionary.admin.noSupplierResults,
        noCategoryResults: dictionary.admin.noCategoryResults,
        createAttributeDefinition: dictionary.admin.createAttributeDefinition,
        manageAttributeDefinitions: dictionary.admin.manageAttributeDefinitions,
        attributesTitle: dictionary.admin.attributesTitle,
        attributeName: dictionary.admin.attributeName,
        attributeDisplayType: dictionary.admin.attributeDisplayType,
        attributeDisplayText: dictionary.admin.attributeDisplayText,
        attributeDisplayColor: dictionary.admin.attributeDisplayColor,
        attributeDisplayNumber: dictionary.admin.attributeDisplayNumber,
        variantAxes: dictionary.admin.variantAxes,
        variantAxesHint: dictionary.admin.variantAxesHint,
        variantTitle: dictionary.admin.variantTitle,
        variantsTitle: dictionary.admin.variantsTitle,
        variantsHint: dictionary.admin.variantsHint,
        addVariant: dictionary.admin.addVariant,
        variantOptionSummary: dictionary.admin.variantOptionSummary,
        variantPriceOverride: dictionary.admin.variantPriceOverride,
        variantPurchasePriceOverride: dictionary.admin.variantPurchasePriceOverride,
        variantCompareAtPriceOverride: dictionary.admin.variantCompareAtPriceOverride,
        variantImageUrl: dictionary.admin.variantImageUrl,
        variantStockOverride: dictionary.admin.variantStockOverride,
        variantDefault: dictionary.admin.variantDefault,
        variantSalesEnabled: dictionary.admin.variantSalesEnabled,
        variantAttributeValue: dictionary.admin.variantAttributeValue,
        variantDetails: dictionary.admin.variantDetails,
        moveVariantUp: dictionary.admin.moveVariantUp,
        moveVariantDown: dictionary.admin.moveVariantDown,
        variantEmptyState: dictionary.admin.variantEmptyState,
        variantAxisDeleteConfirm: dictionary.admin.variantAxisDeleteConfirm,
        variantAxisDeleteBlocked: dictionary.admin.variantAxisDeleteBlocked,
        variantAxisUsageCount: dictionary.admin.variantAxisUsageCount,
        selectedVariantAxes: dictionary.admin.selectedVariantAxes,
        generateVariants: dictionary.admin.generateVariants,
        generateVariantsTitle: dictionary.admin.generateVariantsTitle,
        generateVariantsHint: dictionary.admin.generateVariantsHint,
        generateVariantsValues: dictionary.admin.generateVariantsValues,
        generateVariantsApply: dictionary.admin.generateVariantsApply,
        generateVariantsEmptyAxes: dictionary.admin.generateVariantsEmptyAxes,
        generateVariantsSuggestions: dictionary.admin.generateVariantsSuggestions,
        generateVariantsUseAllSuggestions: dictionary.admin.generateVariantsUseAllSuggestions,
        orderCount: dictionary.admin.orderCount,
        soldQuantity: dictionary.admin.soldQuantity,
        grossRevenue: dictionary.admin.grossRevenue,
        averageUnitCost: dictionary.admin.averageUnitCost,
        lastPurchaseUnitCost: dictionary.admin.lastPurchaseUnitCost,
        stockValue: dictionary.admin.stockValue,
        grossProfit: dictionary.admin.grossProfit,
        grossMarginRate: dictionary.admin.grossMarginRate,
        lastOrderedAt: dictionary.admin.lastOrderedAt,
        decisionAlerts: dictionary.admin.decisionAlerts,
        alertLowMargin: dictionary.admin.alertLowMargin,
        alertSlowSales: dictionary.admin.alertSlowSales,
        alertStockRisk: dictionary.admin.alertStockRisk,
        alertHealthy: dictionary.admin.alertHealthy,
        reviewInventory: dictionary.admin.reviewInventory,
        reviewTransactions: dictionary.admin.reviewTransactions,
        trendyolPreflight: dictionary.admin.trendyolPreflight,
        trendyolPreflightReady: dictionary.admin.trendyolPreflightReady,
        trendyolPreflightBlocked: dictionary.admin.trendyolPreflightBlocked,
        trendyolPreflightWarnings: dictionary.admin.trendyolPreflightWarnings,
        trendyolPreflightIssues: dictionary.admin.trendyolPreflightIssues,
        trendyolDraftPayload: dictionary.admin.trendyolDraftPayload,
        trendyolQueueProductSync: dictionary.admin.trendyolQueueProductSync,
        pazaramaPreflight: dictionary.admin.pazaramaPreflight,
        pazaramaPreflightReady: dictionary.admin.pazaramaPreflightReady,
        pazaramaPreflightBlocked: dictionary.admin.pazaramaPreflightBlocked,
        pazaramaPreflightWarnings: dictionary.admin.pazaramaPreflightWarnings,
        pazaramaPreflightIssues: dictionary.admin.pazaramaPreflightIssues,
        pazaramaDraftPayload: dictionary.admin.pazaramaDraftPayload,
        pazaramaQueueProductSync: dictionary.admin.pazaramaQueueProductSync,
        pazaramaProductSyncQueued: dictionary.admin.pazaramaProductSyncQueued,
        pazaramaProductSyncTracking: dictionary.admin.pazaramaProductSyncTracking,
        pazaramaProductSyncJobStatus: dictionary.admin.pazaramaProductSyncJobStatus,
        pazaramaProductSyncCheckAgain: dictionary.admin.pazaramaProductSyncCheckAgain,
        n11Preflight: dictionary.admin.n11Preflight,
        n11PreflightReady: dictionary.admin.n11PreflightReady,
        n11PreflightBlocked: dictionary.admin.n11PreflightBlocked,
        n11PreflightWarnings: dictionary.admin.n11PreflightWarnings,
        n11PreflightIssues: dictionary.admin.n11PreflightIssues,
        n11DraftPayload: dictionary.admin.n11DraftPayload,
        n11QueueProductSync: dictionary.admin.n11QueueProductSync,
        n11ProductSyncQueued: dictionary.admin.n11ProductSyncQueued,
        n11ProductSyncTracking: dictionary.admin.n11ProductSyncTracking,
        n11ProductSyncJobStatus: dictionary.admin.n11ProductSyncJobStatus,
        n11ProductSyncCheckAgain: dictionary.admin.n11ProductSyncCheckAgain,
        hepsiburadaPreflight: dictionary.admin.hepsiburadaPreflight,
        hepsiburadaPreflightReady: dictionary.admin.hepsiburadaPreflightReady,
        hepsiburadaPreflightBlocked: dictionary.admin.hepsiburadaPreflightBlocked,
        hepsiburadaPreflightWarnings: dictionary.admin.hepsiburadaPreflightWarnings,
        hepsiburadaPreflightIssues: dictionary.admin.hepsiburadaPreflightIssues,
        hepsiburadaDraftPayload: dictionary.admin.hepsiburadaDraftPayload,
        hepsiburadaQueueProductSync: dictionary.admin.hepsiburadaQueueProductSync,
        hepsiburadaProductSyncQueued: dictionary.admin.hepsiburadaProductSyncQueued,
        hepsiburadaProductSyncTracking: dictionary.admin.hepsiburadaProductSyncTracking,
        hepsiburadaProductSyncJobStatus: dictionary.admin.hepsiburadaProductSyncJobStatus,
        hepsiburadaProductSyncCheckAgain: dictionary.admin.hepsiburadaProductSyncCheckAgain,
        trendyolProductSyncQueued: dictionary.admin.trendyolProductSyncQueued,
        trendyolProductSyncTracking: dictionary.admin.trendyolProductSyncTracking,
        trendyolProductSyncJobStatus: dictionary.admin.trendyolProductSyncJobStatus,
        trendyolProductSyncCheckAgain: dictionary.admin.trendyolProductSyncCheckAgain,
        brandName: dictionary.admin.brandName,
        supplierName: dictionary.admin.supplierName,
        supplierTaxNumber: dictionary.admin.supplierTaxNumber,
        supplierEmail: dictionary.admin.supplierEmail,
        supplierPhone: dictionary.admin.supplierPhone,
        importCsv: dictionary.admin.importCsv,
        importTemplate: dictionary.admin.productImportTemplate,
        exportCsv: dictionary.admin.exportCsv,
        importHint: dictionary.admin.productImportHint,
        importSuccess: dictionary.admin.productImportSuccess,
        importFailed: dictionary.admin.productImportFailed,
        exportFailed: dictionary.admin.productExportFailed,
        discount: dictionary.admin.discount,
        stockStatus: dictionary.admin.stockStatus,
        inStock: dictionary.admin.inStock,
        outOfStock: dictionary.admin.outOfStock,
        lowStock: dictionary.admin.lowStockOnly,
        save: dictionary.admin.save,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        cancel: dictionary.admin.cancel,
        empty: dictionary.admin.emptyProducts,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        validationPrice: dictionary.admin.validationPrice,
        validationStock: dictionary.admin.validationStock,
        validationCompareAtPrice: dictionary.admin.validationCompareAtPrice,
        validationImageUrl: dictionary.admin.validationImageUrl,
        validationImageUrls: dictionary.admin.validationImageUrls,
        validationImageUrlsLimit: dictionary.admin.validationImageUrlsLimit,
        validationVariantRequired: dictionary.admin.validationVariantRequired,
        validationVariantAttributes: dictionary.admin.validationVariantAttributes,
        validationVariantImageUrl: dictionary.admin.validationVariantImageUrl,
        validationVariantDuplicateSku: dictionary.admin.validationVariantDuplicateSku,
        variantDuplicateSkuWarning: dictionary.admin.variantDuplicateSkuWarning,
        uploadImage: dictionary.admin.uploadImage,
        uploadImages: dictionary.admin.uploadImages,
        uploadingImage: dictionary.admin.uploadingImage,
        uploadingImages: dictionary.admin.uploadingImages,
        imageUploadFailed: dictionary.admin.imageUploadFailed,
        imageUploadHint: dictionary.admin.imageUploadHint,
        features: dictionary.admin.productFeatures,
        featuresHint: dictionary.admin.featuresHint,
        featureKey: dictionary.admin.featureKey,
        featureValue: dictionary.admin.featureValue,
        highlightFeature: dictionary.admin.highlightFeature,
        addFeature: dictionary.admin.addFeature,
        removeFeature: dictionary.admin.removeFeature,
        createEntity: dictionary.admin.create,
        loading: dictionary.common.loading,
        notSpecified: dictionary.common.notSpecified,
        inventoryAdjustStock: dictionary.admin.inventoryAdjustStock,
        inventoryAdjustmentNote: dictionary.admin.inventoryAdjustmentNote,
        inventoryApplyAdjustment: dictionary.admin.inventoryApplyAdjustment,
        inventoryApplyTransfer: dictionary.admin.inventoryApplyTransfer,
        inventoryAvailableStock: dictionary.admin.inventoryAvailableStock,
        inventoryDrawerInfo: dictionary.admin.inventoryDrawerInfo,
        inventoryMovementAllTime: dictionary.admin.inventoryMovementAllTime,
        inventoryMovementCounterpartyWarehouse: dictionary.admin.inventoryMovementCounterpartyWarehouse,
        inventoryMovementDateRange: dictionary.admin.inventoryMovementDateRange,
        inventoryMovementLast24Hours: dictionary.admin.inventoryMovementLast24Hours,
        inventoryMovementLast30Days: dictionary.admin.inventoryMovementLast30Days,
        inventoryMovementLast7Days: dictionary.admin.inventoryMovementLast7Days,
        inventoryMovementQuantityLabel: dictionary.admin.inventoryMovementQuantityLabel,
        inventoryMovementReference: dictionary.admin.inventoryMovementReference,
        inventoryNoRecentMovements: dictionary.admin.inventoryNoRecentMovements,
        inventoryOnHandStock: dictionary.admin.inventoryOnHandStock,
        inventoryRecentMovements: dictionary.admin.inventoryRecentMovements,
        inventoryReorderPoint: dictionary.admin.inventoryReorderPoint,
        inventoryReservedStock: dictionary.admin.inventoryReservedStock,
        inventorySafetyStock: dictionary.admin.inventorySafetyStock,
        inventoryStockIn: dictionary.admin.inventoryStockIn,
        inventoryStockOut: dictionary.admin.inventoryStockOut,
        inventoryTargetOnHandStock: dictionary.admin.inventoryTargetOnHandStock,
        inventoryTargetReorderPoint: dictionary.admin.inventoryTargetReorderPoint,
        inventoryTargetSafetyStock: dictionary.admin.inventoryTargetSafetyStock,
        inventoryTransferNote: dictionary.admin.inventoryTransferNote,
        inventoryTransferQuantity: dictionary.admin.inventoryTransferQuantity,
        inventoryTransferStock: dictionary.admin.inventoryTransferStock,
        inventoryTransferTargetWarehouse: dictionary.admin.inventoryTransferTargetWarehouse,
        inventoryViewAllHistory: dictionary.admin.inventoryViewAllHistory,
        inventoryMovementInitialLoad: dictionary.admin.inventoryMovementInitialLoad,
        inventoryMovementManualAdjustment: dictionary.admin.inventoryMovementManualAdjustment,
        inventoryMovementPurchaseReceipt: dictionary.admin.inventoryMovementPurchaseReceipt,
        inventoryMovementTransferOut: dictionary.admin.inventoryMovementTransferOut,
        inventoryMovementTransferIn: dictionary.admin.inventoryMovementTransferIn,
        inventoryMovementReservationHold: dictionary.admin.inventoryMovementReservationHold,
        inventoryMovementReservationRelease: dictionary.admin.inventoryMovementReservationRelease,
        inventoryMovementOrderCommit: dictionary.admin.inventoryMovementOrderCommit,
        inventoryMovementOrderCancelRestock: dictionary.admin.inventoryMovementOrderCancelRestock,
        inventoryMovementReturnRestock: dictionary.admin.inventoryMovementReturnRestock,
        inventoryMovementDamageWriteOff: dictionary.admin.inventoryMovementDamageWriteOff,
        inventoryAdjustmentSaved: dictionary.admin.inventoryAdjustmentSaved,
        inventoryAdjustmentFailed: dictionary.admin.inventoryAdjustmentFailed,
        inventoryTransferSaved: dictionary.admin.inventoryTransferSaved,
        inventoryTransferFailed: dictionary.admin.inventoryTransferFailed,
        inventoryStockInSaved: dictionary.admin.inventoryStockInSaved,
        inventoryStockInFailed: dictionary.admin.inventoryStockInFailed,
        inventoryStockOutSaved: dictionary.admin.inventoryStockOutSaved,
        inventoryStockOutFailed: dictionary.admin.inventoryStockOutFailed,
      }}
    />
  );
}
