import { sanitizeAttachmentFileName } from "@/lib/attachment-file-name";
import { noStoreJson } from "@/lib/no-store-json-response";
import type { AdminBusinessDocumentXmlArtifactItem } from "@/modules/edocument/contracts/edocument.contract";

export function buildXmlArtifactAuditMetadata(item: AdminBusinessDocumentXmlArtifactItem) {
  return {
    artifactId: item.id,
    documentRootType: item.documentRootType,
    schemaVersion: item.schemaVersion,
    xmlHash: item.xmlHash,
    xsdHash: item.xsdHash,
    schematronHash: item.schematronHash,
    validationStatus: item.validationStatus,
  };
}

export function buildXmlArtifactDownloadHeaders(item: AdminBusinessDocumentXmlArtifactItem) {
  const safeArtifactId = sanitizeAttachmentFileName(item.id);

  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Content-Disposition": `attachment; filename="${item.documentRootType.toLowerCase()}-${safeArtifactId}.xml"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-BEEMMB-XML-Hash": item.xmlHash,
    "X-BEEMMB-Schema-Version": item.schemaVersion,
  });
  if (item.xsdHash) {
    headers.set("X-BEEMMB-XSD-Hash", item.xsdHash);
  }
  if (item.schematronHash) {
    headers.set("X-BEEMMB-Schematron-Hash", item.schematronHash);
  }

  return headers;
}

export function xmlArtifactErrorJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}
