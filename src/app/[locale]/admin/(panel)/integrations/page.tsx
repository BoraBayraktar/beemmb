import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { integrationService } from "@/modules/integration/services/integration.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { IntegrationManager } from "@/ui/admin/integration-manager";

export default async function AdminIntegrationsPage({
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

  const [jobs, deadLetters, trendyolDashboard, n11Dashboard, pazaramaDashboard, hepsiburadaDashboard] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      integrationService.listJobs({ page: 1, pageSize: 20 }),
      integrationService.listDeadLetters(),
      marketplaceIntegrationService.getDashboard({ channel: "TRENDYOL" }),
      marketplaceIntegrationService.getDashboard({ channel: "N11" }),
      marketplaceIntegrationService.getDashboard({ channel: "PAZARAMA" }),
      marketplaceIntegrationService.getDashboard({ channel: "HEPSIBURADA" }),
    ]),
  );

  return (
    <IntegrationManager
      locale={locale}
      canManage={await rbacService.hasPermission(user, "integrations.manage")}
      initialJobs={jobs.items}
      initialDeadLetters={deadLetters.items}
      marketplaceCapabilities={[
        { channel: "TRENDYOL", capabilities: trendyolDashboard.capabilities },
        { channel: "N11", capabilities: n11Dashboard.capabilities },
        { channel: "PAZARAMA", capabilities: pazaramaDashboard.capabilities },
        { channel: "HEPSIBURADA", capabilities: hepsiburadaDashboard.capabilities },
      ]}
      labels={{
        title: dictionary.admin.integrationManager,
        subtitle: dictionary.admin.integrationSubtitle,
        createJob: dictionary.admin.integrationCreateJob,
        processQueue: dictionary.admin.integrationProcessQueue,
        deadLetters: dictionary.admin.integrationDeadLetters,
        deadLettersEmpty: dictionary.admin.integrationDeadLettersEmpty,
        jobs: dictionary.admin.integrationJobs,
        channel: dictionary.admin.integrationChannel,
        jobType: dictionary.admin.integrationJobType,
        status: dictionary.admin.integrationStatus,
        entityId: dictionary.admin.integrationEntityId,
        marketplaceOverview: dictionary.admin.integrationMarketplaceOverview,
        marketplaceOverviewHint: dictionary.admin.integrationMarketplaceOverviewHint,
        marketplaceCapabilitySummary: dictionary.admin.integrationMarketplaceCapabilitySummary,
        capabilityAvailable: dictionary.admin.integrationMarketplaceCapabilityAvailable,
        capabilityLimited: dictionary.admin.integrationMarketplaceCapabilityLimited,
        capabilityInvoicedStatus: dictionary.admin.integrationMarketplaceCapabilityInvoicedStatus,
        capabilityPackageSplit: dictionary.admin.integrationMarketplaceCapabilityPackageSplit,
        capabilityBrandMapping: dictionary.admin.integrationMarketplaceCapabilityBrandMapping,
        capabilityCategoryMapping: dictionary.admin.integrationMarketplaceCapabilityCategoryMapping,
        capabilityAttributeMapping: dictionary.admin.integrationMarketplaceCapabilityAttributeMapping,
        capabilityAdvancedPreflight: dictionary.admin.integrationMarketplaceCapabilityAdvancedPreflight,
        filterByChannel: dictionary.admin.integrationFilterByChannel,
        activeFilters: dictionary.admin.integrationActiveFilters,
        recentActivity: dictionary.admin.integrationRecentActivity,
        noExternalReference: dictionary.admin.integrationNoExternalReference,
        noActionAvailable: dictionary.admin.integrationNoActionAvailable,
        actionWaitingQueue: dictionary.admin.integrationActionWaitingQueue,
        actionProcessingQueue: dictionary.admin.integrationActionProcessingQueue,
        actionReviewError: dictionary.admin.integrationActionReviewError,
        actionTrackDeadLetter: dictionary.admin.integrationActionTrackDeadLetter,
        openJobDetail: dictionary.admin.integrationOpenJobDetail,
        jobDetailTitle: dictionary.admin.integrationJobDetailTitle,
        jobDetailDescription: dictionary.admin.integrationJobDetailDescription,
        requestPayload: dictionary.admin.integrationRequestPayload,
        responsePayload: dictionary.admin.integrationResponsePayload,
        payloadEmpty: dictionary.admin.integrationPayloadEmpty,
        payloadReference: dictionary.admin.integrationPayloadReference,
        payloadTrigger: dictionary.admin.integrationPayloadTrigger,
        payloadBatch: dictionary.admin.integrationPayloadBatch,
        payloadSku: dictionary.admin.integrationPayloadSku,
        attemptProgress: dictionary.admin.integrationAttemptProgress,
        lastAttemptAt: dictionary.admin.integrationLastAttemptAt,
        processedAt: dictionary.admin.integrationProcessedAt,
        channelTrendyol: dictionary.admin.integrationChannelTrendyol,
        channelN11: dictionary.admin.integrationChannelN11,
        channelPazarama: dictionary.admin.integrationChannelPazarama,
        channelHepsiburada: dictionary.admin.integrationChannelHepsiburada,
        channelEDocsMock: dictionary.admin.integrationChannelEDocsMock,
        jobTypeProductSync: dictionary.admin.integrationJobTypeProductSync,
        jobTypePriceSync: dictionary.admin.integrationJobTypePriceSync,
        jobTypeStockSync: dictionary.admin.integrationJobTypeStockSync,
        jobTypeOrderImport: dictionary.admin.integrationJobTypeOrderImport,
        jobTypeOrderStatusSync: dictionary.admin.integrationJobTypeOrderStatusSync,
        jobTypeDocumentOutbound: dictionary.admin.integrationJobTypeDocumentOutbound,
        jobTypeDocumentStatusSync: dictionary.admin.integrationJobTypeDocumentStatusSync,
        statusPending: dictionary.admin.integrationStatusPending,
        statusProcessing: dictionary.admin.integrationStatusProcessing,
        statusSuccess: dictionary.admin.integrationStatusSuccess,
        statusFailed: dictionary.admin.integrationStatusFailed,
        statusDeadLetter: dictionary.admin.integrationStatusDeadLetter,
        entityProduct: dictionary.admin.integrationEntityProduct,
        entityMarketplaceAccount: dictionary.admin.integrationEntityMarketplaceAccount,
        entityMarketplacePackage: dictionary.admin.integrationEntityMarketplacePackage,
        entityOrder: dictionary.admin.integrationEntityOrder,
        entityBusinessDocument: dictionary.admin.integrationEntityBusinessDocument,
        targetEntityType: dictionary.admin.integrationTargetEntityType,
        actions: dictionary.admin.integrationActions,
        retry: dictionary.admin.integrationRetry,
        operationFailed: dictionary.admin.operationFailed,
        loading: dictionary.common.loading,
        forceFail: dictionary.admin.integrationForceFail,
        openCreateDrawer: dictionary.admin.integrationOpenCreateDrawer,
        openProcessDrawer: dictionary.admin.integrationOpenProcessDrawer,
        drawerCreateTitle: dictionary.admin.integrationDrawerCreateTitle,
        drawerProcessTitle: dictionary.admin.integrationDrawerProcessTitle,
        drawerDescription: dictionary.admin.integrationDrawerDescription,
        entityIds: dictionary.admin.integrationEntityIds,
        entityIdsHint: dictionary.admin.integrationEntityIdsHint,
        entityIdsProductHint: dictionary.admin.integrationEntityIdsProductHint,
        entityIdsMarketplaceAccountHint: dictionary.admin.integrationEntityIdsMarketplaceAccountHint,
        entityIdsMarketplacePackageHint: dictionary.admin.integrationEntityIdsMarketplacePackageHint,
        entityIdsBusinessDocumentHint: dictionary.admin.integrationEntityIdsBusinessDocumentHint,
        stockSyncHint: dictionary.admin.integrationStockSyncHint,
        genericSyncHint: dictionary.admin.integrationGenericSyncHint,
        maxAttempts: dictionary.admin.integrationMaxAttempts,
        idempotencySuffix: dictionary.admin.integrationIdempotencySuffix,
        integrationReference: dictionary.admin.integrationReference,
        trigger: dictionary.admin.integrationTrigger,
        triggerPreset: dictionary.admin.integrationTriggerPreset,
        stockSyncReferenceHint: dictionary.admin.integrationStockSyncReferenceHint,
        stockSyncTriggerHint: dictionary.admin.integrationStockSyncTriggerHint,
        triggerManualDispatch: dictionary.admin.integrationTriggerManualDispatch,
        triggerManualAdjustment: dictionary.admin.integrationTriggerManualAdjustment,
        triggerOrderCommit: dictionary.admin.integrationTriggerOrderCommit,
        triggerStockCount: dictionary.admin.integrationTriggerStockCount,
        triggerTransfer: dictionary.admin.integrationTriggerTransfer,
        triggerPurchaseReceipt: dictionary.admin.integrationTriggerPurchaseReceipt,
        triggerPriceUpdate: dictionary.admin.integrationTriggerPriceUpdate,
        triggerProductUpdate: dictionary.admin.integrationTriggerProductUpdate,
        queueLimit: dictionary.admin.integrationQueueLimit,
        apply: dictionary.admin.inventoryApplyAdjustment,
        close: dictionary.admin.cancel,
        filterSearch: dictionary.admin.integrationFilterSearch,
        filterStatus: dictionary.admin.integrationStatus,
        filterChannel: dictionary.admin.integrationChannel,
        filterJobType: dictionary.admin.integrationJobType,
        clearFilters: dictionary.admin.clearFilters,
        summaryPending: dictionary.admin.integrationSummaryPending,
        summaryProcessing: dictionary.admin.integrationSummaryProcessing,
        summarySuccess: dictionary.admin.integrationSummarySuccess,
        summaryFailed: dictionary.admin.integrationSummaryFailed,
        summaryDeadLetter: dictionary.admin.integrationSummaryDeadLetter,
        emptyJobs: dictionary.admin.integrationEmptyJobs,
        nextAttemptAt: dictionary.admin.integrationNextAttemptAt,
        lastError: dictionary.admin.integrationLastError,
        createdAt: dictionary.admin.integrationCreatedAt,
        externalReference: dictionary.admin.integrationExternalReference,
        batchResult: dictionary.admin.integrationBatchResult,
        batchResultHint: dictionary.admin.integrationBatchResultHint,
        checkBatchResult: dictionary.admin.integrationCheckBatchResult,
        batchResultEmpty: dictionary.admin.integrationBatchResultEmpty,
        batchCheckedAt: dictionary.admin.integrationBatchCheckedAt,
        batchIssueSummary: dictionary.admin.integrationBatchIssueSummary,
        batchIssueStatus: dictionary.admin.integrationBatchIssueStatus,
        batchIssueReason: dictionary.admin.integrationBatchIssueReason,
        batchIssueRecommendedAction: dictionary.admin.integrationBatchIssueRecommendedAction,
        all: dictionary.admin.statusAll,
        validationEntityIds: dictionary.admin.integrationValidationEntityIds,
        validationQueueLimit: dictionary.admin.integrationValidationQueueLimit,
      }}
    />
  );
}
