import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financeGeneralLedgerService } from "@/modules/finance/services/finance-general-ledger.service";
import { resolveFinanceLedgerEntriesCopy } from "@/modules/finance/services/finance-ledger-entries-copy.resolver";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceGeneralLedgerManager } from "@/ui/admin/finance-general-ledger-manager";

export default async function AdminFinanceGeneralLedgerPage({
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
  const canView =
    effective.permissionKeys.includes("financeLedgerEntries.read") || effective.permissionKeys.includes("finance.audit.read");
  if (!canView) {
    notFound();
  }

  const range = parseFinanceReportDateRangeQuery({ from: resolvedSearchParams.from, to: resolvedSearchParams.to });
  const report = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financeGeneralLedgerService.getGeneralLedger({ fromDate: range.fromDate, toDate: range.toDate }),
  );

  const dictionary = getDictionary(locale as Locale);
  const admin = dictionary.admin;

  return (
    <FinanceGeneralLedgerManager
      locale={locale}
      report={report}
      initialFrom={range.fromIso}
      initialTo={range.toIso}
      copy={{
        title: admin.financeGeneralLedgerTitle,
        description: admin.financeGeneralLedgerDescription,
        periodLabel: admin.financeGeneralLedgerPeriodLabel,
        filterApply: admin.financeGeneralLedgerFilterApply,
        expandAll: admin.financeGeneralLedgerExpandAll,
        collapseAll: admin.financeGeneralLedgerCollapseAll,
        colDate: admin.financeGeneralLedgerColDate,
        colSource: admin.financeGeneralLedgerColSource,
        colTitle: admin.financeGeneralLedgerColTitle,
        colDebit: admin.financeGeneralLedgerColDebit,
        colCredit: admin.financeGeneralLedgerColCredit,
        openingBalance: admin.financeGeneralLedgerOpeningBalance,
        totalLabel: admin.financeGeneralLedgerTotalLabel,
        closingBalance: admin.financeGeneralLedgerClosingBalance,
        emptyList: admin.financeGeneralLedgerEmptyList,
      }}
      sourceLabels={resolveFinanceLedgerEntriesCopy(locale)}
    />
  );
}
