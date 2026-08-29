import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { buildAdminMenuTree, findFirstAccessibleHref } from "@/ui/admin/admin-menu";

/**
 * `/admin` her zaman "/admin/products"a yonlendiriyordu -- kullanicinin bu
 * module erisimi olmasa bile. Artik kullanicinin GERCEKTEN izin+entitlement'i
 * olan ILK menu ogesine yonlendirilir (bkz. findFirstAccessibleHref).
 */
export default async function AdminDashboardPage({
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
    redirect(`/${locale}/admin/login`);
  }

  const dictionary = getDictionary(locale as Locale);
  const effectiveRbac = await rbacService.getEffectivePermissions(user);
  const enabledModuleKeys = await platformService.getEnabledModuleKeys(user.tenantId);
  const menuItems = buildAdminMenuTree(dictionary, locale as Locale);
  const firstHref = findFirstAccessibleHref(menuItems, effectiveRbac.permissionKeys, enabledModuleKeys);

  if (firstHref) {
    redirect(firstHref);
  }

  if (user.isSuperAdmin) {
    redirect(`/${locale}/admin/platform/tenants`);
  }

  return (
    <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
      <h1 className="text-lg font-semibold text-[color:var(--color-text)]">Erişebileceğiniz bir modül bulunamadı</h1>
      <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
        Hesabınıza henüz bir modül izni veya aboneliği tanımlanmamış. Lütfen sistem yöneticinizle iletişime geçin.
      </p>
    </div>
  );
}
