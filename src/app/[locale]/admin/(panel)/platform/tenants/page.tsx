import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { PlatformTenantsManager } from "@/ui/admin/platform-tenants-manager";

export default async function AdminPlatformTenantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  if (!user.isSuperAdmin) {
    redirect(`/${locale}/admin`);
  }

  const [tenants, modules] = await Promise.all([
    platformService.listTenants(),
    platformService.listModuleCatalog(),
  ]);

  const entitlementsByTenant = await Promise.all(
    tenants.map(async (tenant) => ({
      tenantId: tenant.id,
      entitlements: await platformService.listEntitlements(tenant.id),
    })),
  );

  return (
    <PlatformTenantsManager
      initialTenants={tenants}
      modules={modules}
      initialEntitlements={entitlementsByTenant}
    />
  );
}
