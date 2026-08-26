import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { resolveFinanceLedgerEntriesCopy } from "@/modules/finance/services/finance-ledger-entries-copy.resolver";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceLedgerEntriesManager } from "@/ui/admin/finance-ledger-entries-manager";

export default async function AdminFinanceLedgerEntriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
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
  const canView =
    effective.permissionKeys.includes("financeLedgerEntries.read") || effective.permissionKeys.includes("finance.audit.read");
  if (!canView) {
    notFound();
  }

  const canBackfill = effective.permissionKeys.includes("financeTransactions.manage") || effective.permissionKeys.includes("finance.manage");
  const query = {
    from: resolvedSearchParams.from,
    to: resolvedSearchParams.to,
    search: resolvedSearchParams.search,
  };
  const range = parseFinanceReportDateRangeQuery(query);
  const result = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financeAccountEntryService.listLedgerEntries(query),
  );

  return (
    <FinanceLedgerEntriesManager
      locale={locale}
      initialResult={result}
      initialFrom={range.fromIso}
      initialTo={range.toIso}
      initialSearch={resolvedSearchParams.search ?? ""}
      copy={resolveFinanceLedgerEntriesCopy(locale)}
      canBackfill={canBackfill}
    />
  );
}
