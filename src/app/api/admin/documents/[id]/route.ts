import { ZodError } from "zod";

import { adminDocumentDetailJson } from "@/lib/edocument-admin-route-response";
import { documentService, DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("documents.read", async () => {
      const { id } = await context.params;
      const item = await documentService.getBusinessDocumentById(id);
      return adminDocumentDetailJson({ item });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return adminDocumentDetailJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return adminDocumentDetailJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return adminDocumentDetailJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return adminDocumentDetailJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("documents.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await documentService.updateBusinessDocument({ id, ...payload });

      await auditLogService.recordFromRequest(request, {
        entityType: "BUSINESS_DOCUMENT",
        entityId: updated.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Belge güncellendi: ${updated.documentNumber}`,
        metadata: {
          documentId: updated.id,
          orderId: updated.orderId,
          status: updated.status,
          externalSystemStatus: updated.externalSystemStatus,
        },
      });

      return adminDocumentDetailJson({ item: updated });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return adminDocumentDetailJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return adminDocumentDetailJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return adminDocumentDetailJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return adminDocumentDetailJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
