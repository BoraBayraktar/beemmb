import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepoFile(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const collectionRoute = readRepoFile("src/app/api/admin/finance/collections/route.ts");
const paymentRoute = readRepoFile("src/app/api/admin/finance/payments/route.ts");
const allocationRoute = readRepoFile("src/app/api/admin/finance/allocations/replace/route.ts");

assert(collectionRoute.includes("auditLogService.recordFromRequest"), "Tahsilat API audit kaydı yazmalıdır.");
assert(collectionRoute.includes('"FINANCE_COLLECTION"'), "Tahsilat audit entity tipi FINANCE_COLLECTION olmalıdır.");

assert(paymentRoute.includes("auditLogService.recordFromRequest"), "Ödeme API audit kaydı yazmalıdır.");
assert(paymentRoute.includes('"FINANCE_PAYMENT"'), "Ödeme audit entity tipi FINANCE_PAYMENT olmalıdır.");

assert(allocationRoute.includes("auditLogService.recordFromRequest"), "Manuel eşleştirme API audit kaydı yazmalıdır.");

console.log("verify-finance-audit-wiring: ok");
