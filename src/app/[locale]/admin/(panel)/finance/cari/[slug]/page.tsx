import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { counterpartyLedgerService } from "@/modules/finance/services/counterparty-ledger.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CounterpartyLedgerManager } from "@/ui/admin/counterparty-ledger-manager";

export default async function AdminCariLedgerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "cari.manage"))) {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);
  const result = await counterpartyLedgerService.getCariLedger(locale, decodedSlug);

  if (!result) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <CounterpartyLedgerManager
      locale={locale}
      backHref={`/${locale}/admin/finance/accounts`}
      result={result}
      labels={{
        back: dictionary.admin.financeCounterpartyLedgerBack,
        counterparty: dictionary.admin.financeCounterpartyLedgerCounterparty,
        openBalance: dictionary.admin.financeCounterpartyLedgerOpenBalance,
        movementCount: dictionary.admin.financeCounterpartyLedgerMovementCount,
        collectionOrPaymentCount: dictionary.admin.financeCounterpartyLedgerCollectionPaymentCount,
        documentCount: dictionary.admin.financeCounterpartyLedgerDocumentCount,
        occurredAt: dictionary.admin.financeCounterpartyLedgerOccurredAt,
        amount: dictionary.admin.financeAccountsAmount,
        runningBalance: dictionary.admin.financeCounterpartyLedgerRunningBalance,
        status: dictionary.admin.financeAccountsStatus,
        openSource: dictionary.admin.financeAccountsOpenSource,
        openFinanceRoute: dictionary.admin.financeAccountsOpenFinanceRoute,
        empty: dictionary.admin.financeCounterpartyLedgerEmpty,
        notSpecified: dictionary.common.notSpecified,
        defaultPaymentTermSummary: dictionary.admin.financeCounterpartyLedgerFinanceTermsTitle,
        lastMovementAt: dictionary.admin.financeCounterpartyLedgerLastMovementAt,
      }}
    />
  );
}
