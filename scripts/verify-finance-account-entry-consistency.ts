import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertBalancedEntryLines,
  buildCollectionEntryLines,
  buildPaymentEntryLines,
  buildBusinessDocumentEntryLines,
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
const repository = readRepo("src/modules/finance/repositories/finance-account-entry.repository.ts");
const migration = readRepo("prisma/migrations/20260728200000_add_finance_account_entry/migration.sql");
const listRoute = readRepo("src/app/api/admin/finance/account-entries/route.ts");
const backfillRoute = readRepo("src/app/api/admin/finance/account-entries/backfill/route.ts");
const collectionsService = readRepo("src/modules/finance/services/collections.service.ts");
const page = readRepo("src/app/[locale]/admin/(panel)/finance/ledger-entries/page.tsx");

assert(service.includes("financeAccountEntryRepository"), "Defter servisi repository kullanmalıdır.");
assert(service.includes("assertBalancedEntryLines"), "Defter servisi borç/alacak dengesi kontrol etmelidir.");
assert(!service.includes("prisma."), "Defter servisi doğrudan Prisma kullanmamalıdır.");

assert(repository.includes("skipDuplicates: true"), "Defter repository idempotent satır eklemelidir.");
assert(migration.includes("FinanceAccountEntry_lineKey_key"), "Migration lineKey benzersiz olmalıdır.");
assert(migration.includes("'120'"), "Migration hesap planı seed içermelidir.");

assert(listRoute.includes("financeAccountEntryService.listLedgerEntries"), "Liste route servis kullanmalıdır.");
assert(backfillRoute.includes("financeAccountEntryService.backfillRecentEntries"), "Backfill route servis kullanmalıdır.");
assert(backfillRoute.includes("finance.manage"), "Backfill route finance.manage istemelidir.");

assert(collectionsService.includes("financeAccountEntryService.syncFromCollectionRecord"), "Tahsilat servisi defter write-through tetiklemelidir.");
assert(collectionsService.includes("PF8 defter projeksiyonu"), "Tahsilat defter hatası operasyonu kırmamalıdır.");

assert(page.includes("financeAccountEntryService.listLedgerEntries"), "Defter sayfası servis kullanmalıdır.");

const collectionLines = buildCollectionEntryLines({ collectionRecordId: "c1", amount: 100, financialAccountType: "BANK" });
assertBalancedEntryLines(collectionLines);
assert(collectionLines.length === 2, "Tahsilat iki satır üretmelidir.");

assert(service.includes("syncFromBusinessDocument"), "Defter servisi belge senkronu içermelidir.");

const documentLines = buildBusinessDocumentEntryLines({
  documentId: "d1",
  documentNumber: "ALIS-1",
  documentType: "PURCHASE_DOCUMENT",
  lines: [{ id: "l1", productName: "Mal", lineTotal: 200 }],
});
assertBalancedEntryLines(documentLines);

const paymentLines = buildPaymentEntryLines({ paymentRecordId: "p1", amount: 50, financialAccountType: "CASH" });
assertBalancedEntryLines(paymentLines);

let rejected = false;
try {
  assertBalancedEntryLines([
    { lineKey: "x", ledgerAccountCode: "100", side: "DEBIT", amount: 10, title: "a" },
    { lineKey: "y", ledgerAccountCode: "600", side: "CREDIT", amount: 9, title: "b" },
  ]);
} catch {
  rejected = true;
}
assert(rejected, "Dengesiz satırlar reddedilmelidir.");

console.log("verify-finance-account-entry-consistency: ok");
