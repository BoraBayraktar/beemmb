import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { buildAdminMenuTree } from "@/ui/admin/admin-menu";
import { RoleManager } from "@/ui/admin/role-manager";

export default async function AdminRolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  const canManageRoles = await rbacService.hasPermission(user, "roles.manage");
  if (!canManageRoles) {
    redirect(`/${locale}/admin`);
  }

  const dictionary = getDictionary(locale as Locale);
  const [roles, permissions] = await Promise.all([
    rbacService.listRoles(user.tenantId),
    rbacService.listPermissions(),
  ]);
  const menuTree = buildAdminMenuTree(dictionary, locale as Locale);

  return (
    <RoleManager
      initialRoles={roles}
      permissions={permissions}
      menuTree={menuTree}
      labels={{
        title: dictionary.admin.roleManager,
        subtitle: dictionary.admin.roleManagerSubtitle,
        newRole: dictionary.admin.newRole,
        key: dictionary.admin.roleKey,
        name: dictionary.admin.name,
        description: dictionary.admin.description,
        menuAccessTitle: dictionary.admin.menuAccessTitle,
        menuAccessHint: dictionary.admin.menuAccessHint,
        otherPermissionsTitle: dictionary.admin.otherPermissionsTitle,
        superAdminEditHint: dictionary.admin.superAdminEditHint,
        save: dictionary.admin.save,
        create: dictionary.admin.create,
        cancel: dictionary.admin.cancel,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        systemRole: dictionary.admin.systemRole,
        active: dictionary.admin.active,
        passive: dictionary.admin.passive,
        users: dictionary.admin.users,
        operationFailed: dictionary.admin.operationFailed,
        permissionModules: dictionary.admin.permissionModules,
      }}
    />
  );
}
