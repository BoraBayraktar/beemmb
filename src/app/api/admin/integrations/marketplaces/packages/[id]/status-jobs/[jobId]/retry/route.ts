import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const { id, jobId } = await params;
      const result = await marketplaceIntegrationService.retryPackageStatusJob({
        packageId: id,
        jobId,
        resolvedByUserId: user.id,
      });
      await auditLogService.recordFromRequest(request, {
        entityType: "MARKETPLACE_PACKAGE",
        entityId: id,
        action: "SYNC",
        actorUserId: user.id,
        summary: "Pazaryeri paket durum işi tekrar kuyruğa alındı",
        metadata: {
          jobId,
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

    if (error instanceof Error && error.message === "MARKETPLACE_STATUS_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Status job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Dead letter not found") {
      return NextResponse.json({ message: "Dead letter not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
