import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("financeBankReconciliation.manage");
    const payload = await request.json();
    const result = await bankReconciliationService.importStatement({
      financialAccountId: payload.financialAccountId,
      fileName: payload.fileName,
      csvContent: payload.csvContent,
      importedByUserId: user.id,
      autoConfirmHighConfidence: payload.autoConfirmHighConfidence === true,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "FINANCE_COLLECTION",
      entityId: result.import.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: "Banka ekstresi içe aktarıldı",
      metadata: {
        financialAccountId: result.import.financialAccountId,
        lineCount: result.import.lineCount,
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
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
