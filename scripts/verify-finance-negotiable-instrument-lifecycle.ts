import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  listAllowedNegotiableInstrumentActions,
  requiresFinancialAccountForLifecycleAction,
  resolveNegotiableInstrumentNextStatus,
} from "@/modules/finance/services/negotiable-instrument-lifecycle.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/negotiable-instrument.service.ts");
const repository = readRepo("src/modules/finance/repositories/negotiable-instrument.repository.ts");
const migration = readRepo("prisma/migrations/20260728140000_add_negotiable_instruments/migration.sql");
const createRoute = readRepo("src/app/api/admin/finance/negotiable-instruments/route.ts");
const lifecycleRoute = readRepo("src/app/api/admin/finance/negotiable-instruments/lifecycle/route.ts");
const listPage = readRepo("src/app/[locale]/admin/(panel)/finance/instruments/page.tsx");
const detailPage = readRepo("src/app/[locale]/admin/(panel)/finance/instruments/[instrumentId]/page.tsx");

assert(service.includes("negotiableInstrumentRepository"), "Çek/senet servisi repository omurgasını kullanmalıdır.");
assert(service.includes("completeLifecycleWithCashTransaction"), "Tahsil/ödeme nakit hareketi repository transaction ile oluşturulmalıdır.");
assert(service.includes("resolveNegotiableInstrumentNextStatus"), "Durum geçişleri lifecycle util üzerinden yapılmalıdır.");
assert(!service.includes("prisma."), "Çek/senet servisi doğrudan Prisma kullanmamalıdır.");

assert(repository.includes("completeLifecycleWithCashTransaction"), "Repository lifecycle + cash transaction metodu içermelidir.");
assert(migration.includes("NegotiableInstrument_cashTransactionId_key"), "Migration cashTransaction benzersiz bağlantısı içermelidir.");

assert(createRoute.includes("negotiableInstrumentService.createInstrument"), "Create route servis kullanmalıdır.");
assert(createRoute.includes("auditLogService.recordFromRequest"), "Create route audit kaydı yapmalıdır.");
assert(lifecycleRoute.includes("negotiableInstrumentService.applyLifecycle"), "Lifecycle route servis kullanmalıdır.");
assert(lifecycleRoute.includes("auditLogService.recordFromRequest"), "Lifecycle route audit kaydı yapmalıdır.");

assert(listPage.includes("negotiableInstrumentService.listInstruments"), "Liste sayfası servis kullanmalıdır.");
assert(detailPage.includes("negotiableInstrumentService.getInstrumentDetail"), "Detay sayfası servis kullanmalıdır.");
assert(listPage.includes("NegotiableInstrumentsManager"), "Liste sayfası UI yöneticisini kullanmalıdır.");

assert(
  resolveNegotiableInstrumentNextStatus({ direction: "RECEIVABLE", currentStatus: "PORTFOLIO", action: "collect" }) === "COLLECTED",
  "Alacak tahsilat geçişi COLLECTED olmalıdır.",
);
assert(
  resolveNegotiableInstrumentNextStatus({ direction: "PAYABLE", currentStatus: "PORTFOLIO", action: "pay" }) === "PAID",
  "Borç ödeme geçişi PAID olmalıdır.",
);
assert(
  listAllowedNegotiableInstrumentActions({ direction: "RECEIVABLE", status: "PORTFOLIO" }).includes("collect"),
  "Portföy alacağı tahsil aksiyonu içermelidir.",
);
assert(requiresFinancialAccountForLifecycleAction("collect"), "Tahsilat finans hesabı gerektirmelidir.");
assert(!requiresFinancialAccountForLifecycleAction("bounce"), "Karşılıksız finans hesabı gerektirmemelidir.");

let rejected = false;
try {
  resolveNegotiableInstrumentNextStatus({ direction: "PAYABLE", currentStatus: "PORTFOLIO", action: "collect" });
} catch {
  rejected = true;
}
assert(rejected, "Borç kaydında tahsilat geçişi reddedilmelidir.");

console.log("verify-finance-negotiable-instrument-lifecycle: ok");
