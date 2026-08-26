import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const { lineId } = await params;
      const result = await marketplaceIntegrationService.ignorePackageLine({ lineId });
      await auditLogService.recordFromRequest(request, {
        entityType: "MARKETPLACE_PACKAGE",
        entityId: lineId,
        action: "UPDATE",
        actorUserId: user.id,
        summary: "Pazaryeri paket satırı yok sayıldı",
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

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NOT_FOUND") {
      return NextResponse.json({ message: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
