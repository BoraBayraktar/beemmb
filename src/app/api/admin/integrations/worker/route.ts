import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { integrationService } from "@/modules/integration/services/integration.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const payload = await request.json().catch(() => ({}));
      const result = await integrationService.processQueue(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "INTEGRATION",
        action: "SYNC",
        actorUserId: user.id,
        summary: "Entegrasyon kuyruğu işlendi",
        metadata: {
          processed: result.processed,
          success: result.success,
          failed: result.failed,
          deadLetter: result.deadLetter,
        },
      });
      return NextResponse.json(result);
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
