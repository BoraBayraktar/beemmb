import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { integrationService } from "@/modules/integration/services/integration.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const { jobId } = await context.params;
      const result = await integrationService.retryDeadLetter({
        jobId,
        resolvedByUserId: user.id,
      });
      await auditLogService.recordFromRequest(request, {
        entityType: "INTEGRATION",
        entityId: jobId,
        action: "SYNC",
        actorUserId: user.id,
        summary: "Dead letter entegrasyon işi tekrar kuyruğa alındı",
      });

      return NextResponse.json({ item: result });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Dead letter not found") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
