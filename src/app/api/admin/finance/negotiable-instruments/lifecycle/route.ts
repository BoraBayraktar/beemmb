import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { negotiableInstrumentService } from "@/modules/finance/services/negotiable-instrument.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("finance.manage");
    const payload = await request.json();
    const updated = await negotiableInstrumentService.applyLifecycle({
      instrumentId: payload.instrumentId,
      action: payload.action,
      financialAccountId: payload.financialAccountId,
      actorUserId: user.id,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "FINANCE_COLLECTION",
      entityId: updated.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: "Çek/senet durum geçişi uygulandı",
      metadata: {
        action: payload.action,
        status: updated.status,
        cashTransactionId: updated.cashTransactionId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
