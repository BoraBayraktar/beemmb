import { sanitizeAttachmentFileName } from "@/lib/attachment-file-name";
import { sanitizeHttpHeaderValue } from "@/lib/http-header-value";
import { noStoreJson } from "@/lib/no-store-json-response";
import { documentEvidencePackageService } from "@/modules/documents/services/document-evidence-package.service";

export type DocumentEvidencePackage = Awaited<ReturnType<typeof documentEvidencePackageService.buildPackage>>;

export function buildDocumentEvidencePackageHeaders(evidencePackage: DocumentEvidencePackage) {
  const safeDocumentNumber = sanitizeAttachmentFileName(evidencePackage.document.documentNumber);
  const safeDocumentNumberHeader = sanitizeHttpHeaderValue(evidencePackage.document.documentNumber);

  return new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="document-evidence-${safeDocumentNumber}.json"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-BEEMMB-Evidence-Package-Hash": evidencePackage.packageHash,
    "X-BEEMMB-Document-Number": safeDocumentNumberHeader,
  });
}

export function documentEvidencePackageErrorJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildDocumentEvidencePackageAuditMetadata(evidencePackage: DocumentEvidencePackage) {
  const currentXmlArtifact = evidencePackage.xmlArtifacts.find((item) => item.isCurrent) ?? null;
  const lifecycleEvents = evidencePackage.lifecycleEvents as Array<{ messages: unknown[]; metadata: unknown }>;
  const integrationMessageCount = lifecycleEvents.reduce((total, event) => total + event.messages.length, 0);
  const idempotencyEvidenceCount = lifecycleEvents.filter((event) => {
    const metadata = event.metadata;
    return Boolean(metadata && typeof metadata === "object" && "idempotencyKey" in metadata);
  }).length;

  return {
    packageHash: evidencePackage.packageHash,
    documentNumber: evidencePackage.document.documentNumber,
    xmlArtifactCount: evidencePackage.xmlArtifacts.length,
    lifecycleEventCount: evidencePackage.lifecycleEvents.length,
    integrationMessageCount,
    idempotencyEvidenceCount,
    currentXmlArtifactId: currentXmlArtifact?.id ?? null,
    currentXmlHash: currentXmlArtifact?.xmlHash ?? null,
    currentXsdHash: currentXmlArtifact?.xsdHash ?? null,
    currentSchematronHash: currentXmlArtifact?.schematronHash ?? null,
  };
}
