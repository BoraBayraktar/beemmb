import { ZodError } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { documentService, DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export function buildCreateInvoiceHeaders() {
  return buildNoStoreHeaders();
}

export function createInvoiceJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("documents.manage");
    const { id } = await context.params;
    const created = await documentService.createInvoiceFromDeliveryNote(id);

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: `İrsaliyeden e-fatura oluşturuldu: ${created.documentNumber}`,
      metadata: {
        documentId: created.id,
        orderId: created.orderId,
        documentType: created.documentType,
        sourceDocumentId: id,
        inventoryTransactionId: created.inventoryTransactionId,
      },
    });

    return createInvoiceJson({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return createInvoiceJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return createInvoiceJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return createInvoiceJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("BusinessDocument_documentNumber_key")) {
      return createInvoiceJson({ message: "Bu e-fatura numarası zaten kullanılıyor." }, { status: 409 });
    }

    return createInvoiceJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
