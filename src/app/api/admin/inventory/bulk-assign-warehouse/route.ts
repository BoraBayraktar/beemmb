import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const schema = z.object({
  csv: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("inventory.manage", async (user) => {
      const payload = schema.parse(await request.json());
      const result = await inventoryService.bulkAssignPreferredSalesWarehouse(
        inventoryService.parseBulkPreferredWarehouseCsv(payload.csv),
      );

      await auditLogService.recordFromRequest(request, {
        entityType: "INVENTORY",
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Toplu tercih edilen depo ataması işlendi: ${result.successCount}/${result.total}`,
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
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
