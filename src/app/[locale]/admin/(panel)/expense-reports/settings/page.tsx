import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { ExpenseSettingsManager } from "@/ui/admin/expense-settings-manager";

export default async function AdminExpenseReportsSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "expenseSettings.manage"))) {
    notFound();
  }

  const [steps, candidates, categories] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      expenseSettingsService.listApprovalChain(),
      expenseSettingsService.listApproverCandidates(),
      expenseSettingsService.listAllCategories(),
    ]),
  );

  return <ExpenseSettingsManager steps={steps} candidates={candidates} categories={categories} />;
}
