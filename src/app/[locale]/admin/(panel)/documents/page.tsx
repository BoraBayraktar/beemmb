import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { commerceService } from "@/modules/commerce/services/commerce.service";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";
import { documentService } from "@/modules/documents/services/document.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { DocumentManager } from "@/ui/admin/document-manager";

export default async function AdminDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const [result, providerConfigs, suppliers, customerAccounts, orders, transactions] = await Promise.all([
    documentService.listBusinessDocuments({
      search: resolvedSearchParams.search,
      page: 1,
      pageSize: 50,
    }),
    documentService.listProviderConfigs(),
    catalogAdminService.listSuppliers(),
    customerAccountService.listCustomerAccounts(),
    commerceService.listOrders({
      page: 1,
      pageSize: 50,
    }),
    inventoryService.listInventoryTransactions({
      page: 1,
      pageSize: 20,
    }),
  ]);

  return (
    <DocumentManager
      locale={locale}
      result={result}
      providerOptions={providerConfigs.map((item) => ({
        id: item.id,
        displayName: item.displayName,
        isDefault: item.isDefault,
      }))}
      supplierOptions={suppliers.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.taxNumber ?? item.email ?? item.phone ?? null,
      }))}
      customerAccountOptions={customerAccounts.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.email ?? item.phone ?? item.taxNumber ?? null,
      }))}
      orderOptions={orders.items.map((item) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        description: item.customerAccountName ?? null,
      }))}
      transactionOptions={transactions.items.map((item) => ({
        id: item.id,
        transactionNumber: item.transactionNumber,
        description: item.sourceDocument.counterpartyName ?? item.note ?? item.reference ?? null,
      }))}
      labels={{
        title: dictionary.admin.documentManager,
        description: dictionary.admin.documentsDescription,
        createTitle: dictionary.admin.documentsCreateTitle,
        listTitle: dictionary.admin.documentsMenuOverview,
        filterDocumentType: dictionary.admin.documentsDocumentType,
        filterStatus: dictionary.admin.documentsDocumentStatus,
        filterSyncStatus: dictionary.admin.documentsExternalSystemStatus,
        filterAllDocumentTypes: "Tüm belge tipleri",
        filterAllStatuses: dictionary.admin.allStatuses,
        filterAllSyncStatuses: "Tüm dış sistem durumları",
        sort: "Sıralama",
        sortNewest: "Tarih: En yeni",
        sortOldest: "Tarih: En eski",
        sortNumberAsc: "Belge no A-Z",
        sortNumberDesc: "Belge no Z-A",
        documentNumber: dictionary.admin.documentsDocumentNumber,
        documentType: dictionary.admin.documentsDocumentType,
        documentStatus: dictionary.admin.documentsDocumentStatus,
        issueDate: dictionary.admin.documentsIssueDate,
        counterparty: dictionary.admin.documentsCounterparty,
        externalReference: dictionary.admin.documentsExternalReference,
        externalSystemStatus: dictionary.admin.documentsExternalSystemStatus,
        orderNumber: dictionary.admin.documentsOrderNumber,
        inventoryTransactionNumber: dictionary.admin.documentsInventoryTransactionNumber,
        sourcePrimary: "Birincil kaynak",
        sourceSecondary: "İkincil kaynak",
        sourceHelper: "Varsayılan akışta tek bir kaynak seçmeniz yeterlidir. İhtiyaç halinde ikinci bir kaynak da bağlayabilirsiniz.",
        selectOrderSource: "Sipariş seç",
        selectInventoryTransactionSource: "Stok işlemi seç",
        searchOrderSource: "Sipariş ara",
        searchInventoryTransactionSource: "Stok işlemi ara",
        noOrderSourceResults: "Eşleşen sipariş bulunamadı.",
        noInventoryTransactionSourceResults: "Eşleşen stok işlemi bulunamadı.",
        note: dictionary.admin.documentsNote,
        create: dictionary.admin.documentsCreateAction,
        save: dictionary.admin.save,
        cancel: dictionary.admin.cancel,
        edit: dictionary.admin.edit,
        saving: dictionary.common.loading,
        search: dictionary.admin.documentsSearch,
        noResults: dictionary.admin.documentsNoResults,
        viewLines: dictionary.admin.documentsViewLines,
        notSpecified: dictionary.common.notSpecified,
        queueDispatch: dictionary.admin.documentsQueueDispatch,
        queueing: dictionary.admin.documentsQueueing,
        dispatchHistory: dictionary.admin.documentsDispatchHistory,
        dispatchProvider: dictionary.admin.documentsDispatchProvider,
        dispatchError: dictionary.admin.documentsDispatchError,
        dispatchQueuedAt: dictionary.admin.documentsDispatchQueuedAt,
        noDispatchHistory: dictionary.admin.documentsNoDispatchHistory,
        lifecycleHistory: "Belge yaşam döngüsü ve kanıt",
        noLifecycleHistory: "Bu belge için yaşam döngüsü kaydı bulunmuyor.",
        lifecycleMessageEvidence: "Mesaj kanıtı",
        lifecyclePayloadHash: "Payload hash",
        lifecycleRequestId: "Request ID",
        lifecycleIntegrationJobId: "Entegrasyon işi",
        providerSelection: dictionary.admin.documentsProviderSelection,
        providerNone: dictionary.admin.documentsProviderNone,
        queueStatusSync: dictionary.admin.documentsQueueStatusSync,
        statusSyncing: dictionary.admin.documentsStatusSyncing,
        generateXml: "UBL-TR XML üret",
        generatingXml: "XML üretiliyor",
        xmlArtifacts: "UBL-TR XML çıktıları",
        noXmlArtifacts: "Bu belge için henüz UBL-TR XML çıktısı yok.",
        xmlValidationStatus: "Doğrulama durumu",
        xmlDownload: "XML indir",
        complianceReport: "GİB uyumluluk raporu",
        officialSchemaReady: "Resmi XSD hazır",
        officialSchematronReady: "Resmi Schematron hazır",
        schemaHash: "XSD SHA-256",
        schematronHash: "Schematron SHA-256",
        localRuleValid: "Yerel kurallar geçerli",
        xsdValidationReady: "XSD doğrulama hazır",
        schematronValidationReady: "Schematron doğrulama hazır",
        validationEngineReady: "Resmi doğrulama motoru hazır",
        providerReady: "Canlı e-belge provider hazır",
        providerMode: "E-belge provider modu",
        registeredProviderAdapters: "Kayıtlı provider adapterları",
        adapterConfigured: "Konfigüre",
        adapterOperational: "Operasyonel",
        productionChecklist: "Üretim checklisti",
        liveProviderTestScenarios: "Canlı provider test senaryoları",
        requiredEvidence: "Gerekli kanıt",
        configReadiness: "E-belge hazırlık durumu",
        configReady: "Tüm e-belge ayarları hazır.",
        configMissing: "Eksik e-belge ayarları var.",
        badgeNotSent: dictionary.admin.documentsBadgeNotSent,
        badgeQueued: dictionary.admin.documentsBadgeQueued,
        badgeSent: dictionary.admin.documentsBadgeSent,
        badgeFailed: dictionary.admin.documentsBadgeFailed,
        slaAttention: dictionary.admin.documentsSlaAttention,
        slaCritical: dictionary.admin.documentsSlaCritical,
        slaQueuedStale: dictionary.admin.documentsSlaQueuedStale,
        selectSupplier: dictionary.admin.documentsSelectSupplier,
        selectCustomerAccount: dictionary.admin.documentsSelectCustomerAccount,
        searchCounterparty: dictionary.admin.documentsSearchCounterparty,
        noCounterpartyResults: dictionary.admin.documentsNoCounterpartyResults,
        empty: dictionary.admin.documentsNoResults,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        importCsv: dictionary.admin.importCsv,
        exportCsv: dictionary.admin.exportCsv,
        close: dictionary.admin.documentsDrawerClose,
        financeDocumentMovementPreviewOpen: dictionary.admin.financeDocumentMovementPreviewOpen,
      }}
    />
  );
}
