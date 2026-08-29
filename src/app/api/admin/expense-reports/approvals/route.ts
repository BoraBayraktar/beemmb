import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { ExpenseReportAdminError, expenseReportService } from "@/modules/expense-reports/services/expense-report.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("expenseReports.approve", async (user) => {
      const { searchParams } = new URL(request.url);
      const result = await expenseReportService.listApprovals(user.id, {
        scope: "approvals",
        search: searchParams.get("search") ?? undefined,
        status: (searchParams.get("status") as "all" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | null) ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
      });

      return noStoreJson(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ExpenseReportAdminError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
