import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { delegationService } from "@/modules/delegation/services/delegation.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { DelegationManager } from "@/ui/admin/delegation-manager";

export default async function AdminDelegationPage({
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

  const { given, received, grantableUsers } = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    async () => {
      const [givenResult, receivedResult, backofficeUsers] = await Promise.all([
        delegationService.listGivenByUser(user.tenantId, user.id),
        delegationService.listReceivedByUser(user.tenantId, user.id),
        identityAdminService.listBackofficeUsers(user.tenantId),
      ]);

      return {
        given: givenResult.items,
        received: receivedResult.items,
        grantableUsers: backofficeUsers.filter((candidate) => candidate.id !== user.id),
      };
    },
  );

  return (
    <DelegationManager
      currentUserId={user.id}
      initialGiven={given}
      initialReceived={received}
      grantableUsers={grantableUsers.map((candidate) => ({ id: candidate.id, name: candidate.name, email: candidate.email }))}
      labels={{
        pageTitle: dictionary.admin.delegationPageTitle,
        pageDescription: dictionary.admin.delegationPageDescription,
        giveTitle: dictionary.admin.delegationGiveTitle,
        granteeLabel: dictionary.admin.delegationGranteeLabel,
        granteePlaceholder: dictionary.admin.delegationGranteePlaceholder,
        startLabel: dictionary.admin.delegationStartLabel,
        endLabel: dictionary.admin.delegationEndLabel,
        submit: dictionary.admin.delegationSubmit,
        givenListTitle: dictionary.admin.delegationGivenListTitle,
        receivedListTitle: dictionary.admin.delegationReceivedListTitle,
        revoke: dictionary.admin.delegationRevoke,
        statusActive: dictionary.admin.delegationStatusActive,
        statusRevoked: dictionary.admin.delegationStatusRevoked,
        statusExpired: dictionary.admin.delegationStatusExpired,
        emptyGiven: dictionary.admin.delegationEmptyGiven,
        emptyReceived: dictionary.admin.delegationEmptyReceived,
        revokeConfirmTitle: dictionary.admin.delegationRevokeConfirmTitle,
        revokeConfirmDescription: dictionary.admin.delegationRevokeConfirmDescription,
        cancel: dictionary.admin.cancel,
        save: dictionary.admin.save,
        loading: dictionary.common.loading,
        opFailed: dictionary.admin.operationFailed,
      }}
    />
  );
}
