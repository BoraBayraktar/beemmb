import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const stockOutSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().min(1).max(32),
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().min(3).max(280).optional(),
  documentType: z.enum(["PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE", "E_DISPATCH"]).optional(),
  sourceDocumentNumber: z.string().trim().min(1).max(120).optional(),
  sourceDocumentReference: z.string().trim().min(1).max(160).optional(),
  externalSystemStatus: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional(),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("inventoryQuickActions.manage", async (user) => {
      const payload = stockOutSchema.parse(await request.json());

      await inventoryService.recordProductInventoryMovement({
        productId: payload.productId,
        variantId: payload.variantId,
        sku: payload.sku,
        warehouseCode: payload.warehouseCode,
        quantity: payload.quantity,
        type: "DAMAGE_WRITE_OFF",
        note: payload.note ?? "Stok yöneticisi stok çıkışı",
        documentType: payload.documentType,
        sourceDocumentNumber: payload.sourceDocumentNumber,
        sourceDocumentReference: payload.sourceDocumentReference,
        externalSystemStatus: payload.externalSystemStatus,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "INVENTORY",
        entityId: payload.productId,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Stok çıkışı uygulandı: ${payload.sku}`,
        metadata: {
          warehouseCode: payload.warehouseCode,
          variantId: payload.variantId ?? null,
          quantity: payload.quantity,
          documentType: payload.documentType ?? null,
          sourceDocumentNumber: payload.sourceDocumentNumber ?? null,
          externalSystemStatus: payload.externalSystemStatus ?? null,
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

    if (error instanceof Error && error.message.startsWith("WAREHOUSE_LEVEL_NOT_FOUND:")) {
      return NextResponse.json({ message: "Warehouse level not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_MOVEMENT_STOCK:")) {
      return NextResponse.json({ message: "Insufficient available stock" }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("PRODUCT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
