import {
  buildDocumentEvidencePackageAuditMetadata,
  buildDocumentEvidencePackageHeaders,
  documentEvidencePackageErrorJson,
  type DocumentEvidencePackage,
} from "@/lib/document-evidence-package-response";
import { sanitizeAttachmentFileName } from "@/lib/attachment-file-name";
import { sanitizeHttpHeaderValue } from "@/lib/http-header-value";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const evidencePackage: DocumentEvidencePackage = {
  generatedAt: "2026-07-25T10:30:00.000Z",
  document: {
    id: "document-1",
    documentNumber: "BEF2026000000001",
    documentType: "E_INVOICE",
    status: "ISSUED",
    externalSystemStatus: "NOT_SENT",
    externalReference: null,
    providerDisplayName: "Mock e-belge",
    orderId: null,
    orderNumber: null,
    inventoryTransactionId: null,
    inventoryTransactionNumber: null,
    totalAmount: 120,
    currency: "TRY",
  },
  dispatches: [],
  xmlArtifacts: [{
    id: "xml-current",
    supersedesArtifactId: null,
    isCurrent: true,
    documentRootType: "INVOICE",
    schemaVersion: "UBL-TR-1.2.1",
    officialSchemaReady: true,
    xsdHash: "xsd-hash",
    officialSchematronReady: true,
    schematronHash: "schematron-hash",
    xmlHash: "xml-hash",
    validationStatus: "VALID",
    validationErrors: [],
    generatedAt: "2026-07-25T10:30:00.000Z",
    validatedAt: "2026-07-25T10:30:00.000Z",
  }],
  lifecycleEvents: [{
    id: "event-1",
    eventType: "OUTBOUND_QUEUED",
    status: "ISSUED",
    externalStatus: "QUEUED",
    providerCode: "mock-edocs-provider",
    integrationJobId: "job-1",
    requestId: "request-1",
    correlationId: "correlation-1",
    summary: "Belge gönderim kuyruğuna alındı",
    metadata: {
      idempotencyKey: "EDOCS_MOCK:DOCUMENT_OUTBOUND:BUSINESS_DOCUMENT:document-1:dispatch-mock-document-1-xml-hash",
      idempotencySuffix: "dispatch-mock-document-1-xml-hash",
      deduplicated: false,
      xmlArtifactId: "xml-current",
      xmlHash: "xml-hash",
    },
    occurredAt: "2026-07-25T10:30:00.000Z",
    messages: [{
      id: "message-1",
      direction: "OUTBOUND",
      providerCode: "mock-edocs-provider",
      messageType: "DOCUMENT_OUTBOUND_REQUEST",
      payloadHash: "payload-hash",
      statusCode: null,
      errorMessage: null,
      occurredAt: "2026-07-25T10:30:00.000Z",
    }],
  }],
  packageHash: "package-hash",
};

const headers = buildDocumentEvidencePackageHeaders(evidencePackage);

