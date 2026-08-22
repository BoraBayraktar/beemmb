import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("financeTransactions.manage");
    const { id } = await context.params;
    const item = await cashTransactionsService.getTransactionDetail(id);

    if (!item) {
      return NextResponse.json({ message: "Finans hareketi bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ item });
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
