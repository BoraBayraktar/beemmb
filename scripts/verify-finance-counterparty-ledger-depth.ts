import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  attachCounterpartyRunningBalances,
  resolveCounterpartySignedAmount,
} from "@/modules/finance/services/counterparty-ledger-running-balance.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/counterparty-ledger.service.ts");
const contract = readRepo("src/modules/finance/contracts/counterparty-ledger.contract.ts");
const ui = readRepo("src/ui/admin/counterparty-ledger-manager.tsx");

assert(service.includes("finalizeCounterpartyMovements"), "Cari ekstre running balance zenginleştirmesi yapılmalıdır.");
assert(service.includes("lastMovementAt"), "Cari özet son hareket tarihi içermelidir.");
assert(contract.includes("runningBalance"), "Cari ekstre contract running balance alanı içermelidir.");
assert(ui.includes("runningBalance"), "Cari ekstre UI bakiye sütunu göstermelidir.");

assert(resolveCounterpartySignedAmount("RECEIVABLE", 100, "customer") === 100, "Alacak hareketi müşteri bakiyesini artırmalıdır.");
assert(resolveCounterpartySignedAmount("COLLECTION", 40, "customer") === -40, "Tahsilat müşteri bakiyesini azaltmalıdır.");

const enriched = attachCounterpartyRunningBalances([
  { id: "a", occurredAt: "2026-07-01T10:00:00.000Z", signedAmount: 100 },
  { id: "b", occurredAt: "2026-07-02T10:00:00.000Z", signedAmount: -40 },
]);
assert(enriched.find((item) => item.id === "b")?.runningBalance === 60, "Running balance kronolojik birikim olmalıdır.");

console.log("verify-finance-counterparty-ledger-depth: ok");
