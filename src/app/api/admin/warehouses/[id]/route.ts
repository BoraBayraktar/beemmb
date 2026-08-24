import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("warehouses.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await inventoryService.updateWarehouse({
        id,
        ...payload,
      });
      await auditLogService.recordFromRequest(request, {
        entityType: "WAREHOUSE",
        entityId: updated.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Depo güncellendi: ${updated.code}`,
      });
      return NextResponse.json({ item: updated });
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
