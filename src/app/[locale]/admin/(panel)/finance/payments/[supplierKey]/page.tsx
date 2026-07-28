import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { inventoryPayableSummaryService } from "@/modules/finance/services/inventory-payable-summary.service";
import { payablesService } from "@/modules/finance/services/payables.service";
import { paymentsService } from "@/modules/finance/services/payments.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { FinanceManualAllocationPanel } from "@/ui/admin/finance-manual-allocation-panel";
import { SupplierPayableDetailManager } from "@/ui/admin/supplier-payable-detail-manager";

export default async function AdminPaymentDetailPage({
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

  const decodedSupplierKey = decodeURIComponent(supplierKey);
  const payableItem = await payablesService.getSupplierPayableByKey(decodedSupplierKey);

  if (!payableItem) {
    notFound();
  }

  const [paymentItem, allocationContexts] = await Promise.all([
    paymentsService.getPaymentReadinessBySupplierKey(locale, decodedSupplierKey),
    payableItem.supplierId
      ? paymentsService.listSupplierAllocationContexts(payableItem.supplierId, locale)
      : Promise.resolve([]),
  ]);

  if (!paymentItem) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  const inventorySummary = await inventoryPayableSummaryService.buildSummary(
    locale,
    payableItem.documents.map((document) => ({
      id: document.id,
      documentNumber: document.documentNumber,
      inventoryTransactionId: document.inventoryTransactionId,
      inventoryTransactionNumber: document.inventoryTransactionNumber,
      lines: document.lines.map((line) => ({ quantity: line.quantity })),
    })),
  );

  return (
    <div className="space-y-6">
      <SupplierPayableDetailManager
        locale={locale}
        item={payableItem}
        inventorySummary={inventorySummary}
        labels={{
          title: dictionary.admin.financePaymentsTitle,
          description: dictionary.admin.financePaymentDetailDescription,
          totalAmount: dictionary.admin.financeSupplierPayablesTotalAmount,
          documentCount: dictionary.admin.financeSupplierPayablesDocumentCount,
          draftCount: dictionary.admin.financeSupplierPayablesDraftCount,
          lastIssueDate: dictionary.admin.financeSupplierPayablesLastIssueDate,
          documentNumber: dictionary.admin.documentsDocumentNumber,
          documentType: dictionary.admin.documentsDocumentType,
          documentStatus: dictionary.admin.documentsDocumentStatus,
          orderNumber: dictionary.admin.documentsOrderNumber,
          inventoryTransactionNumber: dictionary.admin.documentsInventoryTransactionNumber,
          backToList: dictionary.admin.financeDetailBackToPayments,
          openDocuments: dictionary.admin.financePaymentsOpenSource,
          notSpecified: dictionary.common.notSpecified,
          financeDocumentMovementPreviewOpen: dictionary.admin.financeDocumentMovementPreviewOpen,
          inventoryPayableSummaryTitle: dictionary.admin.financeInventoryPayableSummaryTitle,
          inventoryPayableSummaryLinkedCount: dictionary.admin.financeInventoryPayableSummaryLinkedCount,
          inventoryPayableSummaryLineQuantity: dictionary.admin.financeInventoryPayableSummaryLineQuantity,
          inventoryPayableSummaryInventoryTransaction: dictionary.admin.financeInventoryPayableSummaryInventoryTransaction,
          inventoryPayableSummaryLineQuantityLabel: dictionary.admin.financeInventoryPayableSummaryLineQuantityLabel,
          inventoryPayableSummaryOpenInventory: dictionary.admin.financeInventoryPayableSummaryOpenInventory,
          inventoryPayableSummaryEmpty: dictionary.admin.financeInventoryPayableSummaryEmpty,
          counterpartyFinanceHint: paymentItem.counterpartyFinanceTerms?.collectionOrPaymentDueHint ?? null,
        }}
      />
      <FinanceManualAllocationPanel
        mode="payment"
        contexts={allocationContexts}
        labels={{
          title: dictionary.admin.financeManualAllocationTitle,
          record: dictionary.admin.financeManualAllocationRecord,
          line: dictionary.admin.financeManualAllocationLine,
          amount: dictionary.admin.financeAllocationAmount,
          addLine: dictionary.admin.financeManualAllocationAddLine,
          save: dictionary.admin.financeManualAllocationSave,
          saving: dictionary.admin.financeManualAllocationSaving,
          success: dictionary.admin.financeManualAllocationSuccess,
          failed: dictionary.admin.financeManualAllocationFailed,
          allocationTitle: dictionary.admin.financeAllocationTitle,
          allocationEmpty: dictionary.admin.financeAllocationEmpty,
          allocationTarget: dictionary.admin.financeAllocationTarget,
          allocationAmount: dictionary.admin.financeAllocationAmount,
          allocationMismatch: dictionary.admin.financeAllocationMismatch,
        }}
      />
    </div>
  );
}
