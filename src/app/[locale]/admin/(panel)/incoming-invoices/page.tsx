import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { IncomingInvoiceManager } from "@/ui/admin/incoming-invoice-manager";

export default async function AdminIncomingInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
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

  if (!(await rbacService.hasPermission(user, "incomingInvoices.read"))) {
    notFound();
  }

  const [result, suppliers] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      incomingInvoiceService.listIncomingInvoices({
        search: resolvedSearchParams.search,
        page: 1,
        pageSize: 50,
      }),
      catalogAdminService.listSuppliers(),
    ]),
  );

  return (
    <IncomingInvoiceManager
      locale={locale}
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      supplierOptions={suppliers.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.taxNumber ?? item.email ?? null,
      }))}
    />
  );
}
