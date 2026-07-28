import { ZodError } from "zod";

import { documentDispatchJson } from "@/lib/edocument-admin-route-response";
import { documentDispatchService } from "@/modules/documents/services/document-dispatch.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("documents.manage");
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const item = await documentDispatchService.queueOutboundDispatch({
      id,
      channel: "EDOCS_MOCK",
      providerConfigId: typeof payload.providerConfigId === "string" ? payload.providerConfigId : undefined,
      forceFail: payload.forceFail === true,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: item.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Belge outbound kuyruğuna alındı: ${item.documentNumber}`,
      metadata: {
        documentId: item.id,
        orderId: item.orderId,
        documentNumber: item.documentNumber,
        externalSystemStatus: item.externalSystemStatus,
        dispatchCount: item.dispatches.length,
      },
    });

    return documentDispatchJson({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentDispatchJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return documentDispatchJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentDispatchJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return documentDispatchJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
