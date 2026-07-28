import { NextResponse } from "next/server";
import { z } from "zod";

import type { FinanceReportExportKey } from "@/modules/finance/services/finance-report-export.service";
import { financeReportExportService } from "@/modules/finance/services/finance-report-export.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

const exportQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  financialAccountId: z.string().trim().optional(),
});

const exportKeys = new Set<FinanceReportExportKey>(["cashflow", "aging", "income-expense", "bank-cash", "vat-summary"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ reportKey: string }> },
) {
  try {
    await requirePermission("finance.read");
    const { reportKey } = await context.params;

    if (!exportKeys.has(reportKey as FinanceReportExportKey)) {
      return NextResponse.json({ message: "Geçersiz rapor anahtarı." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = exportQuerySchema.parse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      financialAccountId: searchParams.get("financialAccountId") ?? undefined,
    });

    const exported = await financeReportExportService.exportReportTableCsv(
      "tr",
      reportKey as FinanceReportExportKey,
      parsedQuery,
    );

    return new NextResponse(exported.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message.includes("satır")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
