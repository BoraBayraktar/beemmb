import type { EDocumentFullGibGoLiveChecklistItem, EDocumentProductionChecklistItem } from "@/modules/edocument/contracts/edocument.contract";

const checklist: EDocumentProductionChecklistItem[] = [{
  key: "OFFICIAL_GIB_HASHES_RECORDED",
  label: "Resmi GİB XSD ve Schematron SHA-256 hashleri release kaydına yazıldı",
  requiredEvidence: ["invoiceXsdHash", "despatchXsdHash", "schematronHash", "sourcePackageUrls"],
}, {
  key: "EDOCUMENT_VERIFY_PASSED",
  label: "E-belge kalite kapısı production kaynakları üzerinde geçti",
  requiredEvidence: ["verifyCommand", "completedAt", "exitCode"],
}, {
  key: "LIVE_PROVIDER_MODE_SET",
  label: "Production ortamında e-belge provider modu LIVE",
  requiredEvidence: ["EDOCUMENT_PROVIDER_MODE", "environmentName"],
}, {
  key: "LIVE_PROVIDER_PROTOCOL_MATCHED",
  label: "Canlı provider protokolü özel entegratör adapterı ile eşleşiyor",
  requiredEvidence: ["EDOCUMENT_LIVE_PROVIDER_PROTOCOL", "providerCode", "adapterVersion"],
}, {
  key: "LIVE_PROVIDER_CONTRACT_COMPLETED",
  label: "Özel entegratör teknik sözleşmesi alan eşlemeleriyle tamamlandı",
  requiredEvidence: ["providerCode", "contractSectionKeys", "authType", "invoiceEndpoint", "despatchEndpoint", "statusEndpoint", "webhookSignatureAlgorithm"],
}, {
  key: "LIVE_PROVIDER_HTTP_CLIENT_VERIFIED",
  label: "Canlı provider HTTP client gönderim, durum sorgu, timeout ve hata normalizasyonu doğrulandı",
  requiredEvidence: ["providerCode", "dispatchOperation", "statusOperation", "timeoutMs", "maskedErrorPayload"],
}, {
  key: "LIVE_PROVIDER_WEBHOOK_MAPPING_VERIFIED",
  label: "Canlı provider webhook payload, imza, durum ve hata mapping akışı doğrulandı",
  requiredEvidence: ["providerCode", "signatureAlgorithm", "rawBodyHash", "statusMap", "providerErrorCode", "maskedProviderPayload"],
}, {
  key: "LIVE_PROVIDER_EDGE_OUTCOMES_VERIFIED",
  label: "Ret, iptal, iade ve bilinmeyen provider durumları domain outcome olarak doğrulandı",
  requiredEvidence: ["rejectedOutcome", "cancelledOutcome", "returnedOutcome", "unknownOutcome", "externalSystemStatusMap"],
}, {
  key: "VALIDATORS_CONFIGURED",
  label: "XSD ve Schematron validator komutları placeholder değerleriyle tanımlandı",
  requiredEvidence: ["EDOCUMENT_XSD_VALIDATOR_COMMAND", "EDOCUMENT_XSD_VALIDATOR_ARGS", "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND", "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS"],
}, {
  key: "VALIDATOR_OPERATION_REPORT_CAPTURED",
  label: "Validator operasyon raporu schema hash ve validator evidence durumuyla arşivlendi",
  requiredEvidence: ["schemaVersion", "invoiceXsdHash", "despatchXsdHash", "schematronHash", "xsdValidatorEvidenceReady", "schematronValidatorEvidenceReady"],
}, {
  key: "LIVE_ADAPTER_OPERATIONAL",
  label: "Canlı e-belge adapterı konfigüre ve operasyonel görünüyor",
  requiredEvidence: ["providerKey", "configured", "operational", "readinessReportCapturedAt"],
}, {
  key: "LIVE_PROVIDER_TEST_EVIDENCE_RECORDED",
  label: "Özel entegratör test ortamı senaryoları kanıtlarıyla kayıt altına alındı",
  requiredEvidence: ["scenarioKeys", "providerReferences", "webhookEvidence", "errorEvidence"],
}, {
  key: "LIVE_PROVIDER_TEST_EVIDENCE_REPORT_READY",
  label: "Canlı provider test evidence raporu tüm zorunlu senaryolar için hazır",
  requiredEvidence: ["scenarioCount", "readyScenarioCount", "missingScenarioKeys", "evidenceReportCapturedAt"],
}, {
  key: "EVIDENCE_PACKAGE_EXPORTED",
  label: "Evidence package export alındı ve hash değerleri release kaydına işlendi",
  requiredEvidence: ["packageHash", "xmlHash", "xsdHash", "schematronHash"],
}, {
  key: "AUDIT_EXPORT_ARCHIVED",
  label: "E-belge audit log export alındı ve release arşivine işlendi",
  requiredEvidence: ["auditExportReference", "exportedAt", "retentionPolicy", "owner"],
}, {
  key: "PRODUCTION_ROLLBACK_PLAN_READY",
  label: "Production rollback ve mock fallback prosedürü onaylandı",
  requiredEvidence: ["rollbackPlanReference", "fallbackProviderMode", "owner", "approvedAt"],
}, {
  key: "PRODUCTION_DEPLOYMENT_READINESS_REPORT_READY",
  label: "Production deployment readiness raporu tüm otomatik ve manuel kapılarla arşivlendi",
  requiredEvidence: ["providerMode", "providerKey", "validatorEvidenceReady", "evidencePackageHash", "auditExportReference", "rollbackPlanReference", "readinessReportArchivedAt"],
}];

