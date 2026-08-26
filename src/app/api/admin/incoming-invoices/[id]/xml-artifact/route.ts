import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { IncomingInvoiceAdminError, incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("incomingInvoices.read", async () => {
      const { id } = await context.params;
      const item = await incomingInvoiceService.getXmlArtifactContent(id);
      return noStoreJson({ item });
    });
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
