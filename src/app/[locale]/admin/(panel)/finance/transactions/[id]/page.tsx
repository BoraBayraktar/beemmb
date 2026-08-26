import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CashTransactionDetailManager } from "@/ui/admin/cash-transaction-detail-manager";

export default async function AdminCashTransactionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "financeTransactions.manage"))) {
    notFound();
  }

  const detail = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => cashTransactionsService.getTransactionDetail(id),
  );
  if (!detail) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <CashTransactionDetailManager
      locale={locale}
      detail={detail}
      labels={{
        back: dictionary.admin.financeCashTransactionDetailBack,
        title: dictionary.admin.financeCashTransactionsTitleField,
        account: dictionary.admin.financeCashTransactionsAccount,
        amount: dictionary.admin.financeCashTransactionsAmount,
        date: dictionary.admin.financeCashTransactionsDate,
        direction: dictionary.admin.financeCashTransactionsAllDirections,
        sourceType: dictionary.admin.financeCashTransactionsSourceType,
        counterparty: dictionary.admin.financeCashTransactionsCounterparty,
        note: dictionary.admin.financeCashTransactionsNote,
        openLedger: dictionary.admin.financeCashTransactionsOpenLedger,
        allocationTitle: dictionary.admin.financeAllocationTitle,
        allocationEmpty: dictionary.admin.financeAllocationEmpty,
        allocationTarget: dictionary.admin.financeAllocationTarget,
        allocationAmount: dictionary.admin.financeAllocationAmount,
        allocationMismatch: dictionary.admin.financeAllocationMismatch,
        notSpecified: dictionary.common.notSpecified,
        incoming: dictionary.admin.financeCashTransactionsIncoming,
        outgoing: dictionary.admin.financeCashTransactionsOutgoing,
        transfer: dictionary.admin.financeCashTransactionsTransfer,
      }}
    />
  );
}
