import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { IncomingInvoiceAdminError, incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("incomingInvoices.read");
    const { id } = await context.params;
    const item = await incomingInvoiceService.getIncomingInvoiceDetail(id);
    return noStoreJson({ item });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof IncomingInvoiceAdminError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("incomingInvoices.manage");
    const { id } = await context.params;
    const payload = await request.json();
    const updated = await incomingInvoiceService.updateIncomingInvoice({ id, ...payload });

    await auditLogService.recordFromRequest(request, {
      entityType: "INCOMING_INVOICE",
      entityId: updated.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Gelen fatura güncellendi: ${updated.documentNumber}`,
      metadata: { incomingInvoiceId: updated.id },
    });

    return noStoreJson({ item: updated });
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
