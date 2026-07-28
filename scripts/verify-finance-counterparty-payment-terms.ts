import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveDocumentEffectiveDueDate,
  resolveEffectivePaymentTermDays,
} from "../src/modules/finance/services/finance-due-date.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

assert(resolveEffectivePaymentTermDays(null) === 30, "Boş cari vadesi global varsayılan olmalıdır.");
assert(resolveEffectivePaymentTermDays(14) === 14, "Cari varsayılan vade korunmalıdır.");
assert(
  resolveDocumentEffectiveDueDate("2026-01-01T00:00:00.000Z", null, 14).startsWith("2026-01-15"),
  "Belge vadesi cari varsayılan gün sayısından türetilmelidir.",
);

const customerContract = readRepo("src/modules/customers/contracts/customer-account.contract.ts");
const supplierContract = readRepo("src/modules/catalog/contracts/catalog-admin.contract.ts");
const termsService = readRepo("src/modules/finance/services/finance-counterparty-finance-terms.service.ts");
const receivablesService = readRepo("src/modules/finance/services/receivables.service.ts");
const paymentsService = readRepo("src/modules/finance/services/payments.service.ts");
const ledgerService = readRepo("src/modules/finance/services/counterparty-ledger.service.ts");
const migration = readRepo("prisma/migrations/20260727150000_add_counterparty_finance_fields/migration.sql");

assert(customerContract.includes("defaultPaymentTermDays"), "Müşteri contract varsayılan vade alanını içermelidir.");
assert(customerContract.includes("creditLimit"), "Müşteri contract kredi limiti alanını içermelidir.");
assert(supplierContract.includes("defaultPaymentTermDays"), "Tedarikçi contract varsayılan vade alanını içermelidir.");
assert(termsService.includes("getCustomerFinanceTerms"), "Finans cari vade servisi müşteri okuması içermelidir.");
assert(termsService.includes("getSupplierFinanceTerms"), "Finans cari vade servisi tedarikçi okuması içermelidir.");
assert(receivablesService.includes("counterpartyFinanceTerms"), "Alacak detayı cari finans koşullarını taşımalıdır.");
assert(paymentsService.includes("counterpartyFinanceTerms"), "Ödeme hazırlığı cari finans koşullarını taşımalıdır.");
assert(ledgerService.includes("financeTerms"), "Cari ekstre özeti finans koşullarını içermelidir.");
assert(migration.includes("defaultPaymentTermDays"), "Migration cari vade kolonlarını eklemelidir.");

console.log("verify-finance-counterparty-payment-terms: ok");
