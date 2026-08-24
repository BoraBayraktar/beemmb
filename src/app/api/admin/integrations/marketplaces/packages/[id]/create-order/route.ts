import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { MarketplaceOrderCreationError } from "@/modules/commerce/services/marketplace-order.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const { id } = await params;
      const result = await marketplaceIntegrationService.createOrderFromPackage({ packageId: id });
      await auditLogService.recordFromRequest(request, {
        entityType: "MARKETPLACE_PACKAGE",
        entityId: id,
        action: "CREATE",
        actorUserId: user.id,
        summary: "Pazaryeri paketinden sipariş oluşturuldu",
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

    if (error instanceof MarketplaceOrderCreationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NOT_READY") {
      return NextResponse.json({ message: "Package is not ready for order creation" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NOT_FOUND") {
      return NextResponse.json({ message: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
