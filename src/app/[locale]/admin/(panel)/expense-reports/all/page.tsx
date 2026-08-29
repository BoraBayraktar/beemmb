import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { ExpenseAllManager } from "@/ui/admin/expense-all-manager";

export default async function AdminExpenseReportsAllPage({ params }: { params: Promise<{ locale: string }> }) {
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

  const dictionary = getDictionary(locale as Locale);
  const admin = dictionary.admin;

  const result = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => expenseReportService.listAll({ scope: "all", page: 1, pageSize: 50 }),
  );

  return <ExpenseAllManager locale={locale} result={result} emptyLabel={admin.expenseReportsAllEmpty} />;
}
