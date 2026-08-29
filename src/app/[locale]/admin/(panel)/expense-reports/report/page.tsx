import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { expenseReportAnalyticsService } from "@/modules/expense-reports/services/expense-report-analytics.service";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { ExpenseReportAnalyticsManager } from "@/ui/admin/expense-report-analytics-manager";

export default async function AdminExpenseReportsAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "expenseReports.manage"))) {
    notFound();
  }

  const [analytics, itemResult, categories] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      expenseReportAnalyticsService.getAnalytics(),
      expenseReportAnalyticsService.listItemReport({ page: 1, pageSize: 25 }),
      expenseSettingsService.listActiveCategories(),
    ]),
  );

  return <ExpenseReportAnalyticsManager analytics={analytics} itemResult={itemResult} categories={categories} />;
}
