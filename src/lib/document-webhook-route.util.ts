import { ZodError, z } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { documentWebhookPayloadService } from "@/modules/documents/services/document-webhook-payload.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";

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

export { ZodError };
