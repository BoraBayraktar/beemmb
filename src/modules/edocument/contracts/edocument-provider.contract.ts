export type EDocumentProviderDocumentType = "INVOICE" | "DESPATCH_ADVICE";

export type EDocumentProviderDispatchInput = {
  documentId: string;
  documentNumber: string;
  documentType: EDocumentProviderDocumentType;
  providerCode: string;
  xmlArtifactId: string;
  xmlHash: string;
  xmlContent: string;
  schemaVersion: string;
};

export type EDocumentProviderDispatchResult = {
  accepted: boolean;
  providerReference: string | null;
  providerStatus: "QUEUED" | "SENT" | "FAILED";
  responsePayload: Record<string, unknown>;
};

export type EDocumentLiveProviderTestScenarioKey =
  | "OUTBOUND_INVOICE_ACCEPTED"
  | "OUTBOUND_DESPATCH_ACCEPTED"
  | "STATUS_SYNC_SENT"
  | "WEBHOOK_STATUS_RECEIVED"
  | "PROVIDER_VALIDATION_ERROR"
  | "IDEMPOTENT_RESEND"
  | "CANCELLED_DOCUMENT_BLOCKED";

export type EDocumentLiveProviderTestScenario = {
  key: EDocumentLiveProviderTestScenarioKey;
  label: string;
  requiredEvidence: string[];
};

export type EDocumentLiveProviderScenarioEvidence = {
  scenarioKey: EDocumentLiveProviderTestScenarioKey;
  evidence: Record<string, unknown>;
  capturedAt?: string;
};

export type EDocumentLiveProviderEvidenceCheck = {
  scenarioKey: EDocumentLiveProviderTestScenarioKey;
  label: string;
  ready: boolean;
  missingEvidence: string[];
  capturedAt: string | null;
};

export type EDocumentLiveProviderEvidenceReport = {
  ready: boolean;
  scenarioCount: number;
  readyScenarioCount: number;
  missingScenarioKeys: EDocumentLiveProviderTestScenarioKey[];
  checks: EDocumentLiveProviderEvidenceCheck[];
};

export type EDocumentLiveProviderContractSectionKey =
  | "PROVIDER_IDENTITY"
  | "AUTHENTICATION"
  | "OUTBOUND_INVOICE"
  | "OUTBOUND_DESPATCH"
  | "STATUS_QUERY"
  | "WEBHOOK"
  | "ERROR_MAPPING"
  | "RETRY_TIMEOUT"
  | "SECURITY_EVIDENCE";

export type EDocumentLiveProviderContractSection = {
  key: EDocumentLiveProviderContractSectionKey;
  label: string;
  requiredInputs: string[];
  implementationNotes: string[];
  evidenceFields: string[];
};

export interface EDocumentProviderAdapter {
  providerKey: string;
  isConfigured?(): boolean;
  isOperational?(): boolean;
  dispatchDocument(input: EDocumentProviderDispatchInput): Promise<EDocumentProviderDispatchResult>;
  queryDocumentStatus(input: {
    documentId: string;
    documentNumber: string;
    providerReference?: string | null;
  }): Promise<EDocumentProviderDispatchResult>;
}
