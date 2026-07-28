import { notFound } from "next/navigation";

import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { resolveBankReconciliationCopy } from "@/modules/finance/services/bank-reconciliation-copy.resolver";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { isLocale } from "@/lib/i18n";
import { BankReconciliationManager } from "@/ui/admin/bank-reconciliation-manager";

export default async function AdminBankReconciliationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const workspace = await bankReconciliationService.getWorkspace(id);
  if (!workspace) {
    notFound();
  }

  const copy = resolveBankReconciliationCopy(locale);

  return (
    <BankReconciliationManager
      locale={locale}
      accountId={id}
      initialWorkspace={workspace}
      copy={copy}
    />
  );
}
