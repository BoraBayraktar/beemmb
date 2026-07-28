import { DocumentLifecycleService } from "@/modules/documents/services/document-lifecycle.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

type CapturedLifecycleInput = Parameters<DocumentLifecycleService["recordEvent"]>[0] & {
  payloadHash?: string | null;
};

class FakeDocumentLifecycleRepository {
  captured: CapturedLifecycleInput | null = null;

  async createEvent(input: CapturedLifecycleInput) {
    this.captured = input;
    return {
      id: "event-1",
      integrationMessages: [],
    };
  }
}

const repository = new FakeDocumentLifecycleRepository();
const service = new DocumentLifecycleService(repository as never);

async function main() {
  await service.recordEvent({
    businessDocumentId: "business-document-1",
    eventType: "WEBHOOK_RECEIVED",
    actorType: "INTEGRATION",
    summary: "Webhook kanıt sanitizasyon kontrolü",
    message: {
      direction: "INBOUND",
      messageType: "DOCUMENT_STATUS_WEBHOOK",
      payload: {
        documentNumber: "BEF2026000000001",
        secretKey: "provider-secret",
        nested: {
          signature: "provider-signature",
          safeValue: "SENT",
        },
      },
      headers: {
        authorization: "Bearer provider-token",
        "x-arventa-signature": "provider-signature",
        "x-request-id": "request-1",
      },
    },
  });

  const captured = repository.captured;
  assert(Boolean(captured), "Lifecycle repository çağrısı yakalanmalıdır.");
  assert(Boolean(captured?.payloadHash), "Lifecycle integration message payload hash üretmelidir.");

  const payload = captured?.message?.payload as Record<string, unknown>;
  const nested = payload.nested as Record<string, unknown>;
  const headers = captured?.message?.headers as Record<string, unknown>;

  assert(payload.documentNumber === "BEF2026000000001", "Lifecycle payload güvenli iş alanlarını korumalıdır.");
  assert(payload.secretKey === "MASKED", "Lifecycle payload secret alanlarını maskelemelidir.");
  assert(nested.signature === "MASKED", "Lifecycle payload iç içe signature alanlarını maskelemelidir.");
  assert(nested.safeValue === "SENT", "Lifecycle payload iç içe güvenli alanları korumalıdır.");
  assert(headers.authorization === "MASKED", "Lifecycle headers authorization alanını maskelemelidir.");
  assert(headers["x-arventa-signature"] === "MASKED", "Lifecycle headers signature alanını maskelemelidir.");
  assert(headers["x-request-id"] === "request-1", "Lifecycle headers güvenli korelasyon alanlarını korumalıdır.");

  console.log("E-belge lifecycle sanitizasyon doğrulaması geçti.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