assert(headers.get("content-type") === "application/json; charset=utf-8", "Kanıt paketi content-type JSON olmalıdır.");
assert(headers.get("content-disposition") === "attachment; filename=\"document-evidence-BEF2026000000001.json\"", "Kanıt paketi dosya adı belge numarası taşımalıdır.");
assert(headers.get("cache-control") === "no-store", "Kanıt paketi response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "Kanıt paketi response MIME sniffing koruması taşımalıdır.");
assert(headers.get("x-beemmb-evidence-package-hash") === "package-hash", "Kanıt paketi hash header olarak dönmelidir.");
assert(headers.get("x-beemmb-document-number") === "BEF2026000000001", "Kanıt paketi belge numarası header olarak dönmelidir.");

const unsafeFileNameHeaders = buildDocumentEvidencePackageHeaders({
  ...evidencePackage,
  document: {
    ...evidencePackage.document,
    documentNumber: "BEF/2026:000 001",
  },
});
assert(
  unsafeFileNameHeaders.get("content-disposition") === "attachment; filename=\"document-evidence-BEF_2026_000_001.json\"",
  "Kanıt paketi dosya adında belge numarası güvenli karakterlere dönüştürülmelidir.",
);
assert(
  unsafeFileNameHeaders.get("x-beemmb-document-number") === "BEF/2026:000 001",
  "Kanıt paketi belge numarası header içinde ham değerini korumalıdır.",
);
assert(sanitizeAttachmentFileName("", "evidence") === "evidence", "Ortak dosya adı temizleyici özel fallback değerini dönmelidir.");
assert(sanitizeHttpHeaderValue("BEF\r\n2026\t000001") === "BEF 2026 000001", "Ortak HTTP header değeri temizleyici kontrol karakterlerini normalize etmelidir.");
const unsafeHeaderValueHeaders = buildDocumentEvidencePackageHeaders({
  ...evidencePackage,
  document: {
    ...evidencePackage.document,
    documentNumber: "BEF\r\n2026\t000001",
  },
});
assert(
  unsafeHeaderValueHeaders.get("x-beemmb-document-number") === "BEF 2026 000001",
  "Kanıt paketi belge numarası header değeri kontrol karakterlerinden arındırılmalıdır.",
);

const metadata = buildDocumentEvidencePackageAuditMetadata(evidencePackage);
assert(metadata.packageHash === "package-hash", "Audit metadata kanıt paketi hash değerini taşımalıdır.");
assert(metadata.documentNumber === "BEF2026000000001", "Audit metadata belge numarasını taşımalıdır.");
assert(metadata.xmlArtifactCount === 1, "Audit metadata XML artifact sayısını taşımalıdır.");
assert(metadata.lifecycleEventCount === 1, "Audit metadata lifecycle event sayısını taşımalıdır.");
assert(metadata.integrationMessageCount === 1, "Audit metadata entegrasyon mesaj sayısını taşımalıdır.");
assert(metadata.idempotencyEvidenceCount === 1, "Audit metadata idempotency kanıtı taşıyan event sayısını taşımalıdır.");
assert(metadata.currentXmlArtifactId === "xml-current", "Audit metadata güncel XML artifact id değerini taşımalıdır.");
assert(metadata.currentXmlHash === "xml-hash", "Audit metadata güncel XML hash değerini taşımalıdır.");
assert(metadata.currentXsdHash === "xsd-hash", "Audit metadata güncel XSD hash değerini taşımalıdır.");
assert(metadata.currentSchematronHash === "schematron-hash", "Audit metadata güncel Schematron hash değerini taşımalıdır.");

const metadataWithoutXml = buildDocumentEvidencePackageAuditMetadata({
  ...evidencePackage,
  xmlArtifacts: [],
});
assert(metadataWithoutXml.xmlArtifactCount === 0, "XML artifact yoksa audit metadata sayısı 0 olmalıdır.");
assert(metadataWithoutXml.currentXmlArtifactId === null, "XML artifact yoksa güncel artifact id null olmalıdır.");
assert(metadataWithoutXml.currentXmlHash === null, "XML artifact yoksa güncel XML hash null olmalıdır.");
assert(metadataWithoutXml.currentXsdHash === null, "XML artifact yoksa güncel XSD hash null olmalıdır.");
assert(metadataWithoutXml.currentSchematronHash === null, "XML artifact yoksa güncel Schematron hash null olmalıdır.");

const errorResponse = documentEvidencePackageErrorJson({ message: "Belge bulunamadı." }, { status: 404 });
assert(errorResponse.status === 404, "Kanıt paketi error response status değerini korumalıdır.");
assert(errorResponse.headers.get("cache-control") === "no-store", "Kanıt paketi error response cache içinde saklanmamalıdır.");
assert(errorResponse.headers.get("x-content-type-options") === "nosniff", "Kanıt paketi error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge evidence package route doğrulaması geçti.");
