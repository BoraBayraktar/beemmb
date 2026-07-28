import type {
  EDocumentProductionDeploymentEvidence,
  EDocumentProductionDeploymentGate,
  EDocumentProductionDeploymentReadinessReport,
} from "@/modules/edocument/contracts/edocument.contract";
import { eDocumentConfigReadinessService } from "@/modules/edocument/services/edocument-config-readiness.service";
import { eDocumentProductionChecklistService } from "@/modules/edocument/services/edocument-production-checklist.service";
import { eDocumentValidatorOperationsService } from "@/modules/edocument/services/edocument-validator-operations.service";

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function buildGate(args: EDocumentProductionDeploymentGate): EDocumentProductionDeploymentGate {
  return args;
}

export class EDocumentProductionDeploymentReadinessService {
  getReport(evidence: EDocumentProductionDeploymentEvidence = {}): EDocumentProductionDeploymentReadinessReport {
    const readiness = eDocumentConfigReadinessService.getReport();
    const validatorReport = eDocumentValidatorOperationsService.getReport();
    const productionChecklist = eDocumentProductionChecklistService.listItems();
    const liveProviderOperational = readiness.providerAdapters.some((adapter) => {
      return adapter.providerKey !== "mock-edocs-provider" && adapter.configured && adapter.operational;
    });
    const officialSchemaHashesReady = validatorReport.schemas.every((schema) => {
      return schema.officialSchemaReady && schema.officialSchematronReady && hasValue(schema.xsdHash) && hasValue(schema.schematronHash);
    });
    const productionChecklistDefined = productionChecklist.length > 0 && productionChecklist.every((item) => {
      return item.label.trim().length > 0 && item.requiredEvidence.length > 0 && item.requiredEvidence.every((field) => field.trim().length > 0);
    });

    const gates: EDocumentProductionDeploymentGate[] = [
      buildGate({
        key: "PROVIDER_MODE_LIVE",
        label: "Production provider modu LIVE",
        ready: readiness.providerMode === "LIVE",
        message: readiness.providerMode === "LIVE" ? "Hazır" : "EDOCUMENT_PROVIDER_MODE production için LIVE olmalıdır.",
        requiredEvidence: ["EDOCUMENT_PROVIDER_MODE"],
      }),
      buildGate({
        key: "LIVE_PROVIDER_OPERATIONAL",
        label: "Canlı provider adapterı operasyonel",
        ready: readiness.providerReady && liveProviderOperational,
        message: readiness.providerReady && liveProviderOperational ? "Hazır" : "Mock dışı canlı provider configured=true ve operational=true olmalıdır.",
        requiredEvidence: ["providerKey", "configured", "operational"],
      }),
      buildGate({
        key: "VALIDATION_ENGINE_READY",
        label: "XSD ve Schematron doğrulama motorları hazır",
        ready: readiness.validationEngineReady,
        message: readiness.validationEngineReady ? "Hazır" : "Validator command ve args env değerleri production ortamında tamamlanmalıdır.",
        requiredEvidence: ["EDOCUMENT_XSD_VALIDATOR_COMMAND", "EDOCUMENT_XSD_VALIDATOR_ARGS", "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND", "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS"],
      }),
      buildGate({
        key: "OFFICIAL_SCHEMA_HASHES_READY",
        label: "Resmi GİB schema hashleri hazır",
        ready: readiness.schemaReady && readiness.schematronReady && officialSchemaHashesReady,
        message: readiness.schemaReady && readiness.schematronReady && officialSchemaHashesReady ? "Hazır" : "Resmi XSD ve Schematron dosyaları hash değerleriyle hazır olmalıdır.",
        requiredEvidence: ["invoiceXsdHash", "despatchXsdHash", "invoiceSchematronHash", "despatchSchematronHash"],
      }),
      buildGate({
        key: "VALIDATOR_OPERATION_REPORT_READY",
        label: "Validator operasyon raporu hazır",
        ready: validatorReport.evidenceReady,
        message: validatorReport.evidenceReady ? "Hazır" : "Validator operasyon raporu schema ve validator evidence değerleriyle hazır olmalıdır.",
        requiredEvidence: ["schemaVersion", "capturedAt", "validatorEvidenceReady"],
      }),
      buildGate({
        key: "PRODUCTION_CHECKLIST_DEFINED",
        label: "Production checklist kanıt alanları tanımlı",
        ready: productionChecklistDefined,
        message: productionChecklistDefined ? "Hazır" : "Production checklist maddeleri etiket ve requiredEvidence alanlarıyla tamamlanmalıdır.",
        requiredEvidence: ["checklistKeys", "requiredEvidence"],
      }),
      buildGate({
        key: "EVIDENCE_PACKAGE_EXPORTED",
        label: "Evidence package export arşivlendi",
        ready: hasValue(evidence.evidencePackageHash),
        message: hasValue(evidence.evidencePackageHash) ? "Hazır" : "Production geçişi için evidence package hash değeri kaydedilmelidir.",
        requiredEvidence: ["evidencePackageHash"],
      }),
      buildGate({
        key: "AUDIT_EXPORT_ARCHIVED",
        label: "Audit log export arşivlendi",
        ready: hasValue(evidence.auditExportReference),
        message: hasValue(evidence.auditExportReference) ? "Hazır" : "Production geçişi için audit log export referansı kaydedilmelidir.",
        requiredEvidence: ["auditExportReference"],
      }),
      buildGate({
        key: "ROLLBACK_PLAN_READY",
        label: "Rollback ve fallback prosedürü hazır",
        ready: hasValue(evidence.rollbackPlanReference),
        message: hasValue(evidence.rollbackPlanReference) ? "Hazır" : "Production geçişi için rollback/fallback prosedürü referansı kaydedilmelidir.",
        requiredEvidence: ["rollbackPlanReference"],
      }),
      buildGate({
        key: "READINESS_REPORT_ARCHIVED",
        label: "Production readiness raporu arşivlendi",
        ready: hasValue(evidence.readinessReportArchivedAt),
        message: hasValue(evidence.readinessReportArchivedAt) ? "Hazır" : "Production readiness raporu arşiv tarihiyle kaydedilmelidir.",
        requiredEvidence: ["readinessReportArchivedAt"],
      }),
    ];

    return {
      ready: gates.every((gate) => gate.ready),
      capturedAt: new Date().toISOString(),
      providerMode: readiness.providerMode,
      readinessReady: readiness.ready,
      validatorEvidenceReady: validatorReport.evidenceReady,
      productionChecklistItemCount: productionChecklist.length,
      gates,
    };
  }
}

export const eDocumentProductionDeploymentReadinessService = new EDocumentProductionDeploymentReadinessService();
