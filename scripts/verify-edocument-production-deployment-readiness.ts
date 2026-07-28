import { eDocumentProductionDeploymentReadinessService } from "@/modules/edocument/services/edocument-production-deployment-readiness.service";

const trackedKeys = [
  "EDOCUMENT_SENDER_NAME",
  "EDOCUMENT_SENDER_TAX_NUMBER",
  "EDOCUMENT_SENDER_TAX_OFFICE",
  "EDOCUMENT_SENDER_EMAIL",
  "EDOCUMENT_SENDER_ADDRESS",
  "EDOCUMENT_INVOICE_NUMBER_PREFIX",
  "EDOCUMENT_DEFAULT_VAT_RATE",
  "EDOCUMENT_SHIPMENT_CARRIER_NAME",
  "EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER",
  "EDOCUMENT_SHIPMENT_VEHICLE_PLATE",
  "EDOCUMENT_SHIPMENT_DRIVER_NAME",
  "EDOCUMENT_SHIPMENT_DRIVER_TCKN",
  "EDOCUMENT_XSD_VALIDATOR_COMMAND",
  "EDOCUMENT_XSD_VALIDATOR_ARGS",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS",
  "EDOCUMENT_PROVIDER_MODE",
  "EDOCUMENT_LIVE_PROVIDER_PROTOCOL",
  "EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL",
  "EDOCUMENT_LIVE_PROVIDER_USERNAME",
  "EDOCUMENT_LIVE_PROVIDER_SECRET_KEY",
] as const;

const previousEnv = new Map<string, string | undefined>();

function setTrackedEnv(values: Partial<Record<(typeof trackedKeys)[number], string>>) {
  for (const key of trackedKeys) {
    if (!previousEnv.has(key)) {
      previousEnv.set(key, process.env[key]);
    }

    process.env[key] = values[key] ?? "";
  }
}

