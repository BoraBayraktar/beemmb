import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinancialAccountDetailManager } from "@/ui/admin/financial-account-detail-manager";

export default async function AdminFinancialAccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ direction?: string; fromDate?: string; toDate?: string }>;
}) {
  const { locale, id } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();

  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "financeBankCash.manage"))) {
    notFound();
  }

  const direction =
    resolvedSearchParams.direction === "IN" ||
    resolvedSearchParams.direction === "OUT" ||
    resolvedSearchParams.direction === "TRANSFER"
      ? resolvedSearchParams.direction
      : "all";

  const detail = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financialAccountsService.getAccountDetail(id, {
      direction,
      fromDate: resolvedSearchParams.fromDate,
      toDate: resolvedSearchParams.toDate,
    }),
  );

  if (!detail) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);

  return (
    <FinancialAccountDetailManager
      locale={locale}
      detail={detail}
      accountId={id}
      initialDirection={direction}
      initialFromDate={resolvedSearchParams.fromDate ?? ""}
      initialToDate={resolvedSearchParams.toDate ?? ""}
      labels={{
        back: dictionary.admin.financeDetailBackToList,
        title: dictionary.admin.financeFinancialAccountsDetailTitle,
        description: dictionary.admin.financeFinancialAccountsDetailDescription,
        accountType: dictionary.admin.financeFinancialAccountsType,
        cash: dictionary.admin.financeFinancialAccountsCash,
        bank: dictionary.admin.financeFinancialAccountsBank,
        openingBalance: dictionary.admin.financeFinancialAccountsOpeningBalance,
        currentBalance: dictionary.admin.financeFinancialAccountsCurrentBalance,
        transactionCount: dictionary.admin.financeFinancialAccountsTransactionCount,
        note: dictionary.admin.financeFinancialAccountsNote,
        totalIncoming: dictionary.admin.financeCashTransactionsTotalIncoming,
        totalOutgoing: dictionary.admin.financeCashTransactionsTotalOutgoing,
        netCashFlow: dictionary.admin.financeFinancialAccountsNetCashFlow,
        availableBalance: dictionary.admin.financeFinancialAccountsAvailableBalance,
        movementTitle: dictionary.admin.financeFinancialAccountsMovementsTitle,
        filterDirection: dictionary.admin.financeFinancialAccountsFilterDirection,
        filterFromDate: dictionary.admin.financeFinancialAccountsFilterFromDate,
        filterToDate: dictionary.admin.financeFinancialAccountsFilterToDate,
        filterApply: dictionary.admin.financeFinancialAccountsFilterApply,
        filterSummaryTitle: dictionary.admin.financeFinancialAccountsFilterDirection,
        filterSummaryRange: dictionary.admin.financeFinancialAccountsFilterRange,
        filterSummaryRecordCount: dictionary.admin.financeFinancialAccountsFilterRecordCount,
        filterSummaryAllTime: dictionary.admin.financeFinancialAccountsFilterAllTime,
        filterSummaryDateSeparator: dictionary.admin.financeFinancialAccountsFilterDateSeparator,
        exportCsv: dictionary.admin.financeFinancialAccountsExportCsv,
        filterAllDirections: dictionary.admin.financeCashTransactionsAllDirections,
        filterIncoming: dictionary.admin.financeCashTransactionsIncoming,
        filterOutgoing: dictionary.admin.financeCashTransactionsOutgoing,
        filterTransfer: dictionary.admin.financeCashTransactionsTransfer,
        movementDirection: dictionary.admin.financeCashTransactionsAllDirections,
        movementSourceType: dictionary.admin.financeCashTransactionsSourceType,
        sourceTypeManual: dictionary.admin.financeCashTransactionsManual,
        sourceTypeCollection: dictionary.admin.financeCashTransactionsCollection,
        sourceTypePayment: dictionary.admin.financeCashTransactionsPayment,
        sourceTypeOrder: dictionary.admin.financeCashTransactionsOrder,
        sourceTypeDocument: dictionary.admin.financeCashTransactionsDocument,
        sourceTypeExpenseReport: dictionary.admin.financeCashTransactionsExpenseReport,
        sourceTypeRefund: dictionary.admin.financeCashTransactionsRefund,
        sourceTypeTransfer: dictionary.admin.financeCashTransactionsTransfer,
        movementCategory: dictionary.admin.financeCashTransactionsCategory,
        movementAmount: dictionary.admin.financeCashTransactionsAmount,
        movementDate: dictionary.admin.financeCashTransactionsDate,
        movementCounterparty: dictionary.admin.documentsCounterparty,
        movementNote: dictionary.admin.financeCashTransactionsNote,
        movementReference: dictionary.admin.financeAccountsSourceNumber,
        notSpecified: dictionary.common.notSpecified,
        empty: dictionary.admin.financeCashTransactionsEmpty,
        openReconciliation: dictionary.admin.financeBankReconciliationOpenReconciliation,
      }}
    />
  );
}
