import { buildDocumentProviderConfigAuditMetadata } from "@/lib/document-provider-config-audit";
import {
  buildDocumentProviderConfigHeaders,
  documentProviderConfigJson,
} from "@/lib/edocument-admin-route-response";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildDocumentProviderConfigHeaders();

assert(headers.get("cache-control") === "no-store", "Belge sağlayıcı config API response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "Belge sağlayıcı config API response MIME sniffing koruması taşımalıdır.");

const errorResponse = documentProviderConfigJson({ message: "Doğrulama hatası oluştu." }, { status: 400 });
assert(errorResponse.status === 400, "Belge sağlayıcı config error response status değerini korumalıdır.");
assert(errorResponse.headers.get("cache-control") === "no-store", "Belge sağlayıcı config error response cache içinde saklanmamalıdır.");

const metadata = buildDocumentProviderConfigAuditMetadata({
  id: "provider-1",
  providerCode: "live-edocs-provider",
  channel: "EDOCS_MOCK",
  displayName: "Canlı e-belge",
  endpointUrl: "https://entegrator.example.com/edocument",
  senderLabel: "BEEMMB",
  senderVkn: "1234567890",
  username: "api-user",
  secretKeyMasked: "********cret",
  companyName: "BEEMMB",
  webhookSecretMasked: "********hook",
  supportsStatusSync: true,
  isActive: true,
  isDefault: true,
  adapterRegistered: true,
  adapterConfigured: true,
  adapterOperational: false,
  note: null,
  createdAt: "2026-07-26T10:30:00.000Z",
  updatedAt: "2026-07-26T10:30:00.000Z",
});

assert(metadata.providerCode === "live-edocs-provider", "Audit metadata provider code değerini taşımalıdır.");
assert(metadata.adapterRegistered, "Audit metadata adapter kayıt durumunu taşımalıdır.");
assert(metadata.adapterConfigured, "Audit metadata adapter konfigürasyon durumunu taşımalıdır.");
assert(!metadata.adapterOperational, "Audit metadata adapter operasyonel durumunu taşımalıdır.");
assert(metadata.hasSecretKey, "Audit metadata secret değerini değil secret varlığını taşımalıdır.");
assert(metadata.hasWebhookSecret, "Audit metadata webhook secret değerini değil secret varlığını taşımalıdır.");
assert(!("secretKeyMasked" in metadata), "Audit metadata masked secret değerini taşımamalıdır.");
assert(!("webhookSecretMasked" in metadata), "Audit metadata masked webhook secret değerini taşımamalıdır.");

console.log("E-belge provider config route doğrulaması geçti.");
