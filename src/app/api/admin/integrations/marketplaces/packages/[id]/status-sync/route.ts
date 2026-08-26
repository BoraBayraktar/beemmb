import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const { id } = await params;
      const payload = await request.json();
      const result = await marketplaceIntegrationService.queuePackageStatusSync({
        ...payload,
        packageId: id,
      });
      await auditLogService.recordFromRequest(request, {
        entityType: "MARKETPLACE_PACKAGE",
        entityId: id,
        action: "SYNC",
        actorUserId: user.id,
        summary: "Pazaryeri paket durum senkronu kuyruğa alındı",
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

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NOT_FOUND") {
      return NextResponse.json({ message: "Package not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_STATUS_ORDER_INVALID") {
      return NextResponse.json({ message: "Package status order is invalid" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
