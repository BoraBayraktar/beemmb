import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { DelegationPolicyError, delegationService } from "@/modules/delegation/services/delegation.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET() {
  try {
    return await requirePermission("delegations.manage", async (user) => {
      const all = await delegationService.listAll(user.tenantId);
      return noStoreJson({ items: all.items });
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
    return await requirePermission("delegations.manage", async (user) => {
      const payload = await request.json();
      const created = await delegationService.createDelegation(user.tenantId, {
        grantorUserId: payload.grantorUserId,
        granteeUserId: payload.granteeUserId,
        startAt: payload.startAt,
        endAt: payload.endAt,
        createdByUserId: user.id,
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
