import type { ChannelConnector, ConnectorDispatchResult, ConnectorSyncJob } from "@/modules/integration/connectors/channel.connector";
import { eDocumentProviderRegistryService } from "@/modules/edocument/services/edocument-provider-registry.service";
import { EDocumentError, eDocumentService } from "@/modules/edocument/services/edocument.service";

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export class EDocsMockConnector implements ChannelConnector {
  channel = "EDOCS_MOCK" as const;

  async dispatch(job: ConnectorSyncJob): Promise<ConnectorDispatchResult> {
    if (job.payload?.forceFail) {
      throw new Error("EDOCS_MOCK_FORCED_FAILURE");
    }

    if (job.jobType === "DOCUMENT_STATUS_SYNC") {
      const documentNumber = readString(job.payload?.documentNumber) ?? job.entityId;
      const providerCode = readString(job.payload?.providerCode);
      const adapter = providerCode
        ? eDocumentProviderRegistryService.resolveRequired(providerCode)
        : eDocumentProviderRegistryService.resolve(null);
      const result = await adapter.queryDocumentStatus({
        documentId: job.entityId,
        documentNumber,
        providerReference: readString(job.payload?.externalReference),
      });

      return {
        providerKey: providerCode ?? adapter.providerKey,
        externalReference: result.providerReference,
        responsePayload: result.responsePayload,
      };
    }

    const documentNumber = readString(job.payload?.documentNumber) ?? job.entityId;
    const documentType = readString(job.payload?.documentType);
    const xmlArtifactId = readString(job.payload?.xmlArtifactId);
    const xmlHash = readString(job.payload?.xmlHash);
    const schemaVersion = readString(job.payload?.xmlSchemaVersion);

    if (job.jobType === "DOCUMENT_OUTBOUND" && (!xmlArtifactId || !xmlHash || !schemaVersion)) {
      throw new Error("EDOCS_MOCK_XML_ARTIFACT_REQUIRED");
    }

    const providerCode = readString(job.payload?.providerCode);
    const adapter = providerCode
      ? eDocumentProviderRegistryService.resolveRequired(providerCode)
      : eDocumentProviderRegistryService.resolve(null);
    let xmlContent = "";
    if (adapter.providerKey !== "mock-edocs-provider") {
      const xmlArtifact = await eDocumentService.getXmlArtifact(xmlArtifactId ?? "");
      if (xmlArtifact.xmlHash !== xmlHash) {
        throw new EDocumentError("EDOCS_XML_ARTIFACT_HASH_MISMATCH", 400);
      }

      xmlContent = xmlArtifact.xmlContent ?? "";
    }

    const result = await adapter.dispatchDocument({
      documentId: job.entityId,
      documentNumber,
      documentType: documentType === "E_DISPATCH" ? "DESPATCH_ADVICE" : "INVOICE",
      providerCode: providerCode ?? adapter.providerKey,
      xmlArtifactId: xmlArtifactId ?? "",
      xmlHash: xmlHash ?? "",
      xmlContent,
      schemaVersion: schemaVersion ?? "",
    });
    if (!result.accepted || result.providerStatus === "FAILED") {
      const responsePayload = result.responsePayload as Record<string, unknown>;
      throw new Error(readString(responsePayload.providerErrorMessage) ?? "EDOCS_PROVIDER_REJECTED");
    }

    return {
      providerKey: providerCode ?? adapter.providerKey,
      externalReference: result.providerReference,
      responsePayload: result.responsePayload,
    };
  }
}
