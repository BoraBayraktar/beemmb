import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const transferInventorySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  fromWarehouseCode: z.string().trim().min(1).max(32),
  toWarehouseCode: z.string().trim().min(1).max(32),
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().min(3).max(280).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("inventoryQuickActions.manage");
    const payload = transferInventorySchema.parse(await request.json());

    await inventoryService.transferProductInventory({
      productId: payload.productId,
      variantId: payload.variantId,
      sku: payload.sku,
      fromWarehouseCode: payload.fromWarehouseCode,
      toWarehouseCode: payload.toWarehouseCode,
      quantity: payload.quantity,
      note: payload.note ?? "Inventory manager warehouse transfer",
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "INVENTORY",
      entityId: payload.productId,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Stok transferi uygulandı: ${payload.sku}`,
      metadata: {
        fromWarehouseCode: payload.fromWarehouseCode,
        toWarehouseCode: payload.toWarehouseCode,
        variantId: payload.variantId ?? null,
        quantity: payload.quantity,
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

    if (error instanceof Error && error.message.startsWith("WAREHOUSE_NOT_FOUND:")) {
      return NextResponse.json({ message: "Warehouse not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("WAREHOUSE_LEVEL_NOT_FOUND:")) {
      return NextResponse.json({ message: "Source warehouse level not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_TRANSFER_STOCK:")) {
      return NextResponse.json({ message: "Insufficient transferable stock" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "WAREHOUSE_TRANSFER_SAME_SOURCE_TARGET") {
      return NextResponse.json({ message: "Source and target warehouse cannot be the same" }, { status: 400 });
    }

    if (error instanceof Error && error.message.startsWith("PRODUCT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
