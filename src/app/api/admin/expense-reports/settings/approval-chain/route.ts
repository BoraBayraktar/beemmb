import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { ExpenseSettingsAdminError, expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("expenseSettings.manage", async () => {
      const [steps, candidates] = await Promise.all([
        expenseSettingsService.listApprovalChain(),
        expenseSettingsService.listApproverCandidates(),
      ]);

      return noStoreJson({ steps, candidates });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    return await requirePermission("expenseSettings.manage", async (user) => {
      const payload = await request.json();
      const updated = await expenseSettingsService.replaceApprovalChain(payload);

      await auditLogService.recordFromRequest(request, {
        entityType: "EXPENSE_REPORT",
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Masraf onay akışı güncellendi: ${updated.map((step) => `${step.stepOrder}. ${step.approverName}`).join(", ")}`,
        metadata: { steps: updated.map((step) => ({ stepOrder: step.stepOrder, approverUserId: step.approverUserId })) },
      });

      return noStoreJson({ steps: updated });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ExpenseSettingsAdminError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
