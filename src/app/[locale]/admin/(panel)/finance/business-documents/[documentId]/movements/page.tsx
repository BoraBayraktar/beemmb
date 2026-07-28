import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { documentFinancePreviewService } from "@/modules/finance/services/document-finance-preview.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { FinanceDocumentMovementPreviewManager } from "@/ui/admin/finance-document-movement-preview-manager";

export default async function AdminFinanceDocumentMovementPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; documentId: string }>;
}) {
  const { locale, documentId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const preview = await documentFinancePreviewService.getPreview(locale, documentId);
  if (!preview) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <FinanceDocumentMovementPreviewManager
      locale={locale}
      preview={preview}
      labels={{
        title: dictionary.admin.financeDocumentMovementPreviewTitle,
        empty: dictionary.admin.financeDocumentMovementPreviewEmpty,
        documentAmount: dictionary.admin.financeDocumentMovementPreviewDocumentAmount,
        allocatedAmount: dictionary.admin.financeDocumentMovementPreviewAllocatedAmount,
        openFinanceRoute: dictionary.admin.financeDocumentMovementPreviewOpenRoute,
        occurredAt: dictionary.admin.financeCounterpartyLedgerOccurredAt,
        amount: dictionary.admin.financeAllocationAmount,
        backToDocuments: dictionary.admin.financeDocumentMovementPreviewBackToDocuments,
      }}
    />
  );
}
