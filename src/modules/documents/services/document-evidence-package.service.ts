import { DocumentRepository } from "@/modules/documents/repositories/document.repository";
import { EDocumentRepository } from "@/modules/edocument/repositories/edocument.repository";
import { sha256 } from "@/modules/system/services/audit-integrity.service";

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

export class DocumentEvidencePackageService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly eDocumentRepository: EDocumentRepository,
  ) {}

  async buildPackage(documentId: string) {
    const [item, xmlArtifacts] = await Promise.all([
      this.repository.findBusinessDocumentById(documentId),
      this.eDocumentRepository.listXmlArtifacts(documentId),
    ]);
    if (!item) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }
    const currentXmlArtifactId = xmlArtifacts[0]?.id ?? null;

    const evidence = {
      generatedAt: new Date().toISOString(),
      document: {
        id: item.id,
        documentNumber: item.documentNumber,
        documentType: item.documentType,
        status: item.status,
        externalSystemStatus: item.externalSystemStatus,
        externalReference: item.externalReference,
        providerDisplayName: item.providerConfig?.displayName ?? null,
        orderId: item.order?.id ?? null,
        orderNumber: item.order?.orderNumber ?? null,
        inventoryTransactionId: item.inventoryTransaction?.id ?? null,
        inventoryTransactionNumber: item.inventoryTransaction?.transactionNumber ?? null,
        totalAmount: toNumber(item.totalAmount),
        currency: item.currency,
      },
      dispatches: item.dispatches.map((dispatch: {
        id: string;
        integrationJobId: string | null;
        channel: string;
        providerKey: string;
        status: string;
        externalReference: string | null;
        errorMessage: string | null;
        queuedAt: Date;
        dispatchedAt: Date | null;
      }) => ({
        id: dispatch.id,
        integrationJobId: dispatch.integrationJobId,
        channel: dispatch.channel,
        providerKey: dispatch.providerKey,
        status: dispatch.status,
        externalReference: dispatch.externalReference,
        errorMessage: dispatch.errorMessage,
        queuedAt: dispatch.queuedAt.toISOString(),
        dispatchedAt: dispatch.dispatchedAt?.toISOString() ?? null,
      })),
      xmlArtifacts: xmlArtifacts.map((artifact) => {
        return {
          id: artifact.id,
          supersedesArtifactId: artifact.supersedesArtifactId,
          isCurrent: artifact.id === currentXmlArtifactId,
          documentRootType: artifact.documentRootType,
          schemaVersion: artifact.schemaVersion,
          officialSchemaReady: artifact.xsdHash !== null,
          xsdHash: artifact.xsdHash,
          officialSchematronReady: artifact.schematronHash !== null,
          schematronHash: artifact.schematronHash,
          xmlHash: artifact.xmlHash,
          validationStatus: artifact.validationStatus,
          validationErrors: Array.isArray(artifact.validationErrors)
            ? artifact.validationErrors.filter((error): error is string => typeof error === "string")
            : [],
          generatedAt: artifact.generatedAt.toISOString(),
          validatedAt: artifact.validatedAt?.toISOString() ?? null,
        };
      }),
      lifecycleEvents: (item.lifecycleEvents ?? []).map((event: {
        id: string;
        eventType: string;
        status: string | null;
        externalStatus: string | null;
        providerCode: string | null;
        integrationJobId: string | null;
        requestId: string | null;
        correlationId: string | null;
        summary: string;
        metadata: unknown;
        occurredAt: Date;
        integrationMessages: Array<{
          id: string;
          direction: string;
          providerCode: string | null;
          messageType: string;
          payloadHash: string;
          statusCode: number | null;
          errorMessage: string | null;
          occurredAt: Date;
        }>;
      }) => ({
        id: event.id,
        eventType: event.eventType,
        status: event.status,
        externalStatus: event.externalStatus,
        providerCode: event.providerCode,
        integrationJobId: event.integrationJobId,
        requestId: event.requestId,
        correlationId: event.correlationId,
        summary: event.summary,
        metadata: (event.metadata as Record<string, unknown> | null) ?? null,
        occurredAt: event.occurredAt.toISOString(),
        messages: event.integrationMessages.map((message) => ({
          id: message.id,
          direction: message.direction,
          providerCode: message.providerCode,
          messageType: message.messageType,
          payloadHash: message.payloadHash,
          statusCode: message.statusCode,
          errorMessage: message.errorMessage,
          occurredAt: message.occurredAt.toISOString(),
        })),
      })),
    };

    return {
      ...evidence,
      packageHash: sha256(evidence),
    };
  }
}

export const documentEvidencePackageService = new DocumentEvidencePackageService(
  new DocumentRepository(),
  new EDocumentRepository(),
);
