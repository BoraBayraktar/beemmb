import { ZodError } from "zod";

import {
  adminDocumentsJson,
} from "@/lib/edocument-admin-route-response";
import { documentService, DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("documents.read", async () => {
      const { searchParams } = new URL(request.url);
      const result = await documentService.listBusinessDocuments({
        search: searchParams.get("search") ?? undefined,
        documentType: (searchParams.get("documentType") as "all" | "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH" | null) ?? undefined,
        status: (searchParams.get("status") as "all" | "DRAFT" | "LINKED" | "ISSUED" | "CANCELLED" | null) ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
      });

      return adminDocumentsJson(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return adminDocumentsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return adminDocumentsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return adminDocumentsJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return adminDocumentsJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("documents.manage", async (user) => {
      const payload = await request.json();
      const created = await documentService.createBusinessDocument(payload);

      await auditLogService.recordFromRequest(request, {
        entityType: "BUSINESS_DOCUMENT",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: `Belge oluşturuldu: ${created.documentNumber}`,
        metadata: {
          documentId: created.id,
          orderId: created.orderId,
          documentNumber: created.documentNumber,
          documentType: created.documentType,
          inventoryTransactionId: created.inventoryTransactionId,
        },
      });

      return adminDocumentsJson({ item: created }, { status: 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return adminDocumentsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return adminDocumentsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return adminDocumentsJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("BusinessDocument_tenantId_documentNumber_key")) {
      return adminDocumentsJson({ message: "Bu belge numarası zaten kullanılıyor." }, { status: 409 });
    }

    return adminDocumentsJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
