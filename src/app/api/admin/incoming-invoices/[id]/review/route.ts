import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { IncomingInvoiceAdminError, incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("incomingInvoices.manage");
    const { id } = await context.params;
    const updated = await incomingInvoiceService.reviewIncomingInvoice(id, user.id);

    await auditLogService.recordFromRequest(request, {
      entityType: "INCOMING_INVOICE",
      entityId: updated.id,
      action: "STATUS_UPDATE",
      actorUserId: user.id,
      summary: `Gelen fatura onaylandı ve muhasebeleştirildi: ${updated.documentNumber}`,
      metadata: { incomingInvoiceId: updated.id, status: updated.status, totalAmount: updated.totalAmount },
    });

    return noStoreJson({ item: updated });
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
