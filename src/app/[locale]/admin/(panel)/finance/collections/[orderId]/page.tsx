import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { collectionsService } from "@/modules/finance/services/collections.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { FinanceManualAllocationPanel } from "@/ui/admin/finance-manual-allocation-panel";
import { ReceivableDetailManager } from "@/ui/admin/receivable-detail-manager";

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const [collectionItem, receivableItem, allocationContexts] = await Promise.all([
    collectionsService.getCollectionReadinessByOrderId(locale, orderId),
    receivablesService.getReceivableByOrderId(orderId, locale),
    collectionsService.listOrderAllocationContexts(orderId, locale),
  ]);

  if (!collectionItem || !receivableItem) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <div className="space-y-6">
      <ReceivableDetailManager
        locale={locale}
        item={receivableItem}
        labels={{
          title: dictionary.admin.documentsCounterparty,
          description: dictionary.admin.financeCollectionDetailDescription,
          paymentStatus: dictionary.admin.paymentStatus,
          totalAmount: dictionary.admin.orderTotal,
          itemCount: dictionary.admin.orderItems,
          orderDate: dictionary.admin.orderDate,
          latestDocument: dictionary.admin.financeReceivablesLatestDocument,
          backToList: dictionary.admin.financeDetailBackToCollections,
          openOrder: dictionary.admin.financeCollectionsOpenSource,
          notSpecified: dictionary.common.notSpecified,
          documentsTitle: dictionary.admin.financeReceivableDocumentsTitle,
          openCollection: dictionary.admin.financeReceivableOpenCollection,
          financeDocumentMovementPreviewOpen: dictionary.admin.financeDocumentMovementPreviewOpen,
          counterpartyFinanceHint: receivableItem.counterpartyFinanceTerms?.collectionOrPaymentDueHint ?? null,
        }}
      />
      <FinanceManualAllocationPanel
        mode="collection"
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
