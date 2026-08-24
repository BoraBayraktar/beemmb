import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const stockInSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).max(64),
  warehouseCode: z.string().trim().min(1).max(32),
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().min(3).max(280).optional(),
  documentType: z.enum(["PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE", "E_DISPATCH"]).optional(),
  sourceDocumentNumber: z.string().trim().min(1).max(120).optional(),
  sourceDocumentDate: z.string().datetime().optional(),
  sourceDocumentSupplierId: z.string().trim().min(1).optional(),
  sourceDocumentSupplier: z.string().trim().min(2).max(160).optional(),
  sourceDocumentReference: z.string().trim().min(1).max(160).optional(),
  externalSystemStatus: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional(),
  unitCost: z.coerce.number().nonnegative().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("inventoryQuickActions.manage", async (user) => {
      const payload = stockInSchema.parse(await request.json());

      await inventoryService.recordProductInventoryMovement({
        productId: payload.productId,
        variantId: payload.variantId,
        sku: payload.sku,
        warehouseCode: payload.warehouseCode,
        quantity: payload.quantity,
        type: "PURCHASE_RECEIPT",
        note: payload.note ?? "Stok yöneticisi stok girişi",
        documentType: payload.documentType,
        sourceDocumentNumber: payload.sourceDocumentNumber,
        sourceDocumentDate: payload.sourceDocumentDate,
        sourceDocumentSupplierId: payload.sourceDocumentSupplierId,
        sourceDocumentSupplier: payload.sourceDocumentSupplier,
        sourceDocumentReference: payload.sourceDocumentReference,
        externalSystemStatus: payload.externalSystemStatus,
        unitCost: payload.unitCost ?? null,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "INVENTORY",
        entityId: payload.productId,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Stok girişi uygulandı: ${payload.sku}`,
        metadata: {
          warehouseCode: payload.warehouseCode,
          variantId: payload.variantId ?? null,
          quantity: payload.quantity,
          documentType: payload.documentType ?? null,
          sourceDocumentNumber: payload.sourceDocumentNumber ?? null,
          sourceDocumentSupplierId: payload.sourceDocumentSupplierId ?? null,
          sourceDocumentSupplier: payload.sourceDocumentSupplier ?? null,
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
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error && error.message.startsWith("WAREHOUSE_NOT_FOUND:")) {
      return NextResponse.json({ message: "Depo bulunamadı." }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("PRODUCT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Ürün bulunamadı." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "SUPPLIER_NOT_FOUND") {
      return NextResponse.json({ message: "Tedarikçi bulunamadı." }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("PurchaseReceipt_receiptNumber_key")) {
      return NextResponse.json({ message: "Bu satın alma belge numarası zaten kullanılıyor." }, { status: 409 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
