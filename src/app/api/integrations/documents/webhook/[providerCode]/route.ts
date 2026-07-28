import { ZodError, z } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { documentWebhookPayloadService } from "@/modules/documents/services/document-webhook-payload.service";
import { documentWebhookService } from "@/modules/documents/services/document-webhook.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const webhookSchema = z.object({
  documentNumber: z.string().trim().min(1).optional().nullable(),
  externalReference: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional().nullable(),
  providerCode: z.string().trim().min(1).optional().nullable(),
  providerStatus: z.string().trim().min(1).optional().nullable(),
  providerOutcome: z.enum(["ACCEPTED", "REJECTED", "CANCELLED", "RETURNED", "UNKNOWN"]).optional().nullable(),
  providerErrorCode: z.string().trim().min(1).optional().nullable(),
  providerErrorMessage: z.string().trim().min(1).optional().nullable(),
  providerPayload: z.record(z.string(), z.unknown()).optional().nullable(),
});

export function parseDocumentWebhookPayload(rawBody: string) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    throw new DocumentAdminError("Webhook JSON gövdesi geçerli değil.", 400);
  }

  return webhookSchema.parse(documentWebhookPayloadService.normalize(decoded));
}

export function buildDocumentWebhookHeaders() {
  return buildNoStoreHeaders();
}

export function documentWebhookJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export async function POST(request: Request, context: { params: Promise<{ providerCode: string }> }) {
  try {
    const { providerCode } = await context.params;
    const rawBody = await request.text();
    const parsedBody = parseDocumentWebhookPayload(rawBody);
    const signature = request.headers.get("x-arventa-signature");

    const item = await documentWebhookService.processProviderWebhook({
      providerCode,
      rawBody,
      signature,
      payload: parsedBody,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: item.id,
      action: "STATUS_UPDATE",
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
