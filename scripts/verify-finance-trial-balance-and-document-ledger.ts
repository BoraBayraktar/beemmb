import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertBalancedEntryLines,
  buildBusinessDocumentEntryLines,
  buildCollectionEntryLines,
} from "@/modules/finance/services/finance-account-entry-mapping.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/finance-account-entry.service.ts");
const trialBalance = readRepo("src/modules/finance/services/finance-trial-balance.service.ts");
const migration = readRepo("prisma/migrations/20260728210000_pf8_tdhp_expand_business_document_source/migration.sql");
const documentService = readRepo("src/modules/documents/services/document.service.ts");
const trialBalancePage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/trial-balance/page.tsx");

assert(service.includes("syncFromBusinessDocument"), "Defter servisi belge write-through içermelidir.");
assert(service.includes("BUSINESS_DOCUMENT"), "Defter servisi BUSINESS_DOCUMENT kaynağını desteklemelidir.");
assert(trialBalance.includes("financeAccountEntryRepository"), "Mizan servisi defter repository kullanmalıdır.");
assert(migration.includes("BUSINESS_DOCUMENT"), "Migration BUSINESS_DOCUMENT enum değerini eklemelidir.");
assert(migration.includes("'153'"), "Migration genişletilmiş TDHP seed içermelidir.");
assert(documentService.includes("syncFromBusinessDocument"), "Belge güncelleme ISSUED sonrası defter senkronu tetiklemelidir.");
assert(trialBalancePage.includes("getTrialBalanceReport"), "Mizan rapor sayfası reports servisini kullanmalıdır.");

const documentLines = buildBusinessDocumentEntryLines({
  documentId: "doc-1",
  documentNumber: "FAT-1",
  documentType: "E_INVOICE",
  lines: [{ id: "line-1", productName: "Ürün", lineTotal: 100 }],
});
assertBalancedEntryLines(documentLines);
assert(documentLines.length === 2, "Belge satırı çift tarafli kayıt üretmelidir.");

const collectionLines = buildCollectionEntryLines({ collectionRecordId: "c1", amount: 100, financialAccountType: "BANK" });
assertBalancedEntryLines(collectionLines);

console.log("verify-finance-trial-balance-and-document-ledger: ok");
