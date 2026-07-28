import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDictionary } from "@/lib/i18n";
import { resolveDocumentFinancePreviewCopy } from "@/modules/finance/services/document-finance-preview-copy.resolver";
import { resolveCounterpartyLedgerCopy } from "@/modules/finance/services/counterparty-ledger-copy.resolver";
import { resolveFinanceOverviewCopy } from "@/modules/finance/services/finance-overview-copy.resolver";
import { resolveFinanceReportsCopy } from "@/modules/finance/services/finance-reports-copy.resolver";
import { resolveFinanceServiceMessages } from "@/modules/finance/services/finance-service-messages.resolver";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractAdminKeys(source: string) {
  const keys = new Set<string>();
  const pattern = /admin\.(finance[A-Za-z0-9_]+)/g;

  for (const match of source.matchAll(pattern)) {
    keys.add(match[1]);
  }

  return keys;
}

const resolverSources = [
  readFileSync(join(process.cwd(), "src/modules/finance/services/bank-reconciliation-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/negotiable-instrument-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/finance-advisor-export-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/finance-ledger-entries-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/finance-reports-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/document-finance-preview-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/finance-overview-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/counterparty-ledger-copy.resolver.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/modules/finance/services/finance-service-messages.resolver.ts"), "utf8"),
];

const admin = getDictionary("tr").admin as Record<string, unknown>;

for (const source of resolverSources) {
  for (const key of extractAdminKeys(source)) {
    assert(typeof admin[key] === "string" && (admin[key] as string).length > 0, `tr.json admin.${key} tanımlı olmalıdır.`);
  }
}

const reportsCopy = resolveFinanceReportsCopy("tr");
assert(reportsCopy.aging.title.length > 0, "Finans rapor copy resolver çalışmalıdır.");

const previewCopy = resolveDocumentFinancePreviewCopy("tr");
assert(previewCopy.collectionTitle.length > 0, "Belge finans preview copy resolver çalışmalıdır.");

const overviewCopy = resolveFinanceOverviewCopy("tr");
assert(overviewCopy.metricOpenReceivableLabel.length > 0, "Finans overview copy resolver çalışmalıdır.");

const ledgerCopy = resolveCounterpartyLedgerCopy("tr");
assert(ledgerCopy.openReceivableBalanceLabel.length > 0, "Cari ekstre copy resolver çalışmalıdır.");

const serviceMessages = resolveFinanceServiceMessages("tr");
assert(serviceMessages.receivables.unlinkedCustomer.length > 0, "Finans servis mesajları resolver çalışmalıdır.");

const receivablesServiceSource = readFileSync(join(process.cwd(), "src/modules/finance/services/receivables.service.ts"), "utf8");
const allocationServiceSource = readFileSync(join(process.cwd(), "src/modules/finance/services/allocation.service.ts"), "utf8");
assert(receivablesServiceSource.includes("resolveFinanceServiceMessages"), "Alacaklar servisi mesaj resolver kullanmalıdır.");
assert(!receivablesServiceSource.includes("Merkezi müşteri kartı henüz bağlanmadı"), "Alacaklar servisi sabit fallback içermemelidir.");
assert(allocationServiceSource.includes("resolveFinanceServiceMessages"), "Eşleştirme servisi mesaj resolver kullanmalıdır.");
assert(!allocationServiceSource.includes('"Tahsilat kaydı bulunamadı."'), "Eşleştirme servisi sabit hata metni içermemelidir.");

const overviewService = readFileSync(join(process.cwd(), "src/modules/finance/services/finance-overview.service.ts"), "utf8");
const ledgerService = readFileSync(join(process.cwd(), "src/modules/finance/services/counterparty-ledger.service.ts"), "utf8");
assert(overviewService.includes("resolveFinanceOverviewCopy"), "Finans overview servisi copy resolver kullanmalıdır.");
assert(!overviewService.includes('"Açık alacak"'), "Finans overview servisi sabit Türkçe KPI etiketi içermemelidir.");
assert(ledgerService.includes("resolveCounterpartyLedgerCopy"), "Cari ekstre servisi copy resolver kullanmalıdır.");
assert(!ledgerService.includes('"Açık borç özeti"'), "Cari ekstre servisi sabit Türkçe özet etiketi içermemelidir.");

console.log("verify-finance-i18n-copy: ok");
