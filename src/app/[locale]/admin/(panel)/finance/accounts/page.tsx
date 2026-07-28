import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { financeAccountEntryProjectionService } from "@/modules/finance/services/finance-account-entry-projection.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { FinanceAccountsManager } from "@/ui/admin/finance-accounts-manager";

export default async function AdminFinanceAccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; type?: string }>;
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
  const type =
    resolvedSearchParams.type === "RECEIVABLE" || resolvedSearchParams.type === "PAYABLE"
      ? resolvedSearchParams.type
      : "all";

  const result = await financeAccountEntryProjectionService.listAccountEntries(locale, {
    search: resolvedSearchParams.search,
    type,
  });

  return (
    <FinanceAccountsManager
      locale={locale}
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      initialType={type}
      labels={{
        title: dictionary.admin.financeAccountsTitle,
        description: dictionary.admin.financeAccountsDescription,
        search: dictionary.admin.financeAccountsSearch,
        allTypes: dictionary.admin.financeAccountsAllTypes,
        receivable: dictionary.admin.financeAccountsReceivable,
        payable: dictionary.admin.financeAccountsPayable,
        receivableCount: dictionary.admin.financeAccountsReceivableCount,
        payableCount: dictionary.admin.financeAccountsPayableCount,
        totalReceivableAmount: dictionary.admin.financeAccountsTotalReceivableAmount,
        totalPayableAmount: dictionary.admin.financeAccountsTotalPayableAmount,
        counterparty: dictionary.admin.documentsCounterparty,
        sourceNumber: dictionary.admin.financeAccountsSourceNumber,
        sourceDate: dictionary.admin.financeAccountsSourceDate,
        status: dictionary.admin.financeAccountsStatus,
        amount: dictionary.admin.financeAccountsAmount,
        openFinanceRoute: dictionary.admin.financeAccountsOpenFinanceRoute,
        openSource: dictionary.admin.financeAccountsOpenSource,
        openCounterpartyLedger: dictionary.admin.financeAccountsOpenCounterpartyLedger,
        openDetail: dictionary.admin.financeCollectionsOpenDetail,
        openFinanceMovementPreview: dictionary.admin.financeDocumentMovementPreviewOpen,
        noResults: dictionary.admin.financeAccountsEmpty,
        cancel: dictionary.admin.cancel,
      }}
    />
  );
}
