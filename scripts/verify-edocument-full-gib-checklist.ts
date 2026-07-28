import { eDocumentProductionChecklistService } from "@/modules/edocument/services/edocument-production-checklist.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const items = eDocumentProductionChecklistService.listFullGibGoLiveItems();
const keys = items.map((item) => item.key);

for (const expectedKey of [
  "FULL_GIB_PRODUCTION_ENV_CONFIGURED",
  "FULL_GIB_REAL_PROVIDER_INVOICE_DISPATCH_TESTED",
  "FULL_GIB_REAL_PROVIDER_DESPATCH_TESTED",
  "FULL_GIB_REAL_PROVIDER_STATUS_QUERY_TESTED",
  "FULL_GIB_REAL_PROVIDER_WEBHOOK_TESTED",
  "FULL_GIB_REAL_PROVIDER_ERROR_CASES_TESTED",
  "FULL_GIB_EVIDENCE_PACKAGE_ARCHIVED",
  "FULL_GIB_AUDIT_EXPORT_ARCHIVED",
  "FULL_GIB_VALIDATORS_AND_SCHEMA_HASHES_CONFIRMED",
  "FULL_GIB_DEPLOYMENT_READINESS_READY",
] as const) {
  assert(keys.includes(expectedKey), `${expectedKey} Tam GİB checklist maddesi tanımlı olmalıdır.`);
}

assert(new Set(keys).size === keys.length, "Tam GİB checklist anahtarları tekil olmalıdır.");
assert(items.every((item) => item.blocking), "Tam GİB canlı geçiş maddeleri bloklayıcı olmalıdır.");
assert(items.some((item) => item.phase === "PRODUCTION_ENV"), "Tam GİB checklist production env fazı taşımalıdır.");
assert(items.some((item) => item.phase === "REAL_PROVIDER_TEST"), "Tam GİB checklist gerçek provider test fazı taşımalıdır.");
assert(items.some((item) => item.phase === "EVIDENCE_ARCHIVE"), "Tam GİB checklist evidence archive fazı taşımalıdır.");
assert(items.some((item) => item.phase === "FINAL_READINESS"), "Tam GİB checklist final readiness fazı taşımalıdır.");

for (const item of items) {
  assert(item.label.trim().length > 0, `${item.key} Tam GİB checklist maddesi kullanıcıya açık etiket taşımalıdır.`);
  assert(item.requiredEvidence.length > 0, `${item.key} Tam GİB checklist maddesi kanıt alanı taşımalıdır.`);
  assert(item.requiredEvidence.every((field) => field.trim().length > 0), `${item.key} Tam GİB checklist maddesi boş kanıt alanı taşımamalıdır.`);
}

const productionEnv = items.find((item) => item.key === "FULL_GIB_PRODUCTION_ENV_CONFIGURED");
assert(Boolean(productionEnv), "Production env Tam GİB checklist maddesi bulunmalıdır.");
assert(productionEnv!.requiredEvidence.includes("EDOCUMENT_PROVIDER_MODE"), "Production env maddesi provider mode kanıtını istemelidir.");
assert(productionEnv!.requiredEvidence.includes("credentialRotationOwner"), "Production env maddesi credential sorumlusunu istemelidir.");

const invoiceTest = items.find((item) => item.key === "FULL_GIB_REAL_PROVIDER_INVOICE_DISPATCH_TESTED");
assert(Boolean(invoiceTest), "E-fatura provider test maddesi bulunmalıdır.");
assert(invoiceTest!.requiredEvidence.includes("providerReference"), "E-fatura provider test maddesi provider reference kanıtını istemelidir.");

const despatchTest = items.find((item) => item.key === "FULL_GIB_REAL_PROVIDER_DESPATCH_TESTED");
assert(Boolean(despatchTest), "E-irsaliye provider test maddesi bulunmalıdır.");
assert(despatchTest!.requiredEvidence.includes("xmlHash"), "E-irsaliye provider test maddesi XML hash kanıtını istemelidir.");

const webhookTest = items.find((item) => item.key === "FULL_GIB_REAL_PROVIDER_WEBHOOK_TESTED");
assert(Boolean(webhookTest), "Webhook provider test maddesi bulunmalıdır.");
assert(webhookTest!.requiredEvidence.includes("rawBodyHash"), "Webhook provider test maddesi rawBodyHash kanıtını istemelidir.");
assert(webhookTest!.requiredEvidence.includes("providerOutcome"), "Webhook provider test maddesi provider outcome kanıtını istemelidir.");

const edgeCases = items.find((item) => item.key === "FULL_GIB_REAL_PROVIDER_ERROR_CASES_TESTED");
assert(Boolean(edgeCases), "Provider edge case maddesi bulunmalıdır.");
assert(edgeCases!.requiredEvidence.includes("cancelledOutcome"), "Provider edge case maddesi iptal outcome kanıtını istemelidir.");
assert(edgeCases!.requiredEvidence.includes("returnedOutcome"), "Provider edge case maddesi iade outcome kanıtını istemelidir.");
assert(edgeCases!.requiredEvidence.includes("idempotencyKey"), "Provider edge case maddesi idempotency kanıtını istemelidir.");

const readiness = items.find((item) => item.key === "FULL_GIB_DEPLOYMENT_READINESS_READY");
assert(Boolean(readiness), "Final readiness maddesi bulunmalıdır.");
assert(readiness!.requiredEvidence.includes("readinessReportHash"), "Final readiness maddesi readiness report hash kanıtını istemelidir.");
assert(readiness!.requiredEvidence.includes("rollbackPlanReference"), "Final readiness maddesi rollback referansı kanıtını istemelidir.");

console.log("Tam GİB canlı geçiş checklist doğrulaması geçti.");
