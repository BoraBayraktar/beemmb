import type { EDocumentLiveProviderScenarioEvidence } from "@/modules/edocument/contracts/edocument-provider.contract";
import { liveProviderTestEvidenceService } from "@/modules/edocument/services/live-provider-test-evidence.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const capturedAt = "2026-07-26T10:30:00.000Z";
const completeEvidence: EDocumentLiveProviderScenarioEvidence[] = [{
  scenarioKey: "OUTBOUND_INVOICE_ACCEPTED",
  capturedAt,
  evidence: {
    providerReference: "INV-REF-1",
    xmlArtifactId: "xml-invoice",
    xmlHash: "xml-hash-invoice",
    xsdHash: "xsd-hash-invoice",
    schematronHash: "schematron-hash",
  },
}, {
  scenarioKey: "OUTBOUND_DESPATCH_ACCEPTED",
  capturedAt,
  evidence: {
    providerReference: "DESP-REF-1",
    xmlArtifactId: "xml-despatch",
    xmlHash: "xml-hash-despatch",
    xsdHash: "xsd-hash-despatch",
    schematronHash: "schematron-hash",
  },
}, {
  scenarioKey: "STATUS_SYNC_SENT",
  capturedAt,
  evidence: {
    providerReference: "INV-REF-1",
    providerStatus: "SENT",
    statusSyncedAt: capturedAt,
  },
}, {
  scenarioKey: "WEBHOOK_STATUS_RECEIVED",
  capturedAt,
  evidence: {
    rawBodyHash: "raw-body-hash",
    signaturePresent: true,
    documentNumber: "BEF2026000000001",
    externalSystemStatus: "SENT",
  },
}, {
  scenarioKey: "PROVIDER_VALIDATION_ERROR",
  capturedAt,
  evidence: {
    providerErrorCode: "GIB_1195",
    providerErrorMessage: "UBL doğrulama hatası",
    validationStatus: "INVALID",
  },
}, {
  scenarioKey: "IDEMPOTENT_RESEND",
  capturedAt,
  evidence: {
    xmlHash: "xml-hash-invoice",
    previousDispatchId: "dispatch-1",
    currentDispatchId: "dispatch-1",
    idempotencyKey: "idempotency-key",
  },
}, {
  scenarioKey: "CANCELLED_DOCUMENT_BLOCKED",
  capturedAt,
  evidence: {
    documentId: "document-cancelled",
    documentNumber: "BEF2026000000002",
    blockedReason: "İptal edilmiş belge gönderim kuyruğuna alınamaz.",
  },
}];

const completeReport = liveProviderTestEvidenceService.evaluate(completeEvidence);
assert(completeReport.ready, "Tüm canlı provider test kanıtları tam ise evidence raporu hazır olmalıdır.");
assert(completeReport.scenarioCount === 7, "Canlı provider evidence raporu tüm zorunlu senaryoları saymalıdır.");
assert(completeReport.readyScenarioCount === 7, "Tüm senaryolar kanıtlı ise hazır senaryo sayısı tam olmalıdır.");
assert(completeReport.missingScenarioKeys.length === 0, "Tüm senaryolar kanıtlı ise eksik senaryo olmamalıdır.");
assert(completeReport.checks.every((check) => check.capturedAt === capturedAt), "Evidence raporu capturedAt değerlerini korumalıdır.");

const missingFieldReport = liveProviderTestEvidenceService.evaluate(completeEvidence.map((item) => (
  item.scenarioKey === "WEBHOOK_STATUS_RECEIVED"
    ? { ...item, evidence: { ...item.evidence, rawBodyHash: "" } }
    : item
)));
const webhookCheck = missingFieldReport.checks.find((check) => check.scenarioKey === "WEBHOOK_STATUS_RECEIVED");
assert(Boolean(webhookCheck), "Webhook evidence check bulunmalıdır.");
assert(!missingFieldReport.ready, "Zorunlu evidence alanı boşsa evidence raporu hazır olmamalıdır.");
assert(webhookCheck!.missingEvidence.includes("rawBodyHash"), "Webhook evidence check eksik rawBodyHash alanını raporlamalıdır.");

const missingScenarioReport = liveProviderTestEvidenceService.evaluate(completeEvidence.filter((item) => item.scenarioKey !== "IDEMPOTENT_RESEND"));
assert(!missingScenarioReport.ready, "Zorunlu senaryo yoksa evidence raporu hazır olmamalıdır.");
assert(missingScenarioReport.missingScenarioKeys.includes("IDEMPOTENT_RESEND"), "Evidence raporu eksik idempotent resend senaryosunu raporlamalıdır.");

console.log("E-belge canlı provider test evidence doğrulaması geçti.");
