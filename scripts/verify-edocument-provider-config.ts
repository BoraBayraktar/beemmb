import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertActiveDocumentProviderAdapter, DocumentAdminError, getDocumentProviderAdapterStatus } from "@/modules/documents/services/document.service";

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

assertActiveDocumentProviderAdapter({ providerCode: "mock-edocs-provider", isActive: true });
assertActiveDocumentProviderAdapter({ providerCode: "live-edocs-provider", isActive: true });
assertActiveDocumentProviderAdapter({ providerCode: "future-live-provider", isActive: false });

const mockAdapterStatus = getDocumentProviderAdapterStatus("mock-edocs-provider");
assert(mockAdapterStatus.registered, "Mock provider adapter kayıtlı görünmelidir.");
assert(mockAdapterStatus.configured, "Mock provider adapter konfigüre görünmelidir.");
assert(mockAdapterStatus.operational, "Mock provider adapter operasyonel görünmelidir.");

const missingAdapterStatus = getDocumentProviderAdapterStatus("missing-provider");
assert(!missingAdapterStatus.registered, "Bilinmeyen provider adapter kayıtlı görünmemelidir.");
assert(!missingAdapterStatus.configured, "Bilinmeyen provider adapter konfigüre görünmemelidir.");
assert(!missingAdapterStatus.operational, "Bilinmeyen provider adapter operasyonel görünmemelidir.");

expectThrows(
  () => assertActiveDocumentProviderAdapter({ providerCode: "missing-provider", isActive: true }),
  (error) => error instanceof DocumentAdminError && error.status === 400 && error.message.includes("missing-provider"),
  "Aktif belge sağlayıcı kaydı bilinmeyen e-belge provider adapter değerini kabul etmemelidir.",
);

const documentServiceSource = readFileSync(join(process.cwd(), "src/modules/documents/services/document.service.ts"), "utf8");
const selectedProviderGuardCount = (documentServiceSource.match(/assertActiveDocumentProviderAdapter\(\{\n\s+providerCode: provider\.providerCode,\n\s+isActive: provider\.isActive,\n\s+\}\);/g) ?? []).length;
assert(
  selectedProviderGuardCount >= 2,
  "Belge create/update akışları seçilen aktif provider için kayıtlı adapter guard çalıştırmalıdır.",
);

console.log("E-belge provider config doğrulaması geçti.");
