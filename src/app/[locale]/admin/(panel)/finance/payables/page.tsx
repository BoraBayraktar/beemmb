import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { payablesService } from "@/modules/finance/services/payables.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { SupplierPayablesManager } from "@/ui/admin/supplier-payables-manager";

export default async function AdminSupplierPayablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; overdueOnly?: string }>;
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
  const overdueOnly =
    resolvedSearchParams.overdueOnly === "1" || resolvedSearchParams.overdueOnly === "true";

  const { items, dueKpi } = await payablesService.listSupplierPayables({
    search: resolvedSearchParams.search,
    overdueOnly,
  });

  return (
    <SupplierPayablesManager
      locale={locale}
      items={items}
      dueKpi={dueKpi}
      initialSearch={resolvedSearchParams.search ?? ""}
      overdueOnly={overdueOnly}
      labels={{
        title: dictionary.admin.financeSupplierPayablesTitle,
        description: dictionary.admin.financeSupplierPayablesDescription,
        search: dictionary.admin.financeSupplierPayablesSearch,
        noResults: dictionary.admin.financeSupplierPayablesEmpty,
        totalAmount: dictionary.admin.financeSupplierPayablesTotalAmount,
        documentCount: dictionary.admin.financeSupplierPayablesDocumentCount,
        draftCount: dictionary.admin.financeSupplierPayablesDraftCount,
        lastIssueDate: dictionary.admin.financeSupplierPayablesLastIssueDate,
        viewDetail: dictionary.admin.financeSupplierPayablesDetailAction,
        notSpecified: dictionary.common.notSpecified,
        overdueAmountKpi: dictionary.admin.financeDueOverdueAmountKpi,
        dueWithinDaysKpi: dictionary.admin.financeDueWithinDaysKpi,
        nearestDueDateKpi: dictionary.admin.financeDueNearestDueDateKpi,
        overdueFilter: dictionary.admin.financeDueOverdueFilter,
        allOpenFilter: dictionary.admin.financeDueAllOpenFilter,
        dueStatusOverdue: dictionary.admin.financeDueStatusOverdue,
        dueStatusDueInDays: dictionary.admin.financeDueStatusDueInDays,
        dueStatusDueLater: dictionary.admin.financeDueStatusDueLater,
        dueStatusOverdueDays: dictionary.admin.financeDueStatusOverdueDays,
        dueStatusDueInDaysHint: dictionary.admin.financeDueStatusDueInDaysHint,
        dueStatusDueLaterHint: dictionary.admin.financeDueStatusDueLaterHint,
        nearestDueDate: dictionary.admin.financeDueNearestDueDateLabel,
        overdueAmount: dictionary.admin.financeDueOverdueAmountLabel,
      }}
    />
  );
}
