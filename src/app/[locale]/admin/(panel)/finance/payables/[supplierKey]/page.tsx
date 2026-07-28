import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { payablesService } from "@/modules/finance/services/payables.service";
import { inventoryPayableSummaryService } from "@/modules/finance/services/inventory-payable-summary.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { SupplierPayableDetailManager } from "@/ui/admin/supplier-payable-detail-manager";

export default async function AdminSupplierPayableDetailPage({
  params,
}: {
  params: Promise<{ locale: string; supplierKey: string }>;
}) {
  const { locale, supplierKey } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const item = await payablesService.getSupplierPayableByKey(decodeURIComponent(supplierKey));
  if (!item) {
    notFound();
  }

  const inventorySummary = await inventoryPayableSummaryService.buildSummary(
    locale,
    item.documents.map((document) => ({
      id: document.id,
      documentNumber: document.documentNumber,
      inventoryTransactionId: document.inventoryTransactionId,
      inventoryTransactionNumber: document.inventoryTransactionNumber,
      lines: document.lines.map((line) => ({ quantity: line.quantity })),
    })),
  );

  const dictionary = getDictionary(locale as Locale);

  return (
    <SupplierPayableDetailManager
      locale={locale}
      item={item}
      inventorySummary={inventorySummary}
      labels={{
        title: dictionary.admin.financeSupplierPayablesTitle,
        description: dictionary.admin.financeSupplierPayableDetailDescription,
        totalAmount: dictionary.admin.financeSupplierPayablesTotalAmount,
        documentCount: dictionary.admin.financeSupplierPayablesDocumentCount,
        draftCount: dictionary.admin.financeSupplierPayablesDraftCount,
        lastIssueDate: dictionary.admin.financeSupplierPayablesLastIssueDate,
        documentNumber: dictionary.admin.documentsDocumentNumber,
        documentType: dictionary.admin.documentsDocumentType,
        documentStatus: dictionary.admin.documentsDocumentStatus,
        orderNumber: dictionary.admin.documentsOrderNumber,
        inventoryTransactionNumber: dictionary.admin.documentsInventoryTransactionNumber,
        backToList: dictionary.admin.financeDetailBackToList,
        openDocuments: dictionary.admin.financeOpenDocuments,
        notSpecified: dictionary.common.notSpecified,
        financeDocumentMovementPreviewOpen: dictionary.admin.financeDocumentMovementPreviewOpen,
        inventoryPayableSummaryTitle: dictionary.admin.financeInventoryPayableSummaryTitle,
        inventoryPayableSummaryLinkedCount: dictionary.admin.financeInventoryPayableSummaryLinkedCount,
        inventoryPayableSummaryLineQuantity: dictionary.admin.financeInventoryPayableSummaryLineQuantity,
        inventoryPayableSummaryInventoryTransaction: dictionary.admin.financeInventoryPayableSummaryInventoryTransaction,
        inventoryPayableSummaryLineQuantityLabel: dictionary.admin.financeInventoryPayableSummaryLineQuantityLabel,
        inventoryPayableSummaryOpenInventory: dictionary.admin.financeInventoryPayableSummaryOpenInventory,
        inventoryPayableSummaryEmpty: dictionary.admin.financeInventoryPayableSummaryEmpty,
        counterpartyFinanceHint: null,
      }}
    />
  );
}
