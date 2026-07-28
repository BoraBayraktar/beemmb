import type { EDocumentLiveProviderContractSection } from "@/modules/edocument/contracts/edocument-provider.contract";

const sections: EDocumentLiveProviderContractSection[] = [{
  key: "PROVIDER_IDENTITY",
  label: "Özel entegratör kimliği ve ortamları",
  requiredInputs: ["providerCode", "providerDisplayName", "testEndpointUrl", "productionEndpointUrl", "adapterVersion"],
  implementationNotes: [
    "Provider code değeri registry adapter key ile birebir eşleşmelidir.",
    "Test ve production endpoint değerleri geçerli http/https URL olarak doğrulanmalıdır.",
  ],
  evidenceFields: ["providerCode", "adapterVersion", "environmentName", "endpointUrl"],
}, {
  key: "AUTHENTICATION",
  label: "Kimlik doğrulama ve yetkilendirme",
  requiredInputs: ["authType", "credentialLocation", "tokenRefreshPolicy", "secretRotationOwner"],
  implementationNotes: [
    "Secret, token, authorization ve imza değerleri audit/evidence payload içine ham yazılmamalıdır.",
    "Auth header veya SOAP security bilgisi request evidence içinde yalnızca var/yok veya hash olarak temsil edilmelidir.",
  ],
  evidenceFields: ["authType", "credentialConfigured", "secretRotatedAt"],
}, {
  key: "OUTBOUND_INVOICE",
  label: "E-fatura gönderim sözleşmesi",
  requiredInputs: ["invoiceEndpoint", "httpMethodOrSoapAction", "requestXmlField", "successResponseFields", "providerReferenceField"],
  implementationNotes: [
    "Gönderim payload değeri güncel ve geçerli XML artifact üzerinden üretilmelidir.",
    "Response mapping providerReference, providerStatus ve responsePayload alanlarını üretmelidir.",
  ],
  evidenceFields: ["documentNumber", "xmlArtifactId", "xmlHash", "xsdHash", "schematronHash", "providerReference"],
}, {
  key: "OUTBOUND_DESPATCH",
  label: "E-irsaliye gönderim sözleşmesi",
  requiredInputs: ["despatchEndpoint", "httpMethodOrSoapAction", "requestXmlField", "successResponseFields", "providerReferenceField"],
  implementationNotes: [
    "DespatchAdvice XML gönderimi e-fatura gönderiminden ayrı endpoint veya action gerektiriyorsa adapter içinde açık ayrılmalıdır.",
    "Provider response değeri ortak dispatch result sözleşmesine normalize edilmelidir.",
  ],
  evidenceFields: ["documentNumber", "xmlArtifactId", "xmlHash", "xsdHash", "schematronHash", "providerReference"],
}, {
  key: "STATUS_QUERY",
  label: "Durum sorgu sözleşmesi",
  requiredInputs: ["statusEndpoint", "providerReferenceInput", "statusResponseField", "statusValueMap"],
  implementationNotes: [
    "Provider status değerleri QUEUED, SENT veya FAILED ortak değerlerine normalize edilmelidir.",
    "Bilinmeyen provider status değeri güvenli şekilde FAILED olarak ele alınmalı ve raw response maskelenmelidir.",
  ],
  evidenceFields: ["providerReference", "providerStatus", "statusSyncedAt"],
}, {
  key: "WEBHOOK",
  label: "Webhook payload ve imza sözleşmesi",
  requiredInputs: ["webhookUrl", "signatureHeader", "signatureAlgorithm", "documentNumberField", "statusField", "providerReferenceField"],
  implementationNotes: [
    "Webhook ham body saklanmamalı; rawBodyHash ve signaturePresent kanıtı tutulmalıdır.",
    "İmza doğrulama başarısızsa domain işlem yapılmadan 401 dönülmelidir.",
  ],
  evidenceFields: ["rawBodyHash", "signaturePresent", "documentNumber", "externalSystemStatus"],
}, {
  key: "ERROR_MAPPING",
  label: "Provider hata kodları ve doğrulama hataları",
  requiredInputs: ["errorCodeField", "errorMessageField", "validationErrorFields", "retryableErrorCodes"],
  implementationNotes: [
    "Provider hata payload içinde secret benzeri alanlar recursive maskelenmelidir.",
    "GİB veya provider doğrulama hataları kullanıcıya ve audit akışına kontrollü hata kodu ile taşınmalıdır.",
  ],
  evidenceFields: ["providerErrorCode", "providerErrorMessage", "statusCode", "validationStatus"],
}, {
  key: "RETRY_TIMEOUT",
  label: "Timeout, retry ve idempotency politikası",
  requiredInputs: ["requestTimeoutMs", "maxAttempts", "retryBackoffPolicy", "idempotencyFieldOrHeader"],
  implementationNotes: [
    "Aynı XML hash için tekrar gönderim aynı idempotency anahtarını kullanmalıdır.",
    "Revize XML hash yeni idempotency anahtarı üretmelidir.",
  ],
  evidenceFields: ["idempotencyKey", "xmlHash", "attemptCount", "retryDecision"],
}, {
  key: "SECURITY_EVIDENCE",
  label: "Audit ve evidence güvenlik sınırları",
  requiredInputs: ["maskedFields", "evidenceRetentionPolicy", "auditExportOwner"],
  implementationNotes: [
    "Evidence package XML içeriğini değil xmlHash değerini taşır.",
    "Secret, token, authorization, signature, password ve api key alanları audit/evidence içinde ham bulunmamalıdır.",
  ],
  evidenceFields: ["packageHash", "payloadHash", "xmlHash", "xsdHash", "schematronHash"],
}];

export class LiveProviderContractService {
  listSections() {
    return sections;
  }
}

export const liveProviderContractService = new LiveProviderContractService();
