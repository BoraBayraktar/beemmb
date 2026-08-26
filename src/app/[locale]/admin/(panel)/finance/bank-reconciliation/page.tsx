import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { resolveBankReconciliationCopy } from "@/modules/finance/services/bank-reconciliation-copy.resolver";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { BankReconciliationHubManager } from "@/ui/admin/bank-reconciliation-hub-manager";

export default async function AdminBankReconciliationHubPage({
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
  if (!effective.permissionKeys.includes("financeBankReconciliation.manage")) {
    notFound();
  }

  const hub = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => bankReconciliationService.getReconciliationHub(locale),
  );
  const copy = resolveBankReconciliationCopy(locale);

  return <BankReconciliationHubManager locale={locale} hub={hub} copy={copy} />;
}
