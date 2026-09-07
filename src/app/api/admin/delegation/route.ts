import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { runWithTenantContext } from "@/lib/tenant-context";
import { DelegationPolicyError, delegationService } from "@/modules/delegation/services/delegation.service";
import { AuthContextError, getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";

export async function GET() {
  try {
    const user = await getCurrentUserFromContext();
    if (!user) {
      throw new AuthContextError(401, "Unauthorized");
    }

    return await runWithTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }, async () => {
      const [given, received] = await Promise.all([
        delegationService.listGivenByUser(user.tenantId, user.id),
        delegationService.listReceivedByUser(user.tenantId, user.id),
      ]);

      return noStoreJson({ given: given.items, received: received.items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromContext();
    if (!user) {
      throw new AuthContextError(401, "Unauthorized");
    }

    return await runWithTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }, async () => {
      const payload = await request.json();
      const created = await delegationService.createDelegation(user.tenantId, {
        grantorUserId: user.id,
        granteeUserId: payload.granteeUserId,
        startAt: payload.startAt,
        endAt: payload.endAt,
      });

      return noStoreJson({ item: created });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DelegationPolicyError) {
      return noStoreJson({ message: error.message }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
