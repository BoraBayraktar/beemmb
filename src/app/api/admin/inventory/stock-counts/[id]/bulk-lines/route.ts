import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const schema = z.object({
  csv: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("inventoryCounts.manage", async (user) => {
      const { id } = await context.params;
      const payload = schema.parse(await request.json());
      const result = await inventoryService.bulkUpdateStockCountLines(
        id,
        inventoryService.parseBulkStockCountCsv(payload.csv),
      );

      await auditLogService.recordFromRequest(request, {
        entityType: "STOCK_COUNT",
        entityId: id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Toplu stok sayım satırı güncellemesi işlendi: ${result.successCount}/${result.total}`,
        metadata: result,
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
    if (error instanceof Error && error.message.startsWith("STOCK_COUNT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Stock count not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
