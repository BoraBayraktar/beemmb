import { ZodError } from "zod";

import { documentStatusSyncJson } from "@/lib/edocument-admin-route-response";
import { documentDispatchService } from "@/modules/documents/services/document-dispatch.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("documents.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json().catch(() => ({}));
      const item = await documentDispatchService.queueStatusSync({
        id,
        providerConfigId: typeof payload.providerConfigId === "string" ? payload.providerConfigId : undefined,
        forceFail: payload.forceFail === true,
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "BUSINESS_DOCUMENT",
        entityId: item.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Belge durum senkronu kuyruğa alındı: ${item.documentNumber}`,
        metadata: {
          documentId: item.id,
          orderId: item.orderId,
          documentNumber: item.documentNumber,
          providerConfigId: item.providerConfigId,
        },
      });

      return documentStatusSyncJson({ item }, { status: 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentStatusSyncJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return documentStatusSyncJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentStatusSyncJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return documentStatusSyncJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
