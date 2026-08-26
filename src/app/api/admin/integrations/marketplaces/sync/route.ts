import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const payload = await request.json();
      const result = await marketplaceIntegrationService.queueOrderImport(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "INTEGRATION",
        action: "SYNC",
        actorUserId: user.id,
        summary: "Pazaryeri sipariş import kuyruğu oluşturuldu",
        metadata: {
          channel: payload.channel ?? null,
        },
      });
      return NextResponse.json(result, { status: 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
