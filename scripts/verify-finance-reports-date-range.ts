import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFinanceReportTableCsv } from "@/modules/finance/services/finance-report-export.service";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const reportsService = readRepo("src/modules/finance/services/reports.service.ts");
const exportService = readRepo("src/modules/finance/services/finance-report-export.service.ts");
const exportRoute = readRepo("src/app/api/admin/finance/reports/[reportKey]/export/route.ts");
const dateRangeFilter = readRepo("src/ui/admin/finance-report-date-range-filter.tsx");
const reportShell = readRepo("src/ui/admin/finance-report-page-shell.tsx");

const datedPages = [
  "src/app/[locale]/admin/(panel)/finance/reports/cashflow/page.tsx",
  "src/app/[locale]/admin/(panel)/finance/reports/aging/page.tsx",
  "src/app/[locale]/admin/(panel)/finance/reports/income-expense/page.tsx",
  "src/app/[locale]/admin/(panel)/finance/reports/bank-cash/page.tsx",
  "src/app/[locale]/admin/(panel)/finance/reports/vat-summary/page.tsx",
] as const;

assert(reportsService.includes("async getCashflowReport("), "Cashflow raporu tarih aralığı parametresi almalıdır.");
assert(reportsService.includes("async getAgingReport("), "Aging raporu tarih aralığı parametresi almalıdır.");
assert(reportsService.includes("async getBankCashMovementReport"), "Kasa-banka raporu tanımlı olmalıdır.");
assert(reportsService.includes("loadReportPeriodTransactions"), "Rapor servisi dönem nakit hareket yükleyicisi kullanmalıdır.");
assert(reportsService.includes("isInstantInFinanceReportRange"), "Aging/cashflow belge filtresi tarih util kullanmalıdır.");
assert(reportsService.includes("/admin/finance/reports/bank-cash"), "Hub kasa-banka rapor kartını içermelidir.");

assert(exportService.includes("buildFinanceReportTableCsv"), "CSV üretimi export servisinde olmalıdır.");
assert(exportService.includes("reportsService.getBankCashMovementReport"), "Export servisi rapor servis omurgasını kullanmalıdır.");
assert(!exportService.includes("prisma."), "Export servisi doğrudan Prisma kullanmamalıdır.");

assert(exportRoute.includes("financeReportExportService.exportReportTableCsv"), "Export route servis adapter kullanmalıdır.");
assert(exportRoute.includes("finance.read"), "Export route finance.read izni istemelidir.");

assert(dateRangeFilter.includes("reportPath"), "Tarih filtresi rapor yolu parametresi almalıdır.");
assert(dateRangeFilter.includes("details"), "Mobil dönem filtresi accordion kullanmalıdır.");

assert(reportShell.includes("serverExportHref"), "Rapor sayfa kabuğu sunucu CSV bağlantısı üretmelidir.");

for (const pagePath of datedPages) {
  const page = readRepo(pagePath);
  assert(page.includes("parseFinanceReportDateRangeQuery"), `${pagePath} tarih aralığı parse etmelidir.`);
  assert(page.includes("FinanceReportPageShell"), `${pagePath} ortak rapor kabuğunu kullanmalıdır.`);
}

const csv = buildFinanceReportTableCsv({
  title: "Test",
  description: "Test",
  columns: [{ key: "a", label: "A" }],
  rows: [{ id: "1", cells: { a: "1" } }],
});
assert(csv.startsWith("\uFEFF"), "CSV UTF-8 BOM ile başlamalıdır.");

const swapped = parseFinanceReportDateRangeQuery({ from: "2026-07-25", to: "2026-07-01" });
assert(swapped.fromIso === "2026-07-01", "Ters tarih düzeltilmelidir.");

console.log("verify-finance-reports-date-range: ok");
