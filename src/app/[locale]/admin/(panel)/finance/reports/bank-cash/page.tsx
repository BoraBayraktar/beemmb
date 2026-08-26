import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { resolveFinanceReportsCopy } from "@/modules/finance/services/finance-reports-copy.resolver";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";
import { reportsService } from "@/modules/finance/services/reports.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceReportPageShell } from "@/ui/admin/finance-report-page-shell";

export default async function AdminFinanceBankCashReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; financialAccountId?: string }>;
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

  if (!(await rbacService.hasPermission(user, "financeReports.read"))) {
    notFound();
  }

  const rangeQuery = {
    from: resolvedSearchParams.from,
    to: resolvedSearchParams.to,
    financialAccountId: resolvedSearchParams.financialAccountId,
  };
  const range = parseFinanceReportDateRangeQuery(rangeQuery);
  const copy = resolveFinanceReportsCopy(locale);
  const report = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => reportsService.getBankCashMovementReport(locale, {
      from: range.fromIso,
      to: range.toIso,
      financialAccountId: rangeQuery.financialAccountId,
    }),
  );
  const dictionary = getDictionary(locale as Locale);

  return (
    <FinanceReportPageShell
      locale={locale}
      reportKey="bank-cash"
      range={range}
      copy={copy}
      report={report}
      query={{
        from: range.fromIso,
        to: range.toIso,
        financialAccountId: rangeQuery.financialAccountId,
      }}
      labels={{
        primaryValue: dictionary.admin.financeReportsPrimaryValue,
        secondaryValue: dictionary.admin.financeReportsSecondaryValue,
      }}
    />
  );
}
