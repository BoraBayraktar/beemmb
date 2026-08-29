import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { N11IntegrationManager } from "@/ui/admin/n11-integration-manager";

export default async function AdminPazaramaIntegrationPage({
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

  if (!(await rbacService.hasPermission(user, "integrationsPazarama.manage"))) {
    redirect(`/${locale}/admin`);
  }

  const [dashboard, productResult, carrierCompanies] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      marketplaceIntegrationService.getDashboard({ channel: "PAZARAMA" }),
      catalogAdminService.listProducts({ page: 1, pageSize: 50, status: "ACTIVE" }),
      catalogAdminService.listCarrierCompanies(),
    ]),
  );

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
    <N11IntegrationManager
      locale={locale}
      canManage={await rbacService.hasPermission(user, "integrationsPazarama.manage")}
      channel="PAZARAMA"
      initialConfigs={dashboard.configs}
      initialPackages={dashboard.packages}
      capabilities={dashboard.capabilities}
      productOptions={productOptions}
      carrierCompanies={carrierCompanies
        .filter((carrier) => carrier.isActive)
        .map((carrier) => ({ id: carrier.id, name: carrier.name, externalCodePazarama: carrier.externalCodePazarama }))}
      summary={dashboard.summary}
      labels={{
        title: dictionary.admin.integrationMarketplacePazarama,
        subtitle: dictionary.admin.integrationMarketplacePazaramaSubtitle,
        connectionTitle: dictionary.admin.integrationMarketplacePazaramaConnection,
        displayName: dictionary.admin.integrationMarketplaceDisplayName,
        sellerId: dictionary.admin.integrationMarketplaceSellerId,
        apiKey: dictionary.admin.integrationMarketplaceApiKey,
        apiSecret: dictionary.admin.integrationMarketplaceApiSecret,
        endpointUrl: dictionary.admin.integrationMarketplaceEndpointUrl,
        syncWindowMinutes: dictionary.admin.integrationMarketplaceSyncWindow,
        save: dictionary.admin.save,
        manualSync: dictionary.admin.integrationMarketplaceManualSync,
        packagesTitle: dictionary.admin.integrationMarketplacePackages,
        emptyPackages: dictionary.admin.integrationMarketplacePazaramaEmptyPackages,
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
        createOrder: dictionary.admin.integrationMarketplaceCreateOrder,
        orderCreated: dictionary.admin.integrationMarketplaceOrderCreated,
        notifyPicking: dictionary.admin.integrationMarketplaceNotifyPicking,
        statusSyncQueued: dictionary.admin.integrationMarketplaceStatusSyncQueued,
        statusHistory: dictionary.admin.integrationMarketplaceStatusHistory,
        noStatusHistory: dictionary.admin.integrationMarketplacePazaramaNoStatusHistory,
        targetStatus: dictionary.admin.integrationMarketplaceTargetStatus,
        attempts: dictionary.admin.integrationMarketplaceAttempts,
        packageStatusLabel: dictionary.admin.integrationMarketplacePackageStatusLabel,
        cargoLabel: dictionary.admin.integrationMarketplaceCargoLabel,
        externalReferenceShort: dictionary.admin.integrationMarketplaceExternalReferenceShort,
        deadLetterResolved: dictionary.admin.integrationMarketplaceDeadLetterResolved,
        statusLabelQueued: dictionary.admin.integrationMarketplaceStatusLabelQueued,
        statusLabelSending: dictionary.admin.integrationMarketplaceStatusLabelSending,
        statusLabelSent: dictionary.admin.integrationMarketplaceStatusLabelSent,
        statusLabelFailed: dictionary.admin.integrationMarketplaceStatusLabelFailed,
        statusLabelDeadLetter: dictionary.admin.integrationMarketplaceStatusLabelDeadLetter,
        packageListLatestJobLabel: dictionary.admin.integrationMarketplacePackageListLatestJobLabel,
        packageListDeadLetterLabel: dictionary.admin.integrationMarketplacePackageListDeadLetterLabel,
        packageListFailedLabel: dictionary.admin.integrationMarketplacePackageListFailedLabel,
        closeLabel: dictionary.admin.close,
        nextActionTitle: dictionary.admin.integrationMarketplaceNextActionTitle,
        nextActionReviewLines: dictionary.admin.integrationMarketplaceNextActionReviewLines,
        nextActionCreateOrder: dictionary.admin.integrationMarketplaceNextActionCreateOrder,
        nextActionNotifyPicking: dictionary.admin.integrationMarketplaceNextActionNotifyPicking,
        nextActionSplitPackage: dictionary.admin.integrationMarketplaceNextActionSplitPackage,
        nextActionNotifyInvoiced: dictionary.admin.integrationMarketplaceNextActionNotifyInvoiced,
        nextActionRetryDeadLetter: dictionary.admin.integrationMarketplaceNextActionRetryDeadLetter,
        nextActionReviewFailure: dictionary.admin.integrationMarketplaceNextActionReviewFailure,
        nextActionHealthy: dictionary.admin.integrationMarketplaceNextActionHealthy,
        operationsTitle: dictionary.admin.integrationMarketplaceOperationsTitle,
        operationsHint: dictionary.admin.integrationMarketplaceOperationsHint,
        openOperations: dictionary.admin.integrationMarketplaceOpenOperations,
        packageListActionLabel: dictionary.admin.integrationMarketplacePackageListActionLabel,
        selectProductRequired: dictionary.admin.integrationMarketplaceSelectProductRequired,
        splitQuantityRequired: dictionary.admin.integrationMarketplaceSplitQuantityRequired,
        splitQuantityInvalid: dictionary.admin.integrationMarketplaceSplitQuantityInvalid,
        retryQueued: dictionary.admin.integrationMarketplaceRetryQueued,
        retryStatusJob: dictionary.admin.integrationMarketplaceRetryStatusJob,
        splitPackage: dictionary.admin.integrationMarketplaceSplitPackage,
        splitPackageHint: dictionary.admin.integrationMarketplaceSplitPackageHint,
        splitQuantity: dictionary.admin.integrationMarketplaceSplitPackageQuantity,
        splitCreated: dictionary.admin.integrationMarketplaceSplitPackageSuccess,
        testConnection: dictionary.admin.integrationMarketplaceTestConnection,
        connectionTested: dictionary.admin.integrationMarketplacePazaramaConnectionTested,
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
        capabilityCollectionRequest: dictionary.admin.integrationMarketplaceCapabilityCollectionRequest,
        capabilityBrandMapping: dictionary.admin.integrationMarketplaceCapabilityBrandMapping,
        capabilityCategoryMapping: dictionary.admin.integrationMarketplaceCapabilityCategoryMapping,
        capabilityAttributeMapping: dictionary.admin.integrationMarketplaceCapabilityAttributeMapping,
        capabilityAdvancedPreflight: dictionary.admin.integrationMarketplaceCapabilityAdvancedPreflight,
        queued: dictionary.admin.integrationMarketplacePazaramaQueued,
        operationFailed: dictionary.admin.operationFailed,
        loading: dictionary.common.loading,
        invoicedFormTitle: dictionary.admin.integrationMarketplaceInvoicedFormTitle,
        invoicedCarrierLabel: dictionary.admin.integrationMarketplaceInvoicedCarrierLabel,
        invoicedCarrierPlaceholder: dictionary.admin.integrationMarketplaceInvoicedCarrierPlaceholder,
        invoicedTrackingNumberLabel: dictionary.admin.integrationMarketplaceInvoicedTrackingNumberLabel,
        invoicedSubmit: dictionary.admin.integrationMarketplaceInvoicedSubmit,
        invoicedCarrierMissingCode: dictionary.admin.integrationMarketplaceInvoicedCarrierMissingCode,
        invoicedTrackingNumberRequired: dictionary.admin.integrationMarketplaceInvoicedTrackingNumberRequired,
        invoicedNotSupported: dictionary.admin.integrationMarketplaceInvoicedNotSupported,
        collectionRequestTitle: dictionary.admin.integrationMarketplaceCollectionRequestTitle,
        collectionRequestHint: dictionary.admin.integrationMarketplaceCollectionRequestHint,
        collectionRequestShipmentCompanyLabel: dictionary.admin.integrationMarketplaceCollectionRequestShipmentCompanyLabel,
        collectionRequestShipmentCompanyPlaceholder: dictionary.admin.integrationMarketplaceCollectionRequestShipmentCompanyPlaceholder,
        collectionRequestBoxQuantityLabel: dictionary.admin.integrationMarketplaceCollectionRequestBoxQuantityLabel,
        collectionRequestDesiLabel: dictionary.admin.integrationMarketplaceCollectionRequestDesiLabel,
        collectionRequestSubmit: dictionary.admin.integrationMarketplaceCollectionRequestSubmit,
        collectionRequestSuccess: dictionary.admin.integrationMarketplaceCollectionRequestSuccess,
        collectionRequestInvalid: dictionary.admin.integrationMarketplaceCollectionRequestInvalid,
        cancelQuantityLabel: dictionary.admin.integrationMarketplaceCancelQuantityLabel,
        cancelReasonPlaceholder: dictionary.admin.integrationMarketplaceCancelReasonPlaceholder,
        cancelReasonStockOut: dictionary.admin.integrationMarketplaceCancelReasonStockOut,
        cancelReasonDefective: dictionary.admin.integrationMarketplaceCancelReasonDefective,
        cancelReasonWrongPrice: dictionary.admin.integrationMarketplaceCancelReasonWrongPrice,
        cancelReasonForceMajeure: dictionary.admin.integrationMarketplaceCancelReasonForceMajeure,
        cancelReasonOther: dictionary.admin.integrationMarketplaceCancelReasonOther,
        cancelReasonRequired: dictionary.admin.integrationMarketplaceCancelReasonRequired,
        cargoSenderNumberLabel: dictionary.admin.integrationMarketplaceCargoSenderNumberLabel,
        cargoTrackingLinkLabel: dictionary.admin.integrationMarketplaceCargoTrackingLinkLabel,
      }}
    />
  );
}
