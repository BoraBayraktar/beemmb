import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financeLedgerAccountService } from "@/modules/finance/services/finance-ledger-account.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceChartOfAccountsManager } from "@/ui/admin/finance-chart-of-accounts-manager";

export default async function AdminFinanceChartOfAccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const effective = await rbacService.getEffectivePermissions(user);
  const canView = effective.permissionKeys.includes("financeLedgerEntries.read") || effective.permissionKeys.includes("finance.audit.read");
  if (!canView) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const admin = dictionary.admin;

  const items = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financeLedgerAccountService.listChartOfAccounts(),
  );

  return (
    <FinanceChartOfAccountsManager
      items={items}
      copy={{
        title: admin.financeChartOfAccountsTitle,
        description: admin.financeChartOfAccountsDescription,
        search: admin.financeChartOfAccountsSearch,
        colCode: admin.financeChartOfAccountsColCode,
        colName: admin.financeChartOfAccountsColName,
        colCategory: admin.financeChartOfAccountsColCategory,
        colStatus: admin.financeChartOfAccountsColStatus,
        statusActive: admin.financeChartOfAccountsStatusActive,
        statusInactive: admin.financeChartOfAccountsStatusInactive,
        categoryAsset: admin.financeChartOfAccountsCategoryAsset,
        categoryLiability: admin.financeChartOfAccountsCategoryLiability,
        categoryEquity: admin.financeChartOfAccountsCategoryEquity,
        categoryIncome: admin.financeChartOfAccountsCategoryIncome,
        categoryExpense: admin.financeChartOfAccountsCategoryExpense,
        emptyList: admin.financeChartOfAccountsEmptyList,
      }}
    />
  );
}
