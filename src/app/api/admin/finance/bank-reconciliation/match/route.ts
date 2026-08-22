import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function POST(request: Request) {
  try {
    await requirePermission("financeBankReconciliation.manage");
    const payload = await request.json();
    const workspace = await bankReconciliationService.assignMatch(payload);
    return NextResponse.json({ workspace });
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
