import type { EDocumentLiveProviderContractSectionKey } from "@/modules/edocument/contracts/edocument-provider.contract";
import { liveProviderContractService } from "@/modules/edocument/services/live-provider-contract.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sections = liveProviderContractService.listSections();
const keys = sections.map((section) => section.key);

const requiredKeys: EDocumentLiveProviderContractSectionKey[] = [
  "PROVIDER_IDENTITY",
  "AUTHENTICATION",
  "OUTBOUND_INVOICE",
  "OUTBOUND_DESPATCH",
  "STATUS_QUERY",
  "WEBHOOK",
  "ERROR_MAPPING",
  "RETRY_TIMEOUT",
  "SECURITY_EVIDENCE",
];

for (const key of requiredKeys) {
  assert(keys.includes(key), `${key} canlı provider sözleşme bölümü tanımlı olmalıdır.`);
}

for (const section of sections) {
  assert(section.requiredInputs.length > 0, `${section.key} sözleşme bölümü zorunlu input listesi taşımalıdır.`);
  assert(section.implementationNotes.length > 0, `${section.key} sözleşme bölümü implementasyon notu taşımalıdır.`);
  assert(section.evidenceFields.length > 0, `${section.key} sözleşme bölümü evidence alanı taşımalıdır.`);
}

const authSection = sections.find((section) => section.key === "AUTHENTICATION");
assert(Boolean(authSection), "AUTHENTICATION sözleşme bölümü bulunmalıdır.");
assert(
  authSection!.implementationNotes.some((note) => note.includes("ham yazılmamalıdır")),
  "Authentication sözleşmesi secret değerlerinin audit/evidence içine ham yazılmamasını şart koşmalıdır.",
);

const webhookSection = sections.find((section) => section.key === "WEBHOOK");
assert(Boolean(webhookSection), "WEBHOOK sözleşme bölümü bulunmalıdır.");
assert(webhookSection!.requiredInputs.includes("signatureAlgorithm"), "Webhook sözleşmesi imza algoritmasını zorunlu input olarak istemelidir.");
assert(webhookSection!.evidenceFields.includes("rawBodyHash"), "Webhook sözleşmesi ham body yerine rawBodyHash kanıtını istemelidir.");

const retrySection = sections.find((section) => section.key === "RETRY_TIMEOUT");
assert(Boolean(retrySection), "RETRY_TIMEOUT sözleşme bölümü bulunmalıdır.");
assert(retrySection!.evidenceFields.includes("idempotencyKey"), "Retry sözleşmesi idempotencyKey kanıtını istemelidir.");

console.log("E-belge canlı provider sözleşme doğrulaması geçti.");
