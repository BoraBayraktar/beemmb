import { redirect, notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financeCounterpartyRouteService } from "@/modules/finance/services/finance-counterparty-route.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";

export default async function AdminFinanceAccountCounterpartyPage({
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

  if (!(await rbacService.hasPermission(user, "financeAccounts.read"))) {
    notFound();
  }

  const path = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financeCounterpartyRouteService.resolveCounterpartyLedgerPath(id),
  );

  if (!path) {
    notFound();
  }

  redirect(`/${locale}${path}`);
}
