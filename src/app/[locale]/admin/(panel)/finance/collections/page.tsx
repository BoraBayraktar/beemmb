import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { collectionsService } from "@/modules/finance/services/collections.service";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CollectionReadinessManager } from "@/ui/admin/collection-readiness-manager";

export default async function AdminFinanceCollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const effective = await rbacService.getEffectivePermissions(user);
  if (!effective.permissionKeys.includes("financeCollections.manage")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const [result, accountOptions] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      collectionsService.listCollectionReadiness(locale),
      financialAccountsService.listAccountOptions(),
    ]),
  );

  return (
    <CollectionReadinessManager
      result={result}
      accountOptions={accountOptions}
      labels={{
        title: dictionary.admin.financeCollectionsTitle,
        description: dictionary.admin.financeCollectionsDescription,
        totalPendingAmount: dictionary.admin.financeCollectionsTotalPendingAmount,
        totalRecordedAmount: dictionary.admin.financeCollectionsTotalRecordedAmount,
        pendingCount: dictionary.admin.financeCollectionsPendingCount,
        authorizedCount: dictionary.admin.financeCollectionsAuthorizedCount,
        failedCount: dictionary.admin.financeCollectionsFailedCount,
        recordedCount: dictionary.admin.financeCollectionsRecordedCount,
        counterparty: dictionary.admin.documentsCounterparty,
        paymentStatus: dictionary.admin.paymentStatus,
        financeStatus: dictionary.admin.financeOperationStatus,
        financeStatusPending: dictionary.admin.financeOperationStatusPending,
        financeStatusPartial: dictionary.admin.financeOperationStatusPartial,
        financeStatusCompleted: dictionary.admin.financeOperationStatusCompleted,
        financeStatusFailed: dictionary.admin.financeOperationStatusFailed,
        orderDate: dictionary.admin.orderDate,
        amount: dictionary.admin.orderTotal,
        remainingAmount: dictionary.admin.financeCollectionsRemainingAmount,
        recordedCollectionCount: dictionary.admin.financeCollectionsRecordedCollectionCount,
        openDetail: dictionary.admin.financeCollectionsOpenDetail,
        openSource: dictionary.admin.financeCollectionsOpenSource,
        createRecord: dictionary.admin.financeCollectionsCreateRecord,
        creatingRecord: dictionary.admin.financeCollectionsCreatingRecord,
        createRecordSuccess: dictionary.admin.financeCollectionsCreateRecordSuccess,
        createRecordFailed: dictionary.admin.financeCollectionsCreateRecordFailed,
        account: dictionary.admin.financeCollectionsFinancialAccount,
        accountRequired: dictionary.admin.financeCollectionsFinancialAccountRequired,
        noResults: dictionary.admin.financeCollectionsEmpty,
      }}
    />
  );
}
