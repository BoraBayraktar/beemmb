import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { IncomingInvoiceAdminError, incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("incomingInvoices.manage");

    const contentType = request.headers.get("content-type") ?? "";
    let xmlContent: string;
    let supplierId: string | null | undefined;
    let note: string | null | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return noStoreJson({ message: "XML dosyası bulunamadı." }, { status: 400 });
      }
      xmlContent = await file.text();
      supplierId = (formData.get("supplierId") as string) || null;
      note = (formData.get("note") as string) || null;
    } else {
      const payload = await request.json();
      xmlContent = payload.xmlContent;
      supplierId = payload.supplierId ?? null;
      note = payload.note ?? null;
    }

    const created = await incomingInvoiceService.importIncomingInvoiceFromXml({ xmlContent, supplierId, note }, user.id);

    await auditLogService.recordFromRequest(request, {
      entityType: "INCOMING_INVOICE",
      entityId: created.id,
      action: "IMPORT",
      actorUserId: user.id,
      summary: `Gelen fatura XML'den içe aktarıldı: ${created.documentNumber}`,
      metadata: {
        incomingInvoiceId: created.id,
        documentNumber: created.documentNumber,
        totalAmount: created.totalAmount,
      },
    });

    return noStoreJson({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof IncomingInvoiceAdminError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
