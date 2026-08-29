import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { expenseReportAnalyticsService } from "@/modules/expense-reports/services/expense-report-analytics.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("expenseReports.manage", async () => {
      const { searchParams } = new URL(request.url);
      const result = await expenseReportAnalyticsService.listItemReport({
        search: searchParams.get("search") ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        employeeUserId: searchParams.get("employeeUserId") ?? undefined,
        status: (searchParams.get("status") as "all" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | null) ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 25,
      });

      return noStoreJson(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
