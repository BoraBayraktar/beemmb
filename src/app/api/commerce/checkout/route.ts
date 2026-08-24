import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { CommerceCheckoutError, commerceService } from "@/modules/commerce/services/commerce.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const user = await getCurrentUserFromContext();
    const result = await runWithTenantContext(
      { tenantId: user?.tenantId ?? PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => commerceService.checkout(
        payload,
        user?.role === "CUSTOMER"
          ? {
              email: user.email,
              name: user.name,
            }
          : null,
      ),
    );
    await auditLogService.recordFromRequest(request, {
      entityType: "ORDER",
      entityId: result.orderNumber,
      action: "CREATE",
      actorUserId: user?.id ?? null,
      actorType: user ? "USER" : "SYSTEM",
      summary: `Checkout siparişi oluşturuldu: ${result.orderNumber}`,
      metadata: {
        total: result.total,
        currency: result.currency,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof CommerceCheckoutError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
