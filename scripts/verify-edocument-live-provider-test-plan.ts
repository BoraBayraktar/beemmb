import { liveProviderTestPlanService } from "@/modules/edocument/services/live-provider-test-plan.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const scenarios = liveProviderTestPlanService.listRequiredScenarios();
const keys = scenarios.map((scenario) => scenario.key);

for (const expectedKey of [
  "OUTBOUND_INVOICE_ACCEPTED",
  "OUTBOUND_DESPATCH_ACCEPTED",
  "STATUS_SYNC_SENT",
  "WEBHOOK_STATUS_RECEIVED",
  "PROVIDER_VALIDATION_ERROR",
  "IDEMPOTENT_RESEND",
  "CANCELLED_DOCUMENT_BLOCKED",
] as const) {
  assert(keys.includes(expectedKey), `${expectedKey} canlı provider test senaryosu tanımlı olmalıdır.`);
}

assert(new Set(keys).size === keys.length, "Canlı provider test senaryosu anahtarları tekil olmalıdır.");

for (const scenario of scenarios) {
  assert(scenario.label.trim().length > 0, `${scenario.key} senaryosu kullanıcıya açık etiket taşımalıdır.`);
  assert(scenario.requiredEvidence.length > 0, `${scenario.key} senaryosu kanıt alanı listesi taşımalıdır.`);
  assert(
    scenario.requiredEvidence.every((item) => item.trim().length > 0),
    `${scenario.key} senaryosu boş kanıt alanı taşımamalıdır.`,
  );
}

const webhookScenario = scenarios.find((scenario) => scenario.key === "WEBHOOK_STATUS_RECEIVED");
if (!webhookScenario) {
  throw new Error("Webhook test senaryosu bulunmalıdır.");
}

assert(webhookScenario.requiredEvidence.includes("rawBodyHash"), "Webhook test senaryosu ham body yerine hash kanıtı istemelidir.");
assert(webhookScenario.requiredEvidence.includes("signaturePresent"), "Webhook test senaryosu imza değerini değil imza varlığını istemelidir.");

console.log("E-belge canlı provider test planı doğrulaması geçti.");
