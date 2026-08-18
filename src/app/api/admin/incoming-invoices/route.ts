import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { IncomingInvoiceAdminError, incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    await requirePermission("incomingInvoices.read");
    const { searchParams } = new URL(request.url);
    const result = await incomingInvoiceService.listIncomingInvoices({
      search: searchParams.get("search") ?? undefined,
      source: (searchParams.get("source") as "all" | "MANUAL" | "XML_IMPORT" | "INTEGRATOR" | null) ?? undefined,
      status: (searchParams.get("status") as "all" | "DRAFT" | "REVIEWED" | "POSTED" | "CANCELLED" | null) ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
    });

    return noStoreJson(result);
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

export async function POST(request: Request) {
  try {
    const user = await requirePermission("incomingInvoices.manage");
    const payload = await request.json();
    const created = await incomingInvoiceService.createManualIncomingInvoice(payload, user.id);

    await auditLogService.recordFromRequest(request, {
      entityType: "INCOMING_INVOICE",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: `Gelen fatura manuel olarak kaydedildi: ${created.documentNumber}`,
      metadata: {
        incomingInvoiceId: created.id,
        documentNumber: created.documentNumber,
        source: created.source,
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
