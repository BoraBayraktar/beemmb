import { createHash } from "node:crypto";

import { resolveExternalSystemStatusFromProviderStatus, resolveProviderOutcome } from "@/modules/documents/services/document-provider-outcome.service";
import { documentWebhookPayloadService, normalizeDocumentWebhookStatus } from "@/modules/documents/services/document-webhook-payload.service";
import { buildWebhookEvidencePayload } from "@/modules/documents/services/document-webhook.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const rawBody = JSON.stringify({
  documentNumber: "BEF2026000000001",
  status: "SENT",
  secretLikeValue: "provider-private-payload",
});
const payload = buildWebhookEvidencePayload({
  rawBody,
  signature: "signature-secret",
  parsed: {
    documentNumber: "BEF2026000000001",
    status: "SENT",
  },
});

assert(payload.rawBodyHash === createHash("sha256").update(rawBody).digest("hex"), "Webhook evidence payload ham body hash değerini taşımalıdır.");
assert(payload.signaturePresent, "Webhook evidence payload imza varlığını taşımalıdır.");
assert(payload.parsed.documentNumber === "BEF2026000000001", "Webhook evidence payload parse edilmiş iş alanlarını taşımalıdır.");
assert(!("rawBody" in payload), "Webhook evidence payload ham body değerini taşımamalıdır.");
assert(!("signature" in payload), "Webhook evidence payload imza değerini taşımamalıdır.");

assert(normalizeDocumentWebhookStatus("ACCEPTED") === "SENT", "Provider ACCEPTED durumu SENT değerine normalize edilmelidir.");
assert(normalizeDocumentWebhookStatus("PROCESSING") === "QUEUED", "Provider PROCESSING durumu QUEUED değerine normalize edilmelidir.");
assert(normalizeDocumentWebhookStatus("REJECTED") === "FAILED", "Provider REJECTED durumu FAILED değerine normalize edilmelidir.");
assert(normalizeDocumentWebhookStatus("CANCELLED") === "FAILED", "Provider CANCELLED durumu FAILED değerine normalize edilmelidir.");
assert(normalizeDocumentWebhookStatus("RETURNED") === "FAILED", "Provider RETURNED durumu FAILED değerine normalize edilmelidir.");
assert(normalizeDocumentWebhookStatus("unknown-provider-state") === "FAILED", "Bilinmeyen provider durumu güvenli şekilde FAILED değerine düşmelidir.");
assert(resolveProviderOutcome("REJECTED") === "REJECTED", "Provider REJECTED durumu REJECTED outcome üretmelidir.");
assert(resolveProviderOutcome("CANCELLED") === "CANCELLED", "Provider CANCELLED durumu CANCELLED outcome üretmelidir.");
assert(resolveProviderOutcome("RETURNED") === "RETURNED", "Provider RETURNED durumu RETURNED outcome üretmelidir.");
assert(resolveProviderOutcome("unexpected-state") === "UNKNOWN", "Bilinmeyen provider durumu UNKNOWN outcome üretmelidir.");
assert(resolveExternalSystemStatusFromProviderStatus(null) === null, "Boş provider status external sync status üretmemelidir.");

const normalizedProviderPayload = documentWebhookPayloadService.normalize({
  document: {
    number: "BEF2026000000001",
  },
  providerReference: "LIVE-REF-1",
  status: "REJECTED",
  error: {
    code: "GIB_1195",
    message: "UBL doğrulama hatası",
  },
  token: "provider-token",
  nested: {
    signature: "provider-signature",
    safe: "ok",
  },
});
assert(normalizedProviderPayload.documentNumber === "BEF2026000000001", "Provider webhook parser nested belge numarasını okumalıdır.");
assert(normalizedProviderPayload.externalReference === "LIVE-REF-1", "Provider webhook parser provider referansını okumalıdır.");
assert(normalizedProviderPayload.status === "FAILED", "Provider webhook parser provider durumunu ortak statüye çevirmelidir.");
assert(normalizedProviderPayload.providerErrorCode === "GIB_1195", "Provider webhook parser hata kodunu normalize etmelidir.");
assert(normalizedProviderPayload.providerErrorMessage === "UBL doğrulama hatası", "Provider webhook parser hata mesajını normalize etmelidir.");
assert(normalizedProviderPayload.providerOutcome === "REJECTED", "Provider webhook parser ret outcome değerini korumalıdır.");
assert(normalizedProviderPayload.providerPayload?.token === "MASKED", "Provider webhook parser token değerini maskelemelidir.");
assert((normalizedProviderPayload.providerPayload?.nested as Record<string, unknown>).signature === "MASKED", "Provider webhook parser nested signature değerini maskelemelidir.");
assert((normalizedProviderPayload.providerPayload?.nested as Record<string, unknown>).safe === "ok", "Provider webhook parser güvenli alanları korumalıdır.");

const returnedPayload = documentWebhookPayloadService.normalize({
  documentNumber: "BEF2026000000002",
  providerReference: "LIVE-REF-RETURN",
  status: "RETURNED",
});
assert(returnedPayload.status === "FAILED", "Provider iade webhook durumu dış sync status için FAILED değerine düşmelidir.");
assert(returnedPayload.providerOutcome === "RETURNED", "Provider iade webhook durumu RETURNED outcome üretmelidir.");

console.log("E-belge webhook service doğrulaması geçti.");
