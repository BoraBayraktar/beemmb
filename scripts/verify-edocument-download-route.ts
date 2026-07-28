import {
  buildXmlArtifactAuditMetadata,
  buildXmlArtifactDownloadHeaders,
  xmlArtifactErrorJson,
} from "@/app/api/admin/document-xml-artifacts/[artifactId]/route";
import { sanitizeAttachmentFileName } from "@/lib/attachment-file-name";
import type { AdminBusinessDocumentXmlArtifactItem } from "@/modules/edocument/contracts/edocument.contract";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const item: AdminBusinessDocumentXmlArtifactItem = {
  id: "xml-1",
  businessDocumentId: "document-1",
  supersedesArtifactId: null,
  documentRootType: "INVOICE",
  schemaVersion: "UBL-TR-1.2.1",
  xsdHash: "xsd-hash",
  schematronHash: "schematron-hash",
  xmlHash: "xml-hash",
  validationStatus: "VALID",
  validationErrors: [],
  isCurrent: true,
  generatedAt: "2026-07-25T10:30:00.000Z",
  validatedAt: "2026-07-25T10:30:00.000Z",
  xmlContent: "<Invoice />",
};

const headers = buildXmlArtifactDownloadHeaders(item);
assert(headers.get("content-type") === "application/xml; charset=utf-8", "XML download content-type doğru olmalıdır.");
assert(headers.get("content-disposition") === "attachment; filename=\"invoice-xml-1.xml\"", "XML download dosya adı belge kökü ve artifact id içermelidir.");
assert(headers.get("cache-control") === "no-store", "XML download response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "XML download response MIME sniffing koruması taşımalıdır.");
assert(headers.get("x-beemmb-xml-hash") === "xml-hash", "XML hash response header olarak dönmelidir.");
assert(headers.get("x-beemmb-schema-version") === "UBL-TR-1.2.1", "Schema version response header olarak dönmelidir.");
assert(headers.get("x-beemmb-xsd-hash") === "xsd-hash", "XSD hash response header olarak dönmelidir.");
assert(headers.get("x-beemmb-schematron-hash") === "schematron-hash", "Schematron hash response header olarak dönmelidir.");

const unsafeFileNameHeaders = buildXmlArtifactDownloadHeaders({
  ...item,
  id: "xml/1:rev A",
});
assert(
  unsafeFileNameHeaders.get("content-disposition") === "attachment; filename=\"invoice-xml_1_rev_A.xml\"",
  "XML download dosya adında artifact id güvenli karakterlere dönüştürülmelidir.",
);
assert(sanitizeAttachmentFileName("***") === "___", "Ortak dosya adı temizleyici güvenli olmayan karakterleri dönüştürmelidir.");
assert(sanitizeAttachmentFileName("") === "document", "Ortak dosya adı temizleyici boş değer için fallback dönmelidir.");

const metadata = buildXmlArtifactAuditMetadata(item);
assert(metadata.artifactId === "xml-1", "Audit metadata artifact id taşımalıdır.");
assert(metadata.xmlHash === "xml-hash", "Audit metadata XML hash taşımalıdır.");
assert(metadata.xsdHash === "xsd-hash", "Audit metadata XSD hash taşımalıdır.");
assert(metadata.schematronHash === "schematron-hash", "Audit metadata Schematron hash taşımalıdır.");
assert(metadata.validationStatus === "VALID", "Audit metadata validation status taşımalıdır.");

const headersWithoutSchemaHashes = buildXmlArtifactDownloadHeaders({
  ...item,
  xsdHash: null,
  schematronHash: null,
});
assert(!headersWithoutSchemaHashes.has("x-beemmb-xsd-hash"), "XSD hash yoksa header eklenmemelidir.");
assert(!headersWithoutSchemaHashes.has("x-beemmb-schematron-hash"), "Schematron hash yoksa header eklenmemelidir.");

const errorResponse = xmlArtifactErrorJson({ message: "Belge bulunamadı." }, { status: 404 });
assert(errorResponse.status === 404, "XML download error response status değerini korumalıdır.");
assert(errorResponse.headers.get("cache-control") === "no-store", "XML download error response cache içinde saklanmamalıdır.");
assert(errorResponse.headers.get("x-content-type-options") === "nosniff", "XML download error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge download route doğrulaması geçti.");
