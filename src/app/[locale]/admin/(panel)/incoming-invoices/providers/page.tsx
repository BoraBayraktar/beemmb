import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { incomingInvoiceProviderConfigService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-config.service";
import { IncomingInvoiceProviderManager } from "@/ui/admin/incoming-invoice-provider-manager";

export default async function AdminIncomingInvoiceProvidersPage({
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

  if (!(await rbacService.hasPermission(user, "incomingInvoices.manage"))) {
    notFound();
  }

  const items = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => incomingInvoiceProviderConfigService.listProviderConfigs(),
  );

  return <IncomingInvoiceProviderManager items={items} />;
}
