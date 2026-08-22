import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { buildAdminMenuTree, type AdminMenuItem } from "@/ui/admin/admin-menu";
import { AdminPanelShell, type MenuItem } from "@/ui/admin/panel-shell";

function filterMenuByPermissions(items: AdminMenuItem[], permissionKeys: string[]): MenuItem[] {
  const filteredItems: MenuItem[] = [];

  for (const item of items) {
    const children = item.children ? filterMenuByPermissions(item.children, permissionKeys) : undefined;
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

  const rawMenuItems: AdminMenuItem[] = buildAdminMenuTree(dictionary, locale as Locale);
  const menuItems = filterMenuByPermissions(rawMenuItems, effectiveRbac.permissionKeys);

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
