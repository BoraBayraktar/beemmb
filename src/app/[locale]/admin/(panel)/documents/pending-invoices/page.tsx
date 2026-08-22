import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { documentService } from "@/modules/documents/services/document.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { PendingInvoiceManager } from "@/ui/admin/pending-invoice-manager";

export default async function AdminPendingInvoicesPage({
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

  if (!(await rbacService.hasPermission(user, "documentsPendingInvoices.manage"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const result = await documentService.listPendingInvoiceDeliveryNotes({
    search: resolvedSearchParams.search,
    page: 1,
    pageSize: 20,
  });

  return (
    <PendingInvoiceManager
      locale={locale}
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      labels={{
        title: dictionary.admin.documentsPendingInvoicesTitle,
        description: dictionary.admin.documentsPendingInvoicesDescription,
        search: dictionary.admin.documentsSearch,
        noResults: dictionary.admin.documentsPendingInvoicesEmpty,
        viewDetail: dictionary.admin.documentsPendingInvoicesDetailAction,
        notSpecified: dictionary.common.notSpecified,
        issueDate: dictionary.admin.documentsIssueDate,
        counterparty: dictionary.admin.documentsCounterparty,
        orderNumber: dictionary.admin.documentsOrderNumber,
        inventoryTransactionNumber: dictionary.admin.documentsInventoryTransactionNumber,
        providerSelection: dictionary.admin.documentsProviderSelection,
        externalReference: dictionary.admin.documentsExternalReference,
        documentStatus: dictionary.admin.documentsDocumentStatus,
        externalSystemStatus: dictionary.admin.documentsExternalSystemStatus,
        close: dictionary.admin.documentsDrawerClose,
        linesTitle: dictionary.admin.documentsViewLines,
        sourceLabel: dictionary.admin.documentsPendingInvoicesSource,
        createInvoice: dictionary.admin.documentsPendingInvoicesCreateInvoice,
        creatingInvoice: dictionary.admin.documentsPendingInvoicesCreatingInvoice,
        createAndQueueInvoice: dictionary.admin.documentsPendingInvoicesCreateAndQueueInvoice,
        creatingAndQueueingInvoice: dictionary.admin.documentsPendingInvoicesCreatingAndQueueInvoice,
        createInvoiceSuccess: dictionary.admin.documentsPendingInvoicesCreateInvoiceSuccess,
        createInvoiceFailed: dictionary.admin.documentsPendingInvoicesCreateInvoiceFailed,
        queueInvoiceSuccess: dictionary.admin.documentsPendingInvoicesQueueInvoiceSuccess,
        queueInvoiceFailed: dictionary.admin.documentsPendingInvoicesQueueInvoiceFailed,
        badgeCreated: dictionary.admin.documentsPendingInvoicesBadgeCreated,
        badgeQueued: dictionary.admin.documentsPendingInvoicesBadgeQueued,
        badgeSent: dictionary.admin.documentsPendingInvoicesBadgeSent,
      }}
    />
  );
}
