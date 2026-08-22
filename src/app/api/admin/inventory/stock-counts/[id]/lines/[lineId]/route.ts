import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const updateLineSchema = z.object({
  countedOnHand: z.coerce.number().int().min(0),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    const user = await requirePermission("inventoryCounts.manage");
    const { id, lineId } = await context.params;
    const payload = updateLineSchema.parse(await request.json());

    await inventoryService.updateStockCountLine({
      stockCountId: id,
      lineId,
      countedOnHand: payload.countedOnHand,
      note: payload.note,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "STOCK_COUNT",
      entityId: lineId,
      action: "UPDATE",
      actorUserId: user.id,
      summary: "Stok sayım satırı güncellendi",
      metadata: {
        stockCountId: id,
        countedOnHand: payload.countedOnHand,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message.startsWith("STOCK_COUNT_LINE_NOT_FOUND:")) {
      return NextResponse.json({ message: "Stock count line not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "STOCK_COUNT_ALREADY_APPLIED") {
      return NextResponse.json({ message: "Stock count is already applied" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
