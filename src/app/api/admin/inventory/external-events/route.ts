import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    await requirePermission("inventoryExternalEvents.read");
    const result = await inventoryService.listRecentExternalStockEvents();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("inventoryExternalEvents.manage");
    const payload = await request.json();
    const result = await inventoryService.receiveExternalStockEvent(payload);

    await auditLogService.recordFromRequest(request, {
      entityType: "INVENTORY",
      entityId: result.productId,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Harici stok eventi işlendi: ${result.status}`,
      metadata: {
        eventId: result.eventId,
        duplicate: result.duplicate,
        warehouseId: result.warehouseId,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message === "EXTERNAL_STOCK_MAPPING_NOT_FOUND") {
        return NextResponse.json({ message: "Harici stok eventi için eşleşen entegrasyon eşlemesi bulunamadı." }, { status: 409 });
      }

      if (error.message === "EXTERNAL_STOCK_MAPPING_READ_ONLY") {
        return NextResponse.json({ message: "Bu entegrasyon eşlemesi harici stok yazımına kapalıdır." }, { status: 409 });
      }

      if (error.message === "EXTERNAL_STOCK_TARGET_LEVEL_NOT_FOUND") {
        return NextResponse.json({ message: "Eşleme için kullanılabilir bir depo seviyesi bulunamadı." }, { status: 409 });
      }
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
