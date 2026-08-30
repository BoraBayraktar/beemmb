import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("financeTransactions.manage", async () => {
      const { id } = await context.params;
      const item = await cashTransactionsService.getTransactionDetail(id);

      if (!item) {
        return NextResponse.json({ message: "Finans hareketi bulunamadı." }, { status: 404 });
      }

      return NextResponse.json({ item });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("financeTransactions.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const result = await cashTransactionsService.updateTransaction(id, {
        amount: payload.amount,
        title: payload.title,
        note: payload.note,
        transactionAt: payload.transactionAt,
        actorUserId: user.id,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "FINANCE_COLLECTION",
        entityId: result.item.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Kasa/banka hareketi düzeltildi: ${result.item.title}`,
        metadata: {
          previousTransactionId: result.previousId,
          amount: result.item.amount,
          currency: result.item.currency,
        },
      });

      return NextResponse.json({ item: result.item });
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
