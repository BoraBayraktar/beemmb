import type {
  EDocumentProviderAdapter,
  EDocumentProviderDispatchInput,
} from "@/modules/edocument/contracts/edocument-provider.contract";

export class MockEDocumentProviderAdapter implements EDocumentProviderAdapter {
  providerKey = "mock-edocs-provider";

  async dispatchDocument(input: EDocumentProviderDispatchInput) {
    const issuedAt = new Date().toISOString();
    const providerReference = `MOCK-${input.documentNumber}-${Date.now()}`;

    return {
      accepted: true,
      providerReference,
      providerStatus: "SENT" as const,
      responsePayload: {
        accepted: true,
        providerReference,
        issuedAt,
        transportMode: "OUTBOUND",
        documentType: input.documentType,
        xmlArtifactId: input.xmlArtifactId,
        xmlHash: input.xmlHash,
        schemaVersion: input.schemaVersion,
      },
    };
  }

  async queryDocumentStatus(input: { documentId: string; documentNumber: string; providerReference?: string | null }) {
    const checkedAt = new Date().toISOString();

    return {
      accepted: true,
      providerReference: input.providerReference ?? null,
      providerStatus: "SENT" as const,
      responsePayload: {
        accepted: true,
        documentId: input.documentId,
        documentNumber: input.documentNumber,
        documentStatus: "SENT",
        checkedAt,
      },
    };
  }
}

export const mockEDocumentProviderAdapter = new MockEDocumentProviderAdapter();
