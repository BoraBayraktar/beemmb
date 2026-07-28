import type { EDocumentLiveProviderTestScenario } from "@/modules/edocument/contracts/edocument-provider.contract";

export type AdminBusinessDocumentXmlRootType = "INVOICE" | "DESPATCH_ADVICE";
export type AdminBusinessDocumentXmlValidationStatus = "NOT_VALIDATED" | "VALID" | "INVALID";

export type AdminBusinessDocumentXmlArtifactItem = {
  id: string;
  businessDocumentId: string;
  supersedesArtifactId: string | null;
  documentRootType: AdminBusinessDocumentXmlRootType;
  schemaVersion: string;
  xsdHash: string | null;
  schematronHash: string | null;
  xmlHash: string;
  validationStatus: AdminBusinessDocumentXmlValidationStatus;
  validationErrors: string[];
  isCurrent: boolean;
  generatedAt: string;
  validatedAt: string | null;
  xmlContent?: string;
};

export type GIBComplianceIssueSeverity = "ERROR" | "WARNING";
export type GIBComplianceIssueCode =
  | "MISSING_OFFICIAL_SCHEMA"
  | "MISSING_OFFICIAL_SCHEMATRON"
  | "MISSING_VALIDATION_ENGINE"
  | "OFFICIAL_VALIDATION_FAILED"
  | "XML_ROOT_MISMATCH"
  | "MISSING_DOCUMENT_NUMBER"
  | "INVALID_DOCUMENT_NUMBER_FORMAT"
  | "INVALID_DOCUMENT_UUID"
  | "MISSING_TAX_NUMBER"
  | "INVALID_TAX_NUMBER"
  | "MISSING_COUNTERPARTY_NAME"
  | "MISSING_COUNTERPARTY_ADDRESS"
  | "MISSING_LINE"
  | "INVALID_LINE_QUANTITY"
  | "INVALID_TOTAL_AMOUNT"
  | "MISSING_TAX_RATE"
  | "INVALID_TAX_RATE"
  | "TOTAL_AMOUNT_MISMATCH"
  | "MISSING_SUPPLIER_IDENTITY"
  | "INVALID_SUPPLIER_TAX_NUMBER"
  | "MISSING_DESPATCH_SHIPMENT_PARTY";

export type GIBComplianceIssue = {
  code: GIBComplianceIssueCode;
  severity: GIBComplianceIssueSeverity;
  message: string;
  path?: string;
};

export type GIBComplianceReport = {
  documentRootType: AdminBusinessDocumentXmlRootType;
  schemaVersion: string;
  officialSchemaReady: boolean;
  xsdHash: string | null;
  officialSchematronReady: boolean;
  schematronHash: string | null;
  localRuleValid: boolean;
  xsdValidationReady: boolean;
  schematronValidationReady: boolean;
  valid: boolean;
  issues: GIBComplianceIssue[];
};

export type OfficialValidationAdapterResult = {
  ready: boolean;
  issues: GIBComplianceIssue[];
};

export type EDocumentConfigCheck = {
  key: string;
  label: string;
  ready: boolean;
  message: string;
};

export type EDocumentConfigReadinessReport = {
  ready: boolean;
  senderReady: boolean;
  taxReady: boolean;
  shipmentReady: boolean;
  schemaReady: boolean;
  schematronReady: boolean;
  validationEngineReady: boolean;
  providerReady: boolean;
  providerMode: string;
  registeredProviderAdapters: string[];
  providerAdapters: Array<{
    providerKey: string;
    configured: boolean;
    operational: boolean;
  }>;
  productionChecklist: EDocumentProductionChecklistItem[];
  liveProviderTestScenarios: EDocumentLiveProviderTestScenario[];
  checks: EDocumentConfigCheck[];
};

export type EDocumentValidatorOperationReport = {
  schemaVersion: string;
  capturedAt: string;
  schemas: Array<{
    documentRootType: AdminBusinessDocumentXmlRootType;
    xsdPath: string;
    xsdHash: string | null;
    schematronPath: string;
    schematronHash: string | null;
    officialSchemaReady: boolean;
    officialSchematronReady: boolean;
  }>;
  validators: Array<{
    type: "XSD" | "SCHEMATRON";
    commandKey: string;
    argsKey: string;
    commandConfigured: boolean;
    argsConfigured: boolean;
    hasXmlPlaceholder: boolean;
    hasSchemaPlaceholder: boolean;
    evidenceReady: boolean;
  }>;
  evidenceReady: boolean;
};

export type EDocumentProductionChecklistItem = {
  key: string;
  label: string;
  requiredEvidence: string[];
};

export type EDocumentFullGibGoLiveChecklistItem = EDocumentProductionChecklistItem & {
  phase: "PRODUCTION_ENV" | "REAL_PROVIDER_TEST" | "EVIDENCE_ARCHIVE" | "FINAL_READINESS";
  blocking: boolean;
};

export type EDocumentProductionDeploymentGateKey =
  | "PROVIDER_MODE_LIVE"
  | "LIVE_PROVIDER_OPERATIONAL"
  | "VALIDATION_ENGINE_READY"
  | "OFFICIAL_SCHEMA_HASHES_READY"
  | "VALIDATOR_OPERATION_REPORT_READY"
  | "PRODUCTION_CHECKLIST_DEFINED"
  | "EVIDENCE_PACKAGE_EXPORTED"
  | "AUDIT_EXPORT_ARCHIVED"
  | "ROLLBACK_PLAN_READY"
  | "READINESS_REPORT_ARCHIVED";

export type EDocumentProductionDeploymentEvidence = {
  evidencePackageHash?: string | null;
  auditExportReference?: string | null;
  rollbackPlanReference?: string | null;
  readinessReportArchivedAt?: string | null;
};

export type EDocumentProductionDeploymentGate = {
  key: EDocumentProductionDeploymentGateKey;
  label: string;
  ready: boolean;
  message: string;
  requiredEvidence: string[];
};

export type EDocumentProductionDeploymentReadinessReport = {
  ready: boolean;
  capturedAt: string;
  providerMode: string;
  readinessReady: boolean;
  validatorEvidenceReady: boolean;
  productionChecklistItemCount: number;
  gates: EDocumentProductionDeploymentGate[];
};

export type GenerateBusinessDocumentXmlInput = {
  businessDocumentId: string;
  validate?: boolean;
};

export type GenerateBusinessDocumentXmlResult = {
  item: AdminBusinessDocumentXmlArtifactItem;
  created: boolean;
};

export type UblLineInput = {
  id: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  currency: string;
  note: string | null;
};

export type UblBusinessDocumentInput = {
  id: string;
  uuid: string;
  documentNumber: string;
  documentType: "E_INVOICE" | "E_DISPATCH";
  issueDate: Date;
  currency: string;
  totalAmount: number | null;
  counterpartyName: string;
  counterpartyTaxNumber: string | null;
  counterpartyTaxOffice: string | null;
  counterpartyEmail: string | null;
  counterpartyAddress: string | null;
  note: string | null;
  sender: {
    name: string | null;
    taxNumber: string | null;
    taxOffice: string | null;
    email: string | null;
    address: string | null;
  };
  tax: {
    vatRate: number | null;
  };
  shipment: {
    carrierName: string | null;
    carrierTaxNumber: string | null;
    vehiclePlate: string | null;
    driverName: string | null;
    driverTckn: string | null;
  };
  lines: UblLineInput[];
};
