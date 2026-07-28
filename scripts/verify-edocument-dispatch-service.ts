import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertEDocumentProviderAdapter,
  buildDocumentDispatchIdempotencySuffix,
  buildDocumentStatusSyncIdempotencySuffix,
} from "@/modules/documents/services/document-dispatch.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, predicate: (error: unknown) => boolean, message: string) {
  try {
    action();
  } catch (error) {
    assert(predicate(error), message);
    return;
  }

  throw new Error(message);
}

assertEDocumentProviderAdapter("mock-edocs-provider");

const dispatchSuffix = buildDocumentDispatchIdempotencySuffix({
  providerCode: "live-edocs-provider",
  documentId: "document-1",
  xmlHash: "xml-hash",
});
assert(
  dispatchSuffix === buildDocumentDispatchIdempotencySuffix({
    providerCode: "live-edocs-provider",
    documentId: "document-1",
    xmlHash: "xml-hash",
  }),
  "Dispatch idempotency suffix aynı provider, belge ve XML hash için deterministik olmalıdır.",
);
assert(
  dispatchSuffix !== buildDocumentDispatchIdempotencySuffix({
    providerCode: "live-edocs-provider",
    documentId: "document-1",
    xmlHash: "xml-hash-revised",
  }),
  "Dispatch idempotency suffix XML hash değiştiğinde değişmelidir.",
);
assert(!dispatchSuffix.includes("Date"), "Dispatch idempotency suffix zaman bağımlı olmamalıdır.");

const statusSuffix = buildDocumentStatusSyncIdempotencySuffix({
  providerCode: "live-edocs-provider",
  documentId: "document-1",
  providerReference: "LIVE-REF-1",
});
assert(
  statusSuffix.startsWith("status-live-edocs-provider-document-1-LIVE-REF-1-"),
  "Status sync idempotency suffix provider referansını taşımalıdır.",
);
assert(statusSuffix.length <= 120, "Status sync idempotency suffix integration sınırını aşmamalıdır.");
assert(/^[A-Za-z0-9._-]+$/.test(statusSuffix), "Status sync idempotency suffix güvenli karakter seti taşımalıdır.");
assert(
  buildDocumentStatusSyncIdempotencySuffix({
    providerCode: "live-edocs-provider",
    documentId: "document-1",
    providerReference: null,
  }).startsWith("status-live-edocs-provider-document-1-no-reference-"),
  "Status sync idempotency suffix provider referansı yokken güvenli fallback taşımalıdır.",
);

const unsafeSuffix = buildDocumentStatusSyncIdempotencySuffix({
  providerCode: "live/edocs provider",
  documentId: "document:1",
  providerReference: "LIVE REF / ÇOK UZUN REFERANS ".repeat(10),
});
assert(unsafeSuffix.length <= 120, "Idempotency suffix uzun provider referanslarında 120 karakter sınırını aşmamalıdır.");
assert(/^[A-Za-z0-9._-]+$/.test(unsafeSuffix), "Idempotency suffix güvenli olmayan karakterleri normalize etmelidir.");

const maxBudgetSuffix = buildDocumentDispatchIdempotencySuffix({
  providerCode: "provider".repeat(20),
  documentId: "document".repeat(20),
  xmlHash: "xmlhash".repeat(20),
});
assert(maxBudgetSuffix.length <= 120, "Dispatch idempotency suffix tüm parçalar uzun olduğunda 120 karakter sınırını aşmamalıdır.");
assert(/^[A-Za-z0-9._-]+$/.test(maxBudgetSuffix), "Dispatch idempotency suffix güvenli karakter seti taşımalıdır.");

const dispatchServiceSource = readFileSync(join(process.cwd(), "src/modules/documents/services/document-dispatch.service.ts"), "utf8");
assert(
  dispatchServiceSource.includes("idempotencyKey: queuedJob.idempotencyKey"),
  "Dispatch lifecycle metadata integration idempotency key değerini taşımalıdır.",
);
assert(
  dispatchServiceSource.includes("idempotencyKey: queuedJob?.idempotencyKey ?? null"),
  "Status sync lifecycle metadata integration idempotency key değerini taşımalıdır.",
);
assert(
  dispatchServiceSource.includes("deduplicated: dispatchResult.deduplicated > 0"),
  "Lifecycle metadata idempotent tekrar gönderim bilgisini taşımalıdır.",
);

expectThrows(
  () => assertEDocumentProviderAdapter("missing-provider"),
  (error) => error instanceof DocumentAdminError && error.status === 400 && error.message.includes("missing-provider"),
  "Dispatch service bilinmeyen e-belge provider adapter değerini kuyruk öncesinde kullanıcı hatasına çevirmelidir.",
);

console.log("E-belge dispatch service doğrulaması geçti.");
