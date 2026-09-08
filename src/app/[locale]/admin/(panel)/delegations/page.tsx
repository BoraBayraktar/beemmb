import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { delegationService } from "@/modules/delegation/services/delegation.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { DelegationAdminManager } from "@/ui/admin/delegation-admin-manager";

export default async function AdminDelegationsPage({
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

  const canManageDelegations = await rbacService.hasPermission(user, "delegations.manage");
  if (!canManageDelegations) {
    redirect(`/${locale}/admin`);
  }

  const dictionary = getDictionary(locale as Locale);

  const { items, users } = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    async () => {
      const [all, backofficeUsers] = await Promise.all([
        delegationService.listAll(user.tenantId),
        identityAdminService.listBackofficeUsers(user.tenantId),
      ]);

      return { items: all.items, users: backofficeUsers };
    },
  );

  return (
    <DelegationAdminManager
      initialItems={items}
      users={users.map((candidate) => ({ id: candidate.id, name: candidate.name, email: candidate.email }))}
      labels={{
        pageTitle: dictionary.admin.delegationAdminPageTitle,
        pageDescription: dictionary.admin.delegationAdminPageDescription,
        giveTitle: dictionary.admin.delegationAdminGiveTitle,
        grantorLabel: dictionary.admin.delegationAdminGrantorLabel,
        grantorPlaceholder: dictionary.admin.delegationAdminGrantorPlaceholder,
        granteeLabel: dictionary.admin.delegationGranteeLabel,
        granteePlaceholder: dictionary.admin.delegationGranteePlaceholder,
        startLabel: dictionary.admin.delegationStartLabel,
        endLabel: dictionary.admin.delegationEndLabel,
        submit: dictionary.admin.delegationAdminSubmit,
        listTitle: dictionary.admin.delegationAdminListTitle,
        searchPlaceholder: dictionary.admin.delegationAdminSearchPlaceholder,
        emptyList: dictionary.admin.delegationAdminEmptyList,
        grantorColumn: dictionary.admin.delegationAdminGrantorColumn,
        granteeColumn: dictionary.admin.delegationAdminGranteeColumn,
        createdByLabel: dictionary.admin.delegationAdminCreatedByLabel,
        createdBySelf: dictionary.admin.delegationAdminCreatedBySelf,
        revoke: dictionary.admin.delegationRevoke,
        statusActive: dictionary.admin.delegationStatusActive,
        statusRevoked: dictionary.admin.delegationStatusRevoked,
        statusExpired: dictionary.admin.delegationStatusExpired,
        revokeConfirmTitle: dictionary.admin.delegationRevokeConfirmTitle,
        revokeConfirmDescription: dictionary.admin.delegationRevokeConfirmDescription,
        cancel: dictionary.admin.cancel,
        loading: dictionary.common.loading,
        opFailed: dictionary.admin.operationFailed,
      }}
    />
  );
}