function restoreEnv() {
  for (const [key, value] of previousEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function findGate(key: string) {
  const report = eDocumentProductionDeploymentReadinessService.getReport({
    evidencePackageHash: "sha256:evidence-package",
    auditExportReference: "s3://release-evidence/edocument/audit-log.ndjson",
    rollbackPlanReference: "runbook://edocument-production-rollback",
    readinessReportArchivedAt: "2026-07-26T10:00:00.000Z",
  });
  const gate = report.gates.find((item) => item.key === key);

  assert(Boolean(gate), `${key} deployment readiness kapısı bulunmalıdır.`);

  return { report, gate: gate! };
}

try {
  setTrackedEnv({
    EDOCUMENT_SENDER_NAME: "BEEMMB Test",
    EDOCUMENT_SENDER_TAX_NUMBER: "1234567890",
    EDOCUMENT_SENDER_TAX_OFFICE: "Kadıköy",
    EDOCUMENT_SENDER_EMAIL: "ebelge@example.com",
    EDOCUMENT_SENDER_ADDRESS: "Test adresi",
    EDOCUMENT_INVOICE_NUMBER_PREFIX: "BEF",
    EDOCUMENT_DEFAULT_VAT_RATE: "20",
    EDOCUMENT_SHIPMENT_CARRIER_NAME: "Test Taşıyıcı",
    EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER: "1234567890",
    EDOCUMENT_SHIPMENT_VEHICLE_PLATE: "34ABC123",
    EDOCUMENT_SHIPMENT_DRIVER_NAME: "Test Şoför",
    EDOCUMENT_SHIPMENT_DRIVER_TCKN: "10000000146",
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "node",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--schema {schema} {xml}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "node",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
    EDOCUMENT_PROVIDER_MODE: "LIVE",
    EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "CUSTOM_HTTP_JSON",
    EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL: "https://entegrator.example.com/edocument",
    EDOCUMENT_LIVE_PROVIDER_USERNAME: "api-user",
    EDOCUMENT_LIVE_PROVIDER_SECRET_KEY: "api-secret",
  });

  const completeReport = eDocumentProductionDeploymentReadinessService.getReport({
    evidencePackageHash: "sha256:evidence-package",
    auditExportReference: "s3://release-evidence/edocument/audit-log.ndjson",
    rollbackPlanReference: "runbook://edocument-production-rollback",
    readinessReportArchivedAt: "2026-07-26T10:00:00.000Z",
  });

  assert(completeReport.ready, "Env ve deployment kanıtları tamken production deployment readiness hazır olmalıdır.");
  assert(completeReport.providerMode === "LIVE", "Deployment readiness raporu LIVE provider modunu taşımalıdır.");
  assert(completeReport.readinessReady, "Deployment readiness raporu config readiness durumunu taşımalıdır.");
  assert(completeReport.validatorEvidenceReady, "Deployment readiness raporu validator evidence durumunu taşımalıdır.");
  assert(completeReport.productionChecklistItemCount > 0, "Deployment readiness raporu checklist sayısını taşımalıdır.");

  for (const expectedGate of [
    "PROVIDER_MODE_LIVE",
    "LIVE_PROVIDER_OPERATIONAL",
    "VALIDATION_ENGINE_READY",
    "OFFICIAL_SCHEMA_HASHES_READY",
    "VALIDATOR_OPERATION_REPORT_READY",
    "PRODUCTION_CHECKLIST_DEFINED",
    "EVIDENCE_PACKAGE_EXPORTED",
    "AUDIT_EXPORT_ARCHIVED",
    "ROLLBACK_PLAN_READY",
    "READINESS_REPORT_ARCHIVED",
  ] as const) {
    const { gate } = findGate(expectedGate);
    assert(gate.ready, `${expectedGate} tam kanıtla hazır olmalıdır.`);
    assert(gate.requiredEvidence.length > 0, `${expectedGate} requiredEvidence alanı taşımalıdır.`);
  }

  const missingEvidenceReport = eDocumentProductionDeploymentReadinessService.getReport({
    evidencePackageHash: "",
    auditExportReference: "",
    rollbackPlanReference: "",
    readinessReportArchivedAt: "",
  });
  assert(!missingEvidenceReport.ready, "Deployment kanıtları eksikken production deployment readiness hazır olmamalıdır.");
  assert(!missingEvidenceReport.gates.find((item) => item.key === "EVIDENCE_PACKAGE_EXPORTED")?.ready, "Evidence package hash olmadan evidence gate hazır olmamalıdır.");
  assert(!missingEvidenceReport.gates.find((item) => item.key === "AUDIT_EXPORT_ARCHIVED")?.ready, "Audit export referansı olmadan audit gate hazır olmamalıdır.");
  assert(!missingEvidenceReport.gates.find((item) => item.key === "ROLLBACK_PLAN_READY")?.ready, "Rollback referansı olmadan rollback gate hazır olmamalıdır.");
  assert(!missingEvidenceReport.gates.find((item) => item.key === "READINESS_REPORT_ARCHIVED")?.ready, "Readiness raporu arşivlenmeden arşiv gate hazır olmamalıdır.");

  setTrackedEnv({ EDOCUMENT_PROVIDER_MODE: "MOCK" });
  const mockReport = eDocumentProductionDeploymentReadinessService.getReport({
    evidencePackageHash: "sha256:evidence-package",
    auditExportReference: "s3://release-evidence/edocument/audit-log.ndjson",
    rollbackPlanReference: "runbook://edocument-production-rollback",
    readinessReportArchivedAt: "2026-07-26T10:00:00.000Z",
  });
  assert(!mockReport.ready, "MOCK provider modu production deployment readiness için hazır olmamalıdır.");
  assert(!mockReport.gates.find((item) => item.key === "PROVIDER_MODE_LIVE")?.ready, "MOCK provider modunda LIVE gate hazır olmamalıdır.");

  console.log("E-belge production deployment readiness doğrulaması geçti.");
} finally {
  restoreEnv();
}
