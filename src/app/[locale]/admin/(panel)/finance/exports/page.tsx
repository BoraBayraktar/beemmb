import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { financeAdvisorExportService } from "@/modules/finance/services/finance-advisor-export.service";
import { resolveFinanceAdvisorExportCopy } from "@/modules/finance/services/finance-advisor-export-copy.resolver";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceAdvisorExportsManager } from "@/ui/admin/finance-advisor-exports-manager";

export default async function AdminFinanceExportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
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
  const canExport =
    effective.permissionKeys.includes("finance.audit.read") || effective.permissionKeys.includes("finance.manage");
  if (!canExport) {
    notFound();
  }

  const query = {
    from: resolvedSearchParams.from,
    to: resolvedSearchParams.to,
  };
  const range = parseFinanceReportDateRangeQuery(query);

  let exportPackage;
  try {
    exportPackage = await financeAdvisorExportService.getExportPackage(locale, query);
  } catch {
    notFound();
  }

  return (
    <FinanceAdvisorExportsManager
      locale={locale}
      initialPackage={exportPackage}
      copy={resolveFinanceAdvisorExportCopy(locale)}
      initialFrom={range.fromIso}
      initialTo={range.toIso}
    />
  );
}
