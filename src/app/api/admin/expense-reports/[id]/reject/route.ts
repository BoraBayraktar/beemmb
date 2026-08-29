import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { ExpenseReportAdminError, expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("expenseReports.approve", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const hasManage = await rbacService.hasPermission(user, "expenseReports.manage");
      const updated = await expenseReportService.reject({ id, decisionNote: payload.decisionNote }, { id: user.id, hasManage });

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        entityId: updated.id,
        action: "STATUS_UPDATE",
        actorUserId: user.id,
        summary: `Masraf bildirimi reddedildi: ${updated.reportNumber}`,
        metadata: { expenseReportId: updated.id, status: updated.status },
      });

      return noStoreJson({ item: updated });
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
