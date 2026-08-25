import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { CommerceOrderAdminError, commerceService } from "@/modules/commerce/services/commerce.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("orders.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await commerceService.updateOrderShipmentInfo({ id, ...payload });

      await auditLogService.recordFromRequest(request, {
        entityType: "ORDER",
        entityId: id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Sipariş kargo bilgisi güncellendi: ${updated.shipment.shipmentStatus}`,
        metadata: {
          scope: "orderShipment",
        },
      });

      return NextResponse.json({ item: updated });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof CommerceOrderAdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
