import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";

export async function GET() {
  try {
    return await requirePermission("expenseReports.submit", async () => {
      const items = await expenseSettingsService.listActiveCategories();
      return noStoreJson({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
