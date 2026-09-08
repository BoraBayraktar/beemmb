import { noStoreJson } from "@/lib/no-store-json-response";
import { DelegationPolicyError, delegationService } from "@/modules/delegation/services/delegation.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("delegations.manage", async (user) => {
      const { id } = await context.params;
      await delegationService.revokeDelegation(user.tenantId, id, user.id, { allowAnyGrantor: true });

      return noStoreJson({ success: true });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DelegationPolicyError) {
      return noStoreJson({ message: error.message }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
