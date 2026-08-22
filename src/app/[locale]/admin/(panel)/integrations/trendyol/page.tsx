import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { TrendyolIntegrationManager } from "@/ui/admin/trendyol-integration-manager";

export default async function AdminTrendyolIntegrationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  const [dashboard, productResult] = await Promise.all([
    marketplaceIntegrationService.getDashboard({ channel: "TRENDYOL" }),
    catalogAdminService.listProducts({ page: 1, pageSize: 50, status: "ACTIVE" }),
  ]);
  const productOptions = productResult.items.flatMap((product) => {
    const baseOption = {
      value: `${product.id}:`,
      label: `${product.name} - ${product.sku}`,
      description: product.barcode ?? null,
      productId: product.id,
      productVariantId: null,
    };
    const variantOptions = product.variants.map((variant) => ({
      value: `${product.id}:${variant.id}`,
      label: `${product.name} / ${variant.title} - ${variant.sku}`,
      description: variant.barcode ?? product.barcode ?? null,
      productId: product.id,
      productVariantId: variant.id,
    }));

    return [baseOption, ...variantOptions];
  });

  return (
    <TrendyolIntegrationManager
      locale={locale}
      canManage={await rbacService.hasPermission(user, "integrationsTrendyol.manage")}
      initialConfigs={dashboard.configs}
      initialPackages={dashboard.packages}
      capabilities={dashboard.capabilities}
      productOptions={productOptions}
      summary={dashboard.summary}
      labels={{
        title: dictionary.admin.integrationMarketplaceTrendyol,
        subtitle: dictionary.admin.integrationMarketplaceTrendyolSubtitle,
        connectionTitle: dictionary.admin.integrationMarketplaceConnection,
        displayName: dictionary.admin.integrationMarketplaceDisplayName,
        sellerId: dictionary.admin.integrationMarketplaceSellerId,
        apiKey: dictionary.admin.integrationMarketplaceApiKey,
        apiSecret: dictionary.admin.integrationMarketplaceApiSecret,
        userAgent: dictionary.admin.integrationMarketplaceUserAgent,
        storeFrontCode: dictionary.admin.integrationMarketplaceStoreFrontCode,
        productV2DefaultsTitle: dictionary.admin.integrationMarketplaceProductV2DefaultsTitle,
        productV2DefaultsDescription: dictionary.admin.integrationMarketplaceProductV2DefaultsDescription,
        productV2CargoCompanyId: dictionary.admin.integrationMarketplaceProductV2CargoCompanyId,
        productV2ShipmentAddressId: dictionary.admin.integrationMarketplaceProductV2ShipmentAddressId,
        productV2ReturningAddressId: dictionary.admin.integrationMarketplaceProductV2ReturningAddressId,
        productV2Origin: dictionary.admin.integrationMarketplaceProductV2Origin,
        productV2DimensionalWeight: dictionary.admin.integrationMarketplaceProductV2DimensionalWeight,
        endpointUrl: dictionary.admin.integrationMarketplaceEndpointUrl,
        syncWindowMinutes: dictionary.admin.integrationMarketplaceSyncWindow,
        save: dictionary.admin.save,
        manualSync: dictionary.admin.integrationMarketplaceManualSync,
        packagesTitle: dictionary.admin.integrationMarketplacePackages,
        emptyPackages: dictionary.admin.integrationMarketplaceEmptyPackages,
        activeAccounts: dictionary.admin.integrationMarketplaceActiveAccounts,
        packages: dictionary.admin.integrationMarketplacePackages,
        readyForOrder: dictionary.admin.integrationMarketplaceReadyForOrder,
        needsReview: dictionary.admin.integrationMarketplaceNeedsReview,
        lastSync: dictionary.admin.integrationMarketplaceLastSync,
        matchedLines: dictionary.admin.integrationMarketplaceMatchedLines,
        matchLine: dictionary.admin.integrationMarketplaceMatchLine,
        selectProduct: dictionary.admin.integrationMarketplaceSelectProduct,
        searchProduct: dictionary.admin.integrationMarketplaceSearchProduct,
        noProductResults: dictionary.admin.integrationMarketplaceNoProductResults,
        packageDetail: dictionary.admin.integrationMarketplacePackageDetail,
        lineMatchSaved: dictionary.admin.integrationMarketplaceLineMatchSaved,
        lineNeedsReviewHint: dictionary.admin.integrationMarketplaceLineNeedsReviewHint,
        lineSuggestedSearch: dictionary.admin.integrationMarketplaceLineSuggestedSearch,
        createProductFromLine: dictionary.admin.integrationMarketplaceCreateProductFromLine,
        ignoreLine: dictionary.admin.integrationMarketplaceIgnoreLine,
        lineIgnored: dictionary.admin.integrationMarketplaceLineIgnored,
        splitPackage: dictionary.admin.integrationMarketplaceSplitPackage,
        splitPackageTitle: dictionary.admin.integrationMarketplaceSplitPackageTitle,
        splitPackageHint: dictionary.admin.integrationMarketplaceSplitPackageHint,
        splitPackageQuantity: dictionary.admin.integrationMarketplaceSplitPackageQuantity,
        splitPackageSuccess: dictionary.admin.integrationMarketplaceSplitPackageSuccess,
        splitPackageInvalid: dictionary.admin.integrationMarketplaceSplitPackageInvalid,
        unsuppliedTitle: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedTitle,
        unsuppliedHint: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedHint,
        unsuppliedQuantity: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedQuantity,
        unsuppliedReasonPlaceholder: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonPlaceholder,
        unsuppliedSubmit: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedSubmit,
        unsuppliedSuccess: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedSuccess,
        unsuppliedInvalid: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedInvalid,
        unsuppliedReasonStockOut: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonStockOut,
        unsuppliedReasonDefective: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonDefective,
        unsuppliedReasonWrongPrice: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonWrongPrice,
        unsuppliedReasonIntegrationError: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonIntegrationError,
        unsuppliedReasonBulkPurchase: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonBulkPurchase,
        unsuppliedReasonForceMajeure: dictionary.admin.integrationMarketplaceTrendyolUnsuppliedReasonForceMajeure,
        createOrder: dictionary.admin.integrationMarketplaceCreateOrder,
        orderCreated: dictionary.admin.integrationMarketplaceOrderCreated,
        notifyPicking: dictionary.admin.integrationMarketplaceNotifyPicking,
        notifyInvoiced: dictionary.admin.integrationMarketplaceNotifyInvoiced,
        invoiceNumber: dictionary.admin.integrationMarketplaceInvoiceNumber,
        statusSyncQueued: dictionary.admin.integrationMarketplaceStatusSyncQueued,
        statusHistory: dictionary.admin.integrationMarketplaceStatusHistory,
        noStatusHistory: dictionary.admin.integrationMarketplaceNoStatusHistory,
        targetStatus: dictionary.admin.integrationMarketplaceTargetStatus,
        attempts: dictionary.admin.integrationMarketplaceAttempts,
        packageStatusLabel: dictionary.admin.integrationMarketplacePackageStatusLabel,
        cargoLabel: dictionary.admin.integrationMarketplaceCargoLabel,
        externalReferenceShort: dictionary.admin.integrationMarketplaceExternalReferenceShort,
        deadLetterResolved: dictionary.admin.integrationMarketplaceDeadLetterResolved,
        closeLabel: dictionary.admin.close,
        retryStatusJob: dictionary.admin.integrationMarketplaceRetryStatusJob,
        testConnection: dictionary.admin.integrationMarketplaceTestConnection,
        connectionTested: dictionary.admin.integrationMarketplaceConnectionTested,
        capabilitiesTitle: dictionary.admin.integrationMarketplaceCapabilitiesTitle,
        capabilitiesHint: dictionary.admin.integrationMarketplaceCapabilitiesHint,
        capabilityAvailable: dictionary.admin.integrationMarketplaceCapabilityAvailable,
        capabilityLimited: dictionary.admin.integrationMarketplaceCapabilityLimited,
        capabilityOrderImport: dictionary.admin.integrationMarketplaceCapabilityOrderImport,
        capabilityProductSync: dictionary.admin.integrationMarketplaceCapabilityProductSync,
        capabilityPriceSync: dictionary.admin.integrationMarketplaceCapabilityPriceSync,
        capabilityStockSync: dictionary.admin.integrationMarketplaceCapabilityStockSync,
        capabilityPickingStatus: dictionary.admin.integrationMarketplaceCapabilityPickingStatus,
        capabilityInvoicedStatus: dictionary.admin.integrationMarketplaceCapabilityInvoicedStatus,
        capabilityPackageSplit: dictionary.admin.integrationMarketplaceCapabilityPackageSplit,
        capabilityUnsuppliedCancel: dictionary.admin.integrationMarketplaceCapabilityUnsuppliedCancel,
        capabilityBrandMapping: dictionary.admin.integrationMarketplaceCapabilityBrandMapping,
        capabilityCategoryMapping: dictionary.admin.integrationMarketplaceCapabilityCategoryMapping,
        capabilityAttributeMapping: dictionary.admin.integrationMarketplaceCapabilityAttributeMapping,
        capabilityAdvancedPreflight: dictionary.admin.integrationMarketplaceCapabilityAdvancedPreflight,
        queued: dictionary.admin.integrationMarketplaceQueued,
        operationFailed: dictionary.admin.operationFailed,
        loading: dictionary.common.loading,
      }}
    />
  );
}
