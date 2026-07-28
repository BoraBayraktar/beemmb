import { DocumentEvidencePackageService } from "@/modules/documents/services/document-evidence-package.service";
import { sha256 } from "@/modules/system/services/audit-integrity.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const now = new Date("2026-07-25T10:30:00.000Z");

const documentRepository = {
  async findBusinessDocumentById(id: string) {
    return {
      id,
      documentNumber: "BEF2026000000001",
      documentType: "E_INVOICE",
      status: "ISSUED",
      externalSystemStatus: "NOT_SENT",
      externalReference: null,
      providerConfig: { displayName: "Mock e-belge" },
      order: null,
      inventoryTransaction: null,
      totalAmount: { toNumber: () => 120 },
      currency: "TRY",
      dispatches: [{
        id: "dispatch-1",
        integrationJobId: "job-1",
        channel: "EDOCS_MOCK",
        providerKey: "mock",
        status: "QUEUED",
        externalReference: null,
        errorMessage: null,
        queuedAt: now,
        dispatchedAt: null,
      }],
      lifecycleEvents: [{
        id: "event-1",
        eventType: "XML_GENERATED",
        status: "ISSUED",
        externalStatus: null,
        providerCode: "mock",
        integrationJobId: null,
        requestId: "request-1",
        correlationId: "correlation-1",
        summary: "XML üretildi",
        metadata: {
          idempotencyKey: "EDOCS_MOCK:DOCUMENT_OUTBOUND:BUSINESS_DOCUMENT:document-1:dispatch-mock-document-1-xml-hash",
          idempotencySuffix: "dispatch-mock-document-1-xml-hash",
          deduplicated: false,
          xmlArtifactId: "xml-current",
          xmlHash: "xml-hash-current",
        },
        occurredAt: now,
        integrationMessages: [{
          id: "message-1",
          direction: "OUTBOUND",
          providerCode: "mock",
          messageType: "DOCUMENT_OUTBOUND",
          payloadHash: "payload-hash",
          statusCode: 200,
          errorMessage: null,
          occurredAt: now,
        }],
      }],
    };
  },
};

const eDocumentRepository = {
  async listXmlArtifacts() {
    return [{
      id: "xml-current",
      supersedesArtifactId: "xml-old",
      documentRootType: "INVOICE",
      schemaVersion: "UBL-TR-1.2.1",
      xsdHash: "xsd-hash-current",
      schematronHash: "schematron-hash-current",
      xmlHash: "xml-hash-current",
      validationStatus: "INVALID",
      validationErrors: ["Resmi XSD eksik"],
      generatedAt: now,
      validatedAt: now,
    }, {
      id: "xml-old",
      supersedesArtifactId: null,
      documentRootType: "INVOICE",
      schemaVersion: "UBL-TR-1.2.1",
      xsdHash: null,
      schematronHash: null,
      xmlHash: "xml-hash-old",
      validationStatus: "INVALID",
      validationErrors: [],
      generatedAt: new Date("2026-07-24T10:30:00.000Z"),
      validatedAt: null,
    }];
  },
};

async function main() {
  const service = new DocumentEvidencePackageService(
    documentRepository as never,
    eDocumentRepository as never,
  );

  const evidencePackage = await service.buildPackage("document-1");
  const packageHash = evidencePackage.packageHash;
  const evidenceWithoutHash: Omit<typeof evidencePackage, "packageHash"> = {
    generatedAt: evidencePackage.generatedAt,
    document: evidencePackage.document,
    dispatches: evidencePackage.dispatches,
    xmlArtifacts: evidencePackage.xmlArtifacts,
    lifecycleEvents: evidencePackage.lifecycleEvents,
  };

  assert(packageHash === sha256(evidenceWithoutHash), "Kanıt paketi hash değeri paket içeriğinden deterministik hesaplanmalıdır.");
  assert(evidencePackage.xmlArtifacts.length === 2, "Kanıt paketi XML artifact listesini içermelidir.");
  assert(evidencePackage.xmlArtifacts[0].isCurrent, "En yeni XML artifact güncel olarak işaretlenmelidir.");
  assert(!evidencePackage.xmlArtifacts[1].isCurrent, "Eski XML artifact güncel olarak işaretlenmemelidir.");
  assert(evidencePackage.xmlArtifacts[0].officialSchemaReady, "Artifact XSD hash taşıyorsa schema durumu hazır olmalıdır.");
  assert(evidencePackage.xmlArtifacts[0].xsdHash === "xsd-hash-current", "Kanıt paketi artifact üzerinde saklanan XSD hash değerini korumalıdır.");
  assert(evidencePackage.xmlArtifacts[0].officialSchematronReady, "Artifact Schematron hash taşıyorsa Schematron durumu hazır olmalıdır.");
  assert(evidencePackage.xmlArtifacts[0].schematronHash === "schematron-hash-current", "Kanıt paketi artifact üzerinde saklanan Schematron hash değerini korumalıdır.");
  assert(!evidencePackage.xmlArtifacts[1].officialSchemaReady, "Eski artifact XSD hash taşımıyorsa schema durumu hazır olmamalıdır.");
  assert(
    evidencePackage.lifecycleEvents[0].metadata?.idempotencyKey === "EDOCS_MOCK:DOCUMENT_OUTBOUND:BUSINESS_DOCUMENT:document-1:dispatch-mock-document-1-xml-hash",
    "Kanıt paketi lifecycle metadata içindeki idempotency key bilgisini korumalıdır.",
  );
  assert(evidencePackage.lifecycleEvents[0].metadata?.xmlHash === "xml-hash-current", "Kanıt paketi lifecycle metadata içindeki XML hash bilgisini korumalıdır.");
  assert(evidencePackage.lifecycleEvents[0].messages[0].payloadHash === "payload-hash", "Kanıt paketi entegrasyon mesaj hash bilgisini korumalıdır.");

  console.log("E-belge evidence package doğrulaması geçti.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
