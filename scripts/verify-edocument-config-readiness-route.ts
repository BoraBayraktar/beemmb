import {
  buildEDocumentConfigReadinessHeaders,
  eDocumentConfigReadinessJson,
} from "@/app/api/admin/edocuments/config-readiness/route";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildEDocumentConfigReadinessHeaders();

assert(headers.get("cache-control") === "no-store", "E-belge readiness API response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "E-belge readiness API response MIME sniffing koruması taşımalıdır.");

const errorResponse = eDocumentConfigReadinessJson({ message: "Yetkisiz" }, { status: 403 });
assert(errorResponse.status === 403, "E-belge readiness error response status değerini korumalıdır.");
assert(errorResponse.headers.get("cache-control") === "no-store", "E-belge readiness error response cache içinde saklanmamalıdır.");

const successResponse = eDocumentConfigReadinessJson({
  report: {
    productionChecklist: [{
      key: "EVIDENCE_PACKAGE_EXPORTED",
      label: "Evidence package export alındı",
      requiredEvidence: ["packageHash", "xmlHash"],
    }],
    liveProviderTestScenarios: [{
      key: "WEBHOOK_STATUS_RECEIVED",
      label: "Provider webhook durum bildirimi işlendi",
      requiredEvidence: ["rawBodyHash", "signaturePresent"],
    }],
  },
});
assert(successResponse.status === 200, "E-belge readiness success response varsayılan 200 dönmelidir.");
assert(successResponse.headers.get("x-content-type-options") === "nosniff", "E-belge readiness success response MIME sniffing koruması taşımalıdır.");

console.log("E-belge config readiness route doğrulaması geçti.");
