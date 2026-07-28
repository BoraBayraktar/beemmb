import { EDocumentProviderRegistryError } from "@/modules/edocument/services/edocument-provider-registry.service";
import { EDocsMockConnector } from "@/modules/integration/connectors/edocs-mock.connector";
import type { ConnectorSyncJob } from "@/modules/integration/connectors/channel.connector";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildJob(payload: ConnectorSyncJob["payload"], jobType: ConnectorSyncJob["jobType"] = "DOCUMENT_OUTBOUND"): ConnectorSyncJob {
  return {
    id: "job-1",
    channel: "EDOCS_MOCK",
    jobType,
    entityType: "BUSINESS_DOCUMENT",
    entityId: "document-1",
    payload,
  };
}

async function expectRejects(action: () => Promise<unknown>, predicate: (error: unknown) => boolean, message: string) {
  try {
    await action();
  } catch (error) {
    assert(predicate(error), message);
    return;
  }

  throw new Error(message);
}

async function main() {
  const connector = new EDocsMockConnector();

  await expectRejects(
    () => connector.dispatch(buildJob({ documentNumber: "BEF2026000000001" })),
    (error) => error instanceof Error && error.message === "EDOCS_MOCK_XML_ARTIFACT_REQUIRED",
    "Connector XML artifact bilgisi olmadan outbound gönderimi reddetmelidir.",
  );

  const dispatchResult = await connector.dispatch(buildJob({
    documentNumber: "BEF2026000000001",
    documentType: "E_INVOICE",
    xmlArtifactId: "xml-1",
    xmlHash: "xml-hash",
    xmlSchemaVersion: "UBL-TR-1.2.1",
  }));
  assert(dispatchResult.providerKey === "mock-edocs-provider", "Provider code boşken connector mock adapter fallback kullanmalıdır.");
  assert(dispatchResult.responsePayload?.xmlHash === "xml-hash", "Connector XML hash değerini provider payload içinde korumalıdır.");

  await expectRejects(
    () => connector.dispatch(buildJob({
      providerCode: "missing-provider",
      documentNumber: "BEF2026000000001",
      documentType: "E_INVOICE",
      xmlArtifactId: "xml-1",
      xmlHash: "xml-hash",
      xmlSchemaVersion: "UBL-TR-1.2.1",
    })),
    (error) => error instanceof EDocumentProviderRegistryError,
    "Provider code verilmişse bilinmeyen adapter sessizce mock fallback kullanmamalıdır.",
  );

  await expectRejects(
    () => connector.dispatch(buildJob({
      providerCode: "missing-provider",
      documentNumber: "BEF2026000000001",
    }, "DOCUMENT_STATUS_SYNC")),
    (error) => error instanceof EDocumentProviderRegistryError,
    "Status sync için bilinmeyen provider adapter sessizce mock fallback kullanmamalıdır.",
  );

  console.log("E-belge connector doğrulaması geçti.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