const fullGibGoLiveChecklist: EDocumentFullGibGoLiveChecklistItem[] = [{
  key: "FULL_GIB_PRODUCTION_ENV_CONFIGURED",
  phase: "PRODUCTION_ENV",
  blocking: true,
  label: "Production/staging ortamına gerçek özel entegratör ve e-belge env değerleri girildi",
  requiredEvidence: ["environmentName", "providerCode", "EDOCUMENT_PROVIDER_MODE", "EDOCUMENT_LIVE_PROVIDER_PROTOCOL", "EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL", "credentialRotationOwner"],
}, {
  key: "FULL_GIB_REAL_PROVIDER_INVOICE_DISPATCH_TESTED",
  phase: "REAL_PROVIDER_TEST",
  blocking: true,
  label: "Gerçek provider test ortamında e-fatura gönderimi kabul edildi",
  requiredEvidence: ["providerCode", "documentNumber", "xmlArtifactId", "xmlHash", "providerReference", "acceptedAt"],
}, {
  key: "FULL_GIB_REAL_PROVIDER_DESPATCH_TESTED",
  phase: "REAL_PROVIDER_TEST",
  blocking: true,
  label: "Gerçek provider test ortamında e-irsaliye gönderimi kabul edildi",
  requiredEvidence: ["providerCode", "documentNumber", "xmlArtifactId", "xmlHash", "providerReference", "acceptedAt"],
}, {
  key: "FULL_GIB_REAL_PROVIDER_STATUS_QUERY_TESTED",
  phase: "REAL_PROVIDER_TEST",
  blocking: true,
  label: "Gerçek provider durum sorgu senaryosu doğrulandı",
  requiredEvidence: ["providerCode", "providerReference", "providerStatus", "externalSystemStatus", "statusSyncedAt"],
}, {
  key: "FULL_GIB_REAL_PROVIDER_WEBHOOK_TESTED",
  phase: "REAL_PROVIDER_TEST",
  blocking: true,
  label: "Gerçek provider webhook bildirimi imza ve payload mapping ile işlendi",
  requiredEvidence: ["providerCode", "webhookUrl", "signaturePresent", "rawBodyHash", "documentNumber", "providerOutcome"],
}, {
  key: "FULL_GIB_REAL_PROVIDER_ERROR_CASES_TESTED",
  phase: "REAL_PROVIDER_TEST",
  blocking: true,
  label: "Gerçek provider hata, ret, iptal, iade ve tekrar gönderim edge case senaryoları doğrulandı",
  requiredEvidence: ["providerCode", "providerErrorCode", "rejectedOutcome", "cancelledOutcome", "returnedOutcome", "idempotencyKey"],
}, {
  key: "FULL_GIB_EVIDENCE_PACKAGE_ARCHIVED",
  phase: "EVIDENCE_ARCHIVE",
  blocking: true,
  label: "Canlı geçiş evidence package hashleri release kaydına işlendi",
  requiredEvidence: ["packageHash", "xmlHash", "xsdHash", "schematronHash", "releaseRecordReference"],
}, {
  key: "FULL_GIB_AUDIT_EXPORT_ARCHIVED",
  phase: "EVIDENCE_ARCHIVE",
  blocking: true,
  label: "E-belge audit export arşiv referansı release kaydına işlendi",
  requiredEvidence: ["auditExportReference", "exportedAt", "retentionPolicy", "owner"],
}, {
  key: "FULL_GIB_VALIDATORS_AND_SCHEMA_HASHES_CONFIRMED",
  phase: "FINAL_READINESS",
  blocking: true,
  label: "Production validator motorları ve resmi schema hashleri son kez doğrulandı",
  requiredEvidence: ["invoiceXsdHash", "despatchXsdHash", "schematronHash", "xsdValidatorEvidenceReady", "schematronValidatorEvidenceReady", "validatedAt"],
}, {
  key: "FULL_GIB_DEPLOYMENT_READINESS_READY",
  phase: "FINAL_READINESS",
  blocking: true,
  label: "Tam GİB canlı geçiş readiness raporu gerçek kanıtlarla ready=true döndü",
  requiredEvidence: ["readinessReportHash", "readinessReportArchivedAt", "evidencePackageHash", "auditExportReference", "rollbackPlanReference"],
}];

export class EDocumentProductionChecklistService {
  listItems() {
    return checklist;
  }

  listFullGibGoLiveItems() {
    return fullGibGoLiveChecklist;
  }
}

export const eDocumentProductionChecklistService = new EDocumentProductionChecklistService();
