import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/observability";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { expenseReportAnalyticsService } from "@/modules/expense-reports/services/expense-report-analytics.service";
import { expenseReportExportService } from "@/modules/expense-reports/services/expense-report-export.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("expenseReports.manage", async () => {
      const { searchParams } = new URL(request.url);
      const format = searchParams.get("format") === "pdf" ? "pdf" : "excel";

      const { items, totalAmount } = await expenseReportAnalyticsService.getExportRows({
        search: searchParams.get("search") ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        employeeUserId: searchParams.get("employeeUserId") ?? undefined,
        status: (searchParams.get("status") as "all" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | null) ?? undefined,
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
      });

      const dateStamp = new Date().toISOString().slice(0, 10);

      if (format === "pdf") {
        const buffer = await expenseReportExportService.buildPdfBuffer(items, totalAmount);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="masraf-raporu-${dateStamp}.pdf"`,
          },
        });
      }

      const buffer = await expenseReportExportService.buildExcelBuffer(items, totalAmount);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="masraf-raporu-${dateStamp}.xlsx"`,
        },
      });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    logError("Masraf raporu dışa aktarılamadı", { scope: "expenseReports.report.export", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Rapor dışa aktarılırken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
