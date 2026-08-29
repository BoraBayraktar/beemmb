import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { ExpenseApprovalsManager } from "@/ui/admin/expense-approvals-manager";

export default async function AdminExpenseReportApprovalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "expenseReports.approve"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const admin = dictionary.admin;

  const result = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => expenseReportService.listApprovals(user.id, { scope: "approvals", page: 1, pageSize: 50 }),
  );

  return (
    <ExpenseApprovalsManager
      locale={locale}
      result={result}
      emptyLabel={admin.expenseReportsApprovalsEmpty}
      approveLabel={admin.expenseReportApprove}
      rejectLabel={admin.expenseReportReject}
      rejectNoteLabel={admin.expenseReportRejectNoteLabel}
      rejectNoteRequiredLabel={admin.expenseReportRejectNoteRequired}
    />
  );
}
