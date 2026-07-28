import {
  buildDocumentWebhookHeaders,
  documentWebhookJson,
  parseDocumentWebhookPayload,
} from "@/app/api/integrations/documents/webhook/[providerCode]/route";
import { DocumentAdminError } from "@/modules/documents/services/document.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildDocumentWebhookHeaders();
assert(headers.get("cache-control") === "no-store", "Belge webhook API response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "Belge webhook API response MIME sniffing koruması taşımalıdır.");

const successResponse = documentWebhookJson({ item: { id: "document-1" } });
assert(successResponse.headers.get("cache-control") === "no-store", "Belge webhook success response cache içinde saklanmamalıdır.");

const errorResponse = documentWebhookJson({ message: "Webhook imzası doğrulanamadı." }, { status: 401 });
assert(errorResponse.status === 401, "Belge webhook error response status değerini korumalıdır.");
assert(errorResponse.headers.get("x-content-type-options") === "nosniff", "Belge webhook error response MIME sniffing koruması taşımalıdır.");

const parsedPayload = parseDocumentWebhookPayload(JSON.stringify({ documentNumber: "BEF2026000000001", status: "SENT" }));
assert(parsedPayload.documentNumber === "BEF2026000000001", "Belge webhook route geçerli JSON payload değerini parse etmelidir.");

const providerSpecificPayload = parseDocumentWebhookPayload(JSON.stringify({
  document: { number: "BEI2026000000001" },
  providerReference: "LIVE-REF-2",
  state: "DELIVERED",
  authorization: "Bearer provider-token",
}));
assert(providerSpecificPayload.documentNumber === "BEI2026000000001", "Belge webhook route provider-specific nested belge numarasını normalize etmelidir.");
assert(providerSpecificPayload.externalReference === "LIVE-REF-2", "Belge webhook route provider referansını normalize etmelidir.");
assert(providerSpecificPayload.status === "SENT", "Belge webhook route provider durumunu ortak statüye normalize etmelidir.");
assert(providerSpecificPayload.providerOutcome === "ACCEPTED", "Belge webhook route başarılı provider durumunu ACCEPTED outcome değerine normalize etmelidir.");
assert(providerSpecificPayload.providerPayload?.authorization === "MASKED", "Belge webhook route provider payload secret alanlarını maskelemelidir.");

const cancelledPayload = parseDocumentWebhookPayload(JSON.stringify({
  documentNumber: "BEF2026000000002",
  providerReference: "LIVE-REF-CANCEL",
  status: "CANCELLED",
}));
assert(cancelledPayload.status === "FAILED", "Belge webhook route provider iptal durumunu dış sync status için FAILED değerine düşürmelidir.");
assert(cancelledPayload.providerOutcome === "CANCELLED", "Belge webhook route provider iptal durumunu CANCELLED outcome olarak taşımalıdır.");

try {
  parseDocumentWebhookPayload("{");
  throw new Error("Geçersiz JSON webhook payload kabul edilmemelidir.");
} catch (error) {
  if (!(error instanceof DocumentAdminError)) {
    throw new Error("Geçersiz JSON webhook payload domain hatası üretmelidir.");
  }

  assert(error.status === 400, "Geçersiz JSON webhook payload 400 statüsü üretmelidir.");
}

console.log("E-belge webhook route doğrulaması geçti.");
