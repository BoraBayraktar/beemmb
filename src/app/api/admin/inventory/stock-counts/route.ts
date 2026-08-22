import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const createStockCountSchema = z.object({
  warehouseCode: z.string().trim().min(1).max(32).optional().nullable(),
  countedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("inventoryCounts.manage");
    const payload = createStockCountSchema.parse(await request.json());

    const created = await inventoryService.createStockCount(payload);

    await auditLogService.recordFromRequest(request, {
      entityType: "STOCK_COUNT",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: `Stok sayımı oluşturuldu: ${created.countNumber}`,
      metadata: {
        warehouseCode: created.warehouseCode,
        lineCount: created.lineCount,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message.startsWith("WAREHOUSE_NOT_FOUND:")) {
      return NextResponse.json({ message: "Warehouse not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "STOCK_COUNT_EMPTY_SCOPE") {
      return NextResponse.json({ message: "No inventory rows matched the count scope" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
