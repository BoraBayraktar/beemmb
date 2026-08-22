import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("inventoryCounts.manage");
    const { id } = await context.params;
    const applied = await inventoryService.applyStockCount(id);

    await auditLogService.recordFromRequest(request, {
      entityType: "STOCK_COUNT",
      entityId: id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Stok sayımı uygulandı: ${applied.countNumber}`,
      metadata: {
        transactionNumber: applied.transactionNumber,
      },
    });

    return NextResponse.json({ ok: true, ...applied });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message.startsWith("STOCK_COUNT_NOT_FOUND:")) {
      return NextResponse.json({ message: "Stok sayımı bulunamadı." }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("INVENTORY_LEVEL_NOT_FOUND:")) {
      return NextResponse.json({ message: "Sayım satırı için depo stoku bulunamadı." }, { status: 404 });
    }

    if (error instanceof Error && error.message.startsWith("STOCK_COUNT_STALE_LEVEL:")) {
      const [, sku, warehouseCode, expected, actual] = error.message.split(":");

      return NextResponse.json({
        message: `Sayım satırları güncel stokla uyuşmuyor. ${sku} / ${warehouseCode} için beklenen ${expected}, güncel ${actual}. Sayımı yenileyip tekrar deneyin.`,
      }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("STOCK_COUNT_HAS_ACTIVE_RESERVATIONS:")) {
      const [, sku, warehouseCode, reserved] = error.message.split(":");

      return NextResponse.json({
        message: `Bu depoda aktif rezervasyon bulunduğu için sayım uygulanamadı. ${sku} / ${warehouseCode} için rezervasyon miktarı ${reserved}.`,
      }, { status: 409 });
    }

    if (error instanceof Error && (error.message === "STOCK_COUNT_ALREADY_APPLIED" || error.message === "STOCK_COUNT_NOT_READY")) {
      return NextResponse.json({
        message: error.message === "STOCK_COUNT_NOT_READY"
          ? "Sayımı uygulamadan önce sayım satırlarını doldurmalısınız."
          : "Bu stok sayımı zaten uygulanmış.",
      }, { status: 409 });
    }

    if (error instanceof Error && error.message === "SERIALIZABLE_TRANSACTION_FAILED") {
      return NextResponse.json({
        message: "Sayım uygulanırken eşzamanlı stok değişikliği algılandı. Sayımı yenileyip tekrar deneyin.",
      }, { status: 409 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
