import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { paymentsService } from "@/modules/finance/services/payments.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("financePayments.manage", async () => {
      const items = await paymentsService.listPaymentRecords();
      return NextResponse.json({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("financePayments.manage", async (user) => {
      const payload = await request.json();
      const created = await paymentsService.createPaymentRecord({
        ...payload,
        recordedByUserId: user.id,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "FINANCE_PAYMENT",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: "Ödeme kaydı oluşturuldu",
        metadata: {
          paymentRecordId: created.id,
          supplierId: created.supplierId,
          amount: created.amount,
          currency: created.currency,
        },
      });

      return NextResponse.json({ item: created }, { status: 201 });
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
