import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("expenseSettings.manage", async () => {
      const items = await expenseSettingsService.listAllCategories();
      return noStoreJson({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("expenseSettings.manage", async (user) => {
      const payload = await request.json();
      const created = await expenseSettingsService.upsertCategory(payload);

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: `Masraf kategorisi oluşturuldu: ${created.name}`,
        metadata: { categoryId: created.id },
      });

      return noStoreJson({ item: created }, { status: 201 });
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
