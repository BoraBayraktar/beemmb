import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { negotiableInstrumentService } from "@/modules/finance/services/negotiable-instrument.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("financeInstruments.manage", async (user) => {
      const payload = await request.json();
      const created = await negotiableInstrumentService.createInstrument({
        ...payload,
        createdByUserId: user.id,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "FINANCE_COLLECTION",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: "Çek/senet kaydı oluşturuldu",
        metadata: {
          instrumentNumber: created.instrumentNumber,
          direction: created.direction,
          amount: created.amount,
        },
      });

      return NextResponse.json(created, { status: 201 });
    });
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
