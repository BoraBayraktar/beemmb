import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { expenseReportAnalyticsService } from "@/modules/expense-reports/services/expense-report-analytics.service";

export async function GET() {
  try {
    return await requirePermission("expenseReports.manage", async () => {
      const analytics = await expenseReportAnalyticsService.getAnalytics();
      return noStoreJson(analytics);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
