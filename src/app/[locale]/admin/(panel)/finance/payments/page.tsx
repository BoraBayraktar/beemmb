import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { paymentsService } from "@/modules/finance/services/payments.service";
import { PaymentReadinessManager } from "@/ui/admin/payment-readiness-manager";

export default async function AdminFinancePaymentsPage({
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
  if (!effective.permissionKeys.includes("financePayments.manage")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const [result, accountOptions] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      paymentsService.listPaymentReadiness(locale),
      financialAccountsService.listAccountOptions(),
    ]),
  );

  return (
    <PaymentReadinessManager
      result={result}
      accountOptions={accountOptions}
      labels={{
        title: dictionary.admin.financePaymentsTitle,
        description: dictionary.admin.financePaymentsDescription,
        totalPendingAmount: dictionary.admin.financePaymentsTotalPendingAmount,
        totalRecordedAmount: dictionary.admin.financePaymentsTotalRecordedAmount,
        supplierCount: dictionary.admin.financePaymentsSupplierCount,
        draftDocumentCount: dictionary.admin.financePaymentsDraftDocumentCount,
        financeStatus: dictionary.admin.financeOperationStatus,
        financeStatusPending: dictionary.admin.financeOperationStatusPending,
        financeStatusPartial: dictionary.admin.financeOperationStatusPartial,
        financeStatusCompleted: dictionary.admin.financeOperationStatusCompleted,
        recordedCount: dictionary.admin.financePaymentsRecordedCount,
        supplier: dictionary.admin.supplier,
        documentCount: dictionary.admin.financePaymentsDocumentCount,
        lastIssueDate: dictionary.admin.financePaymentsLastIssueDate,
        amount: dictionary.admin.financePaymentsAmount,
        remainingAmount: dictionary.admin.financePaymentsRemainingAmount,
        recordedPaymentCount: dictionary.admin.financePaymentsRecordedPaymentCount,
        openDetail: dictionary.admin.financePaymentsOpenDetail,
        openSource: dictionary.admin.financePaymentsOpenSource,
        createRecord: dictionary.admin.financePaymentsCreateRecord,
        creatingRecord: dictionary.admin.financePaymentsCreatingRecord,
        createRecordSuccess: dictionary.admin.financePaymentsCreateRecordSuccess,
        createRecordFailed: dictionary.admin.financePaymentsCreateRecordFailed,
        account: dictionary.admin.financePaymentsFinancialAccount,
        accountRequired: dictionary.admin.financePaymentsFinancialAccountRequired,
        action: dictionary.admin.action,
        noResults: dictionary.admin.financePaymentsEmpty,
      }}
    />
  );
}
