import { ZodError } from "zod";

import {
  documentWebhookJson,
  parseDocumentWebhookPayload,
} from "@/lib/document-webhook-route.util";
import { documentWebhookService } from "@/modules/documents/services/document-webhook.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ providerCode: string }> }) {
  try {
    const { providerCode } = await context.params;
    const rawBody = await request.text();
    const parsedBody = parseDocumentWebhookPayload(rawBody);
    const signature = request.headers.get("x-arventa-signature");

    // Bu webhook'ta oturum yok (HMAC imza ile korunuyor). Hangi tenant'a ait
    // oldugu URL'den degil, imzanin hangi tenant'in webhookSecret'iyla
    // eslestiginden servis katmaninda cikarilir (bkz. resolveTenantAndProvider).
    const { item, tenantId } = await documentWebhookService.processProviderWebhook({
      providerCode,
      rawBody,
      signature,
      payload: parsedBody,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: item.id,
      action: "STATUS_UPDATE",
      actorType: "INTEGRATION",
      tenantId,
      summary: `Belge webhook durumu işlendi: ${item.documentNumber}`,
      metadata: {
        documentId: item.id,
        orderId: item.orderId,
        providerCode,
        externalSystemStatus: item.externalSystemStatus,
      },
    });

    return documentWebhookJson({ item });
  } catch (error) {
    if (error instanceof DocumentAdminError) {
      return documentWebhookJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentWebhookJson({ message: error.issues[0]?.message ?? "Webhook doğrulama hatası oluştu." }, { status: 400 });
    }

    return documentWebhookJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
