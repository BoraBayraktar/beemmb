import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requireAnyPermission } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { ExpenseReportAdminError, expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requireAnyPermission(["expenseReports.submit", "expenseReports.approve", "expenseReports.manage"], async (user) => {
      const { id } = await context.params;
      const hasManage = await rbacService.hasPermission(user, "expenseReports.manage");
      const item = await expenseReportService.getDetail(id, { id: user.id, hasManage });

      return noStoreJson({ item });
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requireAnyPermission(["expenseReports.submit"], async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await expenseReportService.updateNote({ id, note: payload.note }, { id: user.id, hasManage: false });

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        entityId: updated.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Masraf bildirimi notu güncellendi: ${updated.reportNumber}`,
        metadata: { expenseReportId: updated.id },
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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requireAnyPermission(["expenseReports.submit"], async (user) => {
      const { id } = await context.params;
      await expenseReportService.discardDraft(id, { id: user.id, hasManage: false });

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        entityId: id,
        action: "DELETE",
        actorUserId: user.id,
        summary: "Masraf bildirimi taslağı silindi.",
        metadata: { expenseReportId: id },
      });

      return noStoreJson({ success: true });
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
