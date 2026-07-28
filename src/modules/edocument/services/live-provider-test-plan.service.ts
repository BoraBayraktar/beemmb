import type { EDocumentLiveProviderTestScenario } from "@/modules/edocument/contracts/edocument-provider.contract";

const scenarios: EDocumentLiveProviderTestScenario[] = [{
  key: "OUTBOUND_INVOICE_ACCEPTED",
  label: "Test ortamında e-fatura gönderimi kabul edildi",
  requiredEvidence: ["providerReference", "xmlArtifactId", "xmlHash", "xsdHash", "schematronHash"],
}, {
  key: "OUTBOUND_DESPATCH_ACCEPTED",
  label: "Test ortamında e-irsaliye gönderimi kabul edildi",
  requiredEvidence: ["providerReference", "xmlArtifactId", "xmlHash", "xsdHash", "schematronHash"],
}, {
  key: "STATUS_SYNC_SENT",
  label: "Canlı provider durum sorgusu SENT sonucunu döndürdü",
  requiredEvidence: ["providerReference", "providerStatus", "statusSyncedAt"],
}, {
  key: "WEBHOOK_STATUS_RECEIVED",
  label: "Provider webhook durum bildirimi işlendi",
  requiredEvidence: ["rawBodyHash", "signaturePresent", "documentNumber", "externalSystemStatus"],
}, {
  key: "PROVIDER_VALIDATION_ERROR",
  label: "Provider doğrulama hatası kullanıcı/audit akışına taşındı",
  requiredEvidence: ["providerErrorCode", "providerErrorMessage", "validationStatus"],
}, {
  key: "IDEMPOTENT_RESEND",
  label: "Aynı XML hash için tekrar gönderim idempotent işlendi",
  requiredEvidence: ["xmlHash", "previousDispatchId", "currentDispatchId", "idempotencyKey"],
}, {
  key: "CANCELLED_DOCUMENT_BLOCKED",
  label: "İptal edilmiş belge gönderim kuyruğuna alınmadı",
  requiredEvidence: ["documentId", "documentNumber", "blockedReason"],
}];

export class LiveProviderTestPlanService {
  listRequiredScenarios() {
    return scenarios;
  }
}

export const liveProviderTestPlanService = new LiveProviderTestPlanService();
