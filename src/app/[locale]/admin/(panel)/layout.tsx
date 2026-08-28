import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { buildAdminMenuTree, type AdminMenuItem } from "@/ui/admin/admin-menu";
import { AdminPanelShell, type MenuItem } from "@/ui/admin/panel-shell";

/**
 * Menude bir ogenin gorunmesi icin CIFT KONTROL gerekir: (1) kullanicinin
 * rolunde ilgili permissionKey olmali VE (2) tenant'in aboneliginde ilgili
 * moduleKey acik olmali. moduleKey sadece ust-seviye (grup) node'larda
 * tanimlidir, children parent'tan miras alir. Bu SADECE menu gorunurlugu
 * icin bir kolayliktir -- route-level yetkilendirme hala tek basina
 * requirePermission()'a dayanir, entitlement kontrolu API katmaninda
 * ZORUNLU degildir (bkz. plan Faz 3 notu).
 */
function filterMenuByPermissionsAndEntitlements(
  items: AdminMenuItem[],
  permissionKeys: string[],
  enabledModuleKeys: Set<string>,
  inheritedModuleKey?: string,
): MenuItem[] {
  const filteredItems: MenuItem[] = [];

  for (const item of items) {
    const moduleKey = item.moduleKey ?? inheritedModuleKey;
    const hasEntitlement = !moduleKey || enabledModuleKeys.has(moduleKey);

    if (!hasEntitlement) {
      continue;
    }

    const children = item.children
      ? filterMenuByPermissionsAndEntitlements(item.children, permissionKeys, enabledModuleKeys, moduleKey)
      : undefined;
    const canSeeItem = !item.permissionKey || permissionKeys.includes(item.permissionKey);

    if (!canSeeItem && (!children || children.length === 0)) {
      continue;
    }

    filteredItems.push({
      href: item.href,
      label: item.label,
      children,
    });
  }

  return filteredItems;
}

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  const effectiveRbac = await rbacService.getEffectivePermissions(user);

  if (!effectiveRbac.permissionKeys.includes("admin.access")) {
    redirect(`/${locale}`);
  }

  const localizedRole = effectiveRbac.roleNames.length > 0
    ? effectiveRbac.roleNames.join(", ")
    : user.role === "ADMIN"
      ? dictionary.admin.roleAdmin
      : dictionary.admin.roleEditor;

  const enabledModuleKeys = await platformService.getEnabledModuleKeys(user.tenantId);
  const rawMenuItems: AdminMenuItem[] = buildAdminMenuTree(dictionary, locale as Locale);
  const menuItems = filterMenuByPermissionsAndEntitlements(rawMenuItems, effectiveRbac.permissionKeys, enabledModuleKeys);

  if (user.isSuperAdmin) {
    menuItems.push({
      href: `/${locale}/admin/platform/tenants`,
      label: "Platform Yönetimi",
    });
  }

  return (
    <AdminPanelShell
      locale={locale}
      title={dictionary.admin.title}
      userName={user.name}
      userEmail={user.email}
      userRole={localizedRole}
      logoutLabel={dictionary.admin.logout}
      loadingLabel={dictionary.common.loading}
      storeLabel={dictionary.admin.goStore}
      notificationsLabel={dictionary.admin.notifications}
      noNotificationsLabel={dictionary.admin.noNotifications}
      markAllReadLabel={dictionary.admin.markAllRead}
      notificationProductQuestionCreatedTitle={dictionary.admin.notificationProductQuestionCreatedTitle}
      notificationInventoryOutOfStockTitle={dictionary.admin.notificationInventoryOutOfStockTitle}
      notificationInventoryLowStockTitle={dictionary.admin.notificationInventoryLowStockTitle}
      notificationStockCountAppliedTitle={dictionary.admin.notificationStockCountAppliedTitle}
      notificationStockCountAppliedMessage={dictionary.admin.notificationStockCountAppliedMessage}
      menuItems={menuItems}
    >
      {children}
    </AdminPanelShell>
  );
}
