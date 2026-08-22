import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinancialAccountsManager } from "@/ui/admin/financial-accounts-manager";

export default async function AdminFinancialAccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; type?: string }>;
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
  if (!effective.permissionKeys.includes("financeBankCash.manage")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const type =
    resolvedSearchParams.type === "CASH" || resolvedSearchParams.type === "BANK"
      ? resolvedSearchParams.type
      : "all";
  const result = await financialAccountsService.listAccounts({
    search: resolvedSearchParams.search,
    type,
  });

  return (
    <FinancialAccountsManager
      locale={locale}
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      initialType={type}
      labels={{
        title: dictionary.admin.financeFinancialAccountsTitle,
        description: dictionary.admin.financeFinancialAccountsDescription,
        search: dictionary.admin.financeFinancialAccountsSearch,
        allTypes: dictionary.admin.financeFinancialAccountsAllTypes,
        cash: dictionary.admin.financeFinancialAccountsCash,
        bank: dictionary.admin.financeFinancialAccountsBank,
        totalBalance: dictionary.admin.financeFinancialAccountsTotalBalance,
        activeAccountCount: dictionary.admin.financeFinancialAccountsActiveCount,
        cashAccountCount: dictionary.admin.financeFinancialAccountsCashCount,
        bankAccountCount: dictionary.admin.financeFinancialAccountsBankCount,
        openingBalance: dictionary.admin.financeFinancialAccountsOpeningBalance,
        currentBalance: dictionary.admin.financeFinancialAccountsCurrentBalance,
        transactionCount: dictionary.admin.financeFinancialAccountsTransactionCount,
        accountType: dictionary.admin.financeFinancialAccountsType,
        openDetail: dictionary.admin.financeCollectionsOpenDetail,
        createTitle: dictionary.admin.financeFinancialAccountsCreateTitle,
        name: dictionary.admin.financeFinancialAccountsName,
        note: dictionary.admin.financeFinancialAccountsNote,
        createAction: dictionary.admin.financeFinancialAccountsCreateAction,
        creatingAction: dictionary.admin.financeFinancialAccountsCreatingAction,
        createSuccess: dictionary.admin.financeFinancialAccountsCreateSuccess,
        createFailed: dictionary.admin.financeFinancialAccountsCreateFailed,
        empty: dictionary.admin.financeFinancialAccountsEmpty,
        emptyHint: dictionary.admin.financeFinancialAccountsEmptyHint,
        cancel: dictionary.admin.cancel,
        action: dictionary.admin.action,
      }}
    />
  );
}
