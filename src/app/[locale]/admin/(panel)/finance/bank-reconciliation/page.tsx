import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { resolveBankReconciliationCopy } from "@/modules/finance/services/bank-reconciliation-copy.resolver";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
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

  const hub = await bankReconciliationService.getReconciliationHub(locale);
  const copy = resolveBankReconciliationCopy(locale);

  return <BankReconciliationHubManager locale={locale} hub={hub} copy={copy} />;
}
