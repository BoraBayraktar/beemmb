import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { ReceivableDetailManager } from "@/ui/admin/receivable-detail-manager";

export default async function AdminReceivableDetailPage({
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

  const item = await receivablesService.getReceivableByOrderId(orderId, locale);
  if (!item) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <ReceivableDetailManager
      locale={locale}
      item={item}
      labels={{
        title: dictionary.admin.documentsCounterparty,
        description: dictionary.admin.financeReceivableDetailDescription,
        paymentStatus: dictionary.admin.paymentStatus,
        totalAmount: dictionary.admin.orderTotal,
        itemCount: dictionary.admin.orderItems,
        orderDate: dictionary.admin.orderDate,
        latestDocument: dictionary.admin.financeReceivablesLatestDocument,
        backToList: dictionary.admin.financeDetailBackToList,
        openOrder: dictionary.admin.financeReceivablesOpenOrder,
        notSpecified: dictionary.common.notSpecified,
        documentsTitle: dictionary.admin.financeReceivableDocumentsTitle,
        openCollection: dictionary.admin.financeReceivableOpenCollection,
        financeDocumentMovementPreviewOpen: dictionary.admin.financeDocumentMovementPreviewOpen,
        counterpartyFinanceHint: item.counterpartyFinanceTerms?.collectionOrPaymentDueHint ?? null,
      }}
    />
  );
}
