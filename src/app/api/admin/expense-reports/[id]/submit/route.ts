import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { ExpenseReportAdminError, expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("expenseReports.submit", async (user) => {
      const { id } = await context.params;
      const updated = await expenseReportService.submit(id, { id: user.id, hasManage: false });

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        entityId: updated.id,
        action: "STATUS_UPDATE",
        actorUserId: user.id,
        summary: `Masraf bildirimi onaya gönderildi: ${updated.reportNumber}`,
        metadata: { expenseReportId: updated.id, status: updated.status, totalAmount: updated.totalAmount },
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

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
