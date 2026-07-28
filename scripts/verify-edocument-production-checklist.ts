import { eDocumentProductionChecklistService } from "@/modules/edocument/services/edocument-production-checklist.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const items = eDocumentProductionChecklistService.listItems();
const keys = items.map((item) => item.key);

for (const expectedKey of [
  "OFFICIAL_GIB_HASHES_RECORDED",
  "EDOCUMENT_VERIFY_PASSED",
  "LIVE_PROVIDER_MODE_SET",
  "LIVE_PROVIDER_PROTOCOL_MATCHED",
  "LIVE_PROVIDER_CONTRACT_COMPLETED",
  "LIVE_PROVIDER_HTTP_CLIENT_VERIFIED",
  "LIVE_PROVIDER_WEBHOOK_MAPPING_VERIFIED",
  "LIVE_PROVIDER_EDGE_OUTCOMES_VERIFIED",
  "VALIDATORS_CONFIGURED",
  "VALIDATOR_OPERATION_REPORT_CAPTURED",
  "LIVE_ADAPTER_OPERATIONAL",
  "LIVE_PROVIDER_TEST_EVIDENCE_RECORDED",
  "LIVE_PROVIDER_TEST_EVIDENCE_REPORT_READY",
  "EVIDENCE_PACKAGE_EXPORTED",
  "AUDIT_EXPORT_ARCHIVED",
  "PRODUCTION_ROLLBACK_PLAN_READY",
  "PRODUCTION_DEPLOYMENT_READINESS_REPORT_READY",
] as const) {
  assert(keys.includes(expectedKey), `${expectedKey} production checklist maddesi tanımlı olmalıdır.`);
}

assert(new Set(keys).size === keys.length, "Production checklist anahtarları tekil olmalıdır.");

for (const item of items) {
  assert(item.label.trim().length > 0, `${item.key} checklist maddesi kullanıcıya açık etiket taşımalıdır.`);
  assert(item.requiredEvidence.length > 0, `${item.key} checklist maddesi kanıt alanı taşımalıdır.`);
  assert(item.requiredEvidence.every((field) => field.trim().length > 0), `${item.key} checklist maddesi boş kanıt alanı taşımamalıdır.`);
}

const validators = items.find((item) => item.key === "VALIDATORS_CONFIGURED");
if (!validators) {
  throw new Error("VALIDATORS_CONFIGURED checklist maddesi bulunmalıdır.");
}
assert(validators.requiredEvidence.includes("EDOCUMENT_XSD_VALIDATOR_ARGS"), "Validator checklist XSD args kanıtını istemelidir.");
assert(validators.requiredEvidence.includes("EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS"), "Validator checklist Schematron args kanıtını istemelidir.");

const validatorOperationReport = items.find((item) => item.key === "VALIDATOR_OPERATION_REPORT_CAPTURED");
if (!validatorOperationReport) {
  throw new Error("VALIDATOR_OPERATION_REPORT_CAPTURED checklist maddesi bulunmalıdır.");
}
assert(validatorOperationReport.requiredEvidence.includes("invoiceXsdHash"), "Validator operasyon checklist fatura XSD hash kanıtını istemelidir.");
assert(validatorOperationReport.requiredEvidence.includes("schematronValidatorEvidenceReady"), "Validator operasyon checklist Schematron validator evidence kanıtını istemelidir.");

const liveProviderContract = items.find((item) => item.key === "LIVE_PROVIDER_CONTRACT_COMPLETED");
if (!liveProviderContract) {
  throw new Error("LIVE_PROVIDER_CONTRACT_COMPLETED checklist maddesi bulunmalıdır.");
}
assert(liveProviderContract.requiredEvidence.includes("contractSectionKeys"), "Canlı provider sözleşme checklist maddesi bölüm anahtarları kanıtını istemelidir.");
assert(liveProviderContract.requiredEvidence.includes("webhookSignatureAlgorithm"), "Canlı provider sözleşme checklist maddesi webhook imza algoritması kanıtını istemelidir.");

const liveProviderHttpClient = items.find((item) => item.key === "LIVE_PROVIDER_HTTP_CLIENT_VERIFIED");
if (!liveProviderHttpClient) {
  throw new Error("LIVE_PROVIDER_HTTP_CLIENT_VERIFIED checklist maddesi bulunmalıdır.");
}
assert(liveProviderHttpClient.requiredEvidence.includes("timeoutMs"), "Canlı provider HTTP client checklist timeout kanıtını istemelidir.");
assert(liveProviderHttpClient.requiredEvidence.includes("maskedErrorPayload"), "Canlı provider HTTP client checklist maskelenmiş hata payload kanıtını istemelidir.");

