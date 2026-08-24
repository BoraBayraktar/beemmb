import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const adjustInventorySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().min(1).max(32).optional(),
  targetOnHandStock: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  safetyStock: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().min(3).max(280).optional(),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("inventoryQuickActions.manage", async (user) => {
      const payload = adjustInventorySchema.parse(await request.json());

      await inventoryService.syncProductInventoryState({
        productId: payload.productId,
        variantId: payload.variantId,
        sku: payload.sku,
        warehouseCode: payload.warehouseCode,
        targetOnHandStock: payload.targetOnHandStock,
        reorderPoint: payload.reorderPoint,
        safetyStock: payload.safetyStock,
        note: payload.note ?? "Inventory manager manual adjustment",
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "INVENTORY",
        entityId: payload.productId,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Manuel stok düzeltmesi uygulandı: ${payload.sku}`,
        metadata: {
          warehouseCode: payload.warehouseCode ?? null,
          variantId: payload.variantId ?? null,
          targetOnHandStock: payload.targetOnHandStock,
          reorderPoint: payload.reorderPoint ?? null,
          safetyStock: payload.safetyStock ?? null,
        },
      });

      return NextResponse.json({ ok: true });
    });
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

    if (error instanceof Error && error.message.startsWith("PRODUCT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
