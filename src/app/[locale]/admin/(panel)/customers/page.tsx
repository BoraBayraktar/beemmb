import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { UserManager } from "@/ui/admin/user-manager";

export default async function AdminCustomersPage({
  params,
}: {
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

  const canManageUsers = await rbacService.hasPermission(user, "customers.manage");
  if (!canManageUsers) {
    redirect(`/${locale}/admin`);
  }

  const userResult = await identityAdminService.listUsers({
    page: 1,
    pageSize: 10,
    role: "CUSTOMER",
  }, user.tenantId);

  return (
    <UserManager
      initialResult={userResult}
      fixedRole="CUSTOMER"
      labels={{
        title: dictionary.admin.customerManager,
        createTitle: dictionary.admin.createCustomer,
        listTitle: dictionary.admin.customerList,
        search: dictionary.admin.searchCustomer,
        allRoles: dictionary.admin.allRoles,
        roleAdmin: dictionary.admin.roleAdmin,
        roleEditor: dictionary.admin.roleEditor,
        roleCustomer: dictionary.admin.roleCustomer,
        email: dictionary.admin.email,
        name: dictionary.admin.name,
        role: dictionary.admin.role,
        roles: dictionary.admin.roles,
        password: dictionary.admin.password,
        passwordOptional: dictionary.admin.passwordOptional,
        changePassword: dictionary.admin.changePassword,
        page: dictionary.admin.page,
        prev: dictionary.admin.prev,
        next: dictionary.admin.next,
        save: dictionary.admin.save,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        cancel: dictionary.admin.cancel,
        empty: dictionary.admin.emptyCustomers,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        validationPassword: dictionary.admin.validationPassword,
        validationDeleteSelf: dictionary.admin.validationDeleteSelf,
        loading: dictionary.common.loading,
      }}
    />
  );
}