const liveProviderWebhookMapping = items.find((item) => item.key === "LIVE_PROVIDER_WEBHOOK_MAPPING_VERIFIED");
if (!liveProviderWebhookMapping) {
  throw new Error("LIVE_PROVIDER_WEBHOOK_MAPPING_VERIFIED checklist maddesi bulunmalıdır.");
}
assert(liveProviderWebhookMapping.requiredEvidence.includes("rawBodyHash"), "Canlı provider webhook checklist rawBodyHash kanıtını istemelidir.");
assert(liveProviderWebhookMapping.requiredEvidence.includes("maskedProviderPayload"), "Canlı provider webhook checklist maskelenmiş provider payload kanıtını istemelidir.");

const liveProviderEdgeOutcomes = items.find((item) => item.key === "LIVE_PROVIDER_EDGE_OUTCOMES_VERIFIED");
if (!liveProviderEdgeOutcomes) {
  throw new Error("LIVE_PROVIDER_EDGE_OUTCOMES_VERIFIED checklist maddesi bulunmalıdır.");
}
assert(liveProviderEdgeOutcomes.requiredEvidence.includes("cancelledOutcome"), "Canlı provider edge outcome checklist iptal kanıtını istemelidir.");
assert(liveProviderEdgeOutcomes.requiredEvidence.includes("returnedOutcome"), "Canlı provider edge outcome checklist iade kanıtını istemelidir.");

const evidencePackage = items.find((item) => item.key === "EVIDENCE_PACKAGE_EXPORTED");
if (!evidencePackage) {
  throw new Error("EVIDENCE_PACKAGE_EXPORTED checklist maddesi bulunmalıdır.");
}
assert(evidencePackage.requiredEvidence.includes("packageHash"), "Evidence checklist packageHash kanıtını istemelidir.");
assert(evidencePackage.requiredEvidence.includes("xmlHash"), "Evidence checklist xmlHash kanıtını istemelidir.");

const auditExport = items.find((item) => item.key === "AUDIT_EXPORT_ARCHIVED");
if (!auditExport) {
  throw new Error("AUDIT_EXPORT_ARCHIVED checklist maddesi bulunmalıdır.");
}
assert(auditExport.requiredEvidence.includes("auditExportReference"), "Audit export checklist arşiv referansı kanıtını istemelidir.");
assert(auditExport.requiredEvidence.includes("retentionPolicy"), "Audit export checklist retention policy kanıtını istemelidir.");

const rollbackPlan = items.find((item) => item.key === "PRODUCTION_ROLLBACK_PLAN_READY");
if (!rollbackPlan) {
  throw new Error("PRODUCTION_ROLLBACK_PLAN_READY checklist maddesi bulunmalıdır.");
}
assert(rollbackPlan.requiredEvidence.includes("rollbackPlanReference"), "Rollback checklist prosedür referansı kanıtını istemelidir.");
assert(rollbackPlan.requiredEvidence.includes("fallbackProviderMode"), "Rollback checklist fallback provider modu kanıtını istemelidir.");

const deploymentReadiness = items.find((item) => item.key === "PRODUCTION_DEPLOYMENT_READINESS_REPORT_READY");
if (!deploymentReadiness) {
  throw new Error("PRODUCTION_DEPLOYMENT_READINESS_REPORT_READY checklist maddesi bulunmalıdır.");
}
assert(deploymentReadiness.requiredEvidence.includes("evidencePackageHash"), "Deployment readiness checklist evidence package hash kanıtını istemelidir.");
assert(deploymentReadiness.requiredEvidence.includes("auditExportReference"), "Deployment readiness checklist audit export kanıtını istemelidir.");
assert(deploymentReadiness.requiredEvidence.includes("rollbackPlanReference"), "Deployment readiness checklist rollback plan kanıtını istemelidir.");
assert(deploymentReadiness.requiredEvidence.includes("readinessReportArchivedAt"), "Deployment readiness checklist rapor arşiv tarihi kanıtını istemelidir.");

const liveProviderTestEvidenceReport = items.find((item) => item.key === "LIVE_PROVIDER_TEST_EVIDENCE_REPORT_READY");
if (!liveProviderTestEvidenceReport) {
  throw new Error("LIVE_PROVIDER_TEST_EVIDENCE_REPORT_READY checklist maddesi bulunmalıdır.");
}
assert(liveProviderTestEvidenceReport.requiredEvidence.includes("readyScenarioCount"), "Canlı provider test evidence raporu hazır senaryo sayısı kanıtını istemelidir.");
assert(liveProviderTestEvidenceReport.requiredEvidence.includes("missingScenarioKeys"), "Canlı provider test evidence raporu eksik senaryo anahtarları kanıtını istemelidir.");

console.log("E-belge production checklist doğrulaması geçti.");
