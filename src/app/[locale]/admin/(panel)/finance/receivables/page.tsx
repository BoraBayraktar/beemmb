import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CustomerReceivablesManager } from "@/ui/admin/customer-receivables-manager";

export default async function AdminCustomerReceivablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; paymentStatus?: string; page?: string; overdueOnly?: string }>;
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

  const effective = await rbacService.getEffectivePermissions(user);
  if (!effective.permissionKeys.includes("financeReceivables.read")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const paymentStatus =
    resolvedSearchParams.paymentStatus === "PENDING" ||
    resolvedSearchParams.paymentStatus === "AUTHORIZED" ||
    resolvedSearchParams.paymentStatus === "FAILED"
      ? resolvedSearchParams.paymentStatus
      : "all";

  const overdueOnly =
    resolvedSearchParams.overdueOnly === "1" || resolvedSearchParams.overdueOnly === "true";

  const result = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => receivablesService.listOperationalReceivables({
      search: resolvedSearchParams.search,
      paymentStatus,
      overdueOnly,
      page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
      pageSize: 12,
      locale,
    }),
  );

  return (
    <CustomerReceivablesManager
      locale={locale}
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      initialPaymentStatus={paymentStatus}
      overdueOnly={overdueOnly}
      labels={{
        title: dictionary.admin.financeReceivablesTitle,
        description: dictionary.admin.financeReceivablesDescription,
        search: dictionary.admin.financeReceivablesSearch,
        allStatuses: dictionary.admin.financeReceivablesAllStatuses,
        pending: dictionary.admin.financeReceivablesPending,
        authorized: dictionary.admin.financeReceivablesAuthorized,
        failed: dictionary.admin.financeReceivablesFailed,
        totalOpenAmount: dictionary.admin.financeReceivablesTotalOpenAmount,
        pendingCount: dictionary.admin.financeReceivablesPendingCount,
        authorizedCount: dictionary.admin.financeReceivablesAuthorizedCount,
        failedCount: dictionary.admin.financeReceivablesFailedCount,
        noResults: dictionary.admin.financeReceivablesEmpty,
        orderNumber: dictionary.admin.orderNumber,
        counterparty: dictionary.admin.documentsCounterparty,
        paymentStatus: dictionary.admin.paymentStatus,
        totalAmount: dictionary.admin.orderTotal,
        itemCount: dictionary.admin.orderItems,
        orderDate: dictionary.admin.orderDate,
        latestDocument: dictionary.admin.financeReceivablesLatestDocument,
        openOrder: dictionary.admin.financeReceivablesOpenOrder,
        openDetail: dictionary.admin.financeCollectionsOpenDetail,
        notSpecified: dictionary.common.notSpecified,
        cancel: dictionary.admin.cancel,
        overdueAmountKpi: dictionary.admin.financeDueOverdueAmountKpi,
        dueWithinDaysKpi: dictionary.admin.financeDueWithinDaysKpi,
        nearestDueDateKpi: dictionary.admin.financeDueNearestDueDateKpi,
        overdueFilter: dictionary.admin.financeDueOverdueFilter,
        allOpenFilter: dictionary.admin.financeDueAllOpenFilter,
        dueColumn: dictionary.admin.financeDueColumnLabel,
        dueStatusOverdue: dictionary.admin.financeDueStatusOverdue,
        dueStatusDueInDays: dictionary.admin.financeDueStatusDueInDays,
        dueStatusDueLater: dictionary.admin.financeDueStatusDueLater,
        dueStatusOverdueDays: dictionary.admin.financeDueStatusOverdueDays,
        dueStatusDueInDaysHint: dictionary.admin.financeDueStatusDueInDaysHint,
        dueStatusDueLaterHint: dictionary.admin.financeDueStatusDueLaterHint,
        actions: dictionary.admin.financeTableActions,
      }}
    />
  );
}
