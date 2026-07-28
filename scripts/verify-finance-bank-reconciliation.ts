import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseBankStatementCsv } from "@/modules/finance/services/bank-statement-csv.parser";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/bank-reconciliation.service.ts");
const repository = readRepo("src/modules/finance/repositories/bank-reconciliation.repository.ts");
const migration = readRepo("prisma/migrations/20260728120000_add_bank_reconciliation/migration.sql");
const importsRoute = readRepo("src/app/api/admin/finance/bank-reconciliation/imports/route.ts");
const matchRoute = readRepo("src/app/api/admin/finance/bank-reconciliation/match/route.ts");
const confirmRoute = readRepo("src/app/api/admin/finance/bank-reconciliation/confirm/route.ts");
const page = readRepo("src/app/[locale]/admin/(panel)/finance/bank-cash/[id]/reconciliation/page.tsx");

assert(service.includes("bankReconciliationRepository"), "Mutabakat servisi repository omurgasını kullanmalıdır.");
assert(service.includes("parseBankStatementCsv"), "Mutabakat servisi CSV parser kullanmalıdır.");
assert(service.includes("cashTransactionsService.createTransaction"), "Onay akışı finans hareketi servisini kullanmalıdır.");
assert(!service.includes("prisma."), "Mutabakat servisi doğrudan Prisma kullanmamalıdır.");

assert(repository.includes("createImport"), "Repository import oluşturma metodu içermelidir.");
assert(repository.includes("confirmMatch"), "Repository onay metodu içermelidir.");
assert(migration.includes("BankReconciliationMatch_cashTransactionId_key"), "Migration cashTransaction benzersiz eşleşmesi içermelidir.");

assert(service.includes("autoConfirmHighConfidenceMatches"), "Mutabakat servisi otomatik yüksek güven onayı desteklemelidir.");
assert(service.includes("getReconciliationHub"), "Mutabakat servisi hub listesi sunmalıdır.");
assert(importsRoute.includes("autoConfirmHighConfidence"), "Import route otomatik onay bayrağını iletmelidir.");

const hubPage = readRepo("src/app/[locale]/admin/(panel)/finance/bank-reconciliation/page.tsx");
assert(hubPage.includes("bankReconciliationService.getReconciliationHub"), "Mutabakat hub sayfası servis kullanmalıdır.");
assert(importsRoute.includes("auditLogService.recordFromRequest"), "Import route audit kaydı yapmalıdır.");
assert(matchRoute.includes("bankReconciliationService.assignMatch"), "Match route servis kullanmalıdır.");
assert(confirmRoute.includes("bankReconciliationService.confirmMatch"), "Confirm route servis kullanmalıdır.");
assert(confirmRoute.includes("auditLogService.recordFromRequest"), "Confirm route audit kaydı yapmalıdır.");
assert(!importsRoute.includes("prisma."), "Import route doğrudan Prisma kullanmamalıdır.");

assert(page.includes("bankReconciliationService.getWorkspace"), "Mutabakat sayfası servis kullanmalıdır.");
assert(page.includes("BankReconciliationManager"), "Mutabakat sayfası UI yöneticisini kullanmalıdır.");

const parsed = parseBankStatementCsv("Tarih,Açıklama,Tutar,Bakiye\n01.07.2026,Test Havale,\"1.250,50\",5000");
assert(parsed.lines.length === 1, "Parser tek satır okumalıdır.");
assert(parsed.lines[0].amount === 1250.5, "Parser tutarı doğru ayrıştırmalıdır.");
assert(parsed.lines[0].signedAmount === 1250.5, "Parser işaretli tutarı korumalıdır.");

console.log("verify-finance-bank-reconciliation: ok");
