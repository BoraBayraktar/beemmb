import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const reportsService = readRepo("src/modules/finance/services/reports.service.ts");
const reportsHub = readRepo("src/app/[locale]/admin/(panel)/finance/reports/page.tsx");
const agingPage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/aging/page.tsx");
const cashflowPage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/cashflow/page.tsx");
const stockValuePage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/stock-value/page.tsx");
const performancePage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/performance/page.tsx");
const incomeExpensePage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/income-expense/page.tsx");

assert(reportsService.includes("resolveFinanceReportsCopy"), "Rapor servisi i18n copy resolver kullanmalıdır.");
assert(!reportsService.includes("prisma."), "Rapor servisi doğrudan Prisma kullanmamalıdır.");
assert(!reportsService.includes('"Yaşlandırma raporu"'), "Rapor servisi sabit Türkçe metin içermemelidir.");
assert(reportsService.includes("payablesService"), "Yaşlandırma raporu payables servis omurgasını kullanmalıdır.");
assert(reportsService.includes("receivablesService"), "Rapor servisi receivables servis omurgasını kullanmalıdır.");
assert(reportsService.includes("catalogAdminService"), "Stok değer raporu katalog servis omurgasını kullanmalıdır.");
assert(reportsService.includes("async getAgingReport"), "getAgingReport tanımlı olmalıdır.");
assert(reportsService.includes("async getCashflowReport"), "getCashflowReport tanımlı olmalıdır.");
assert(reportsService.includes("async getStockValueReport"), "getStockValueReport tanımlı olmalıdır.");
assert(reportsService.includes("async getCollectionPaymentPerformanceReport"), "Performans raporu metodu tanımlı olmalıdır.");
assert(reportsService.includes("async getIncomeExpenseReport"), "Gelir-gider raporu metodu tanımlı olmalıdır.");
assert(reportsService.includes("/admin/finance/reports/aging"), "Hub kartları aging route'unu içermelidir.");
assert(reportsService.includes("/admin/finance/reports/cashflow"), "Hub kartları cashflow route'unu içermelidir.");
assert(reportsService.includes("/admin/finance/reports/stock-value"), "Hub kartları stock-value route'unu içermelidir.");
assert(reportsService.includes("/admin/finance/reports/performance"), "Hub kartları performance route'unu içermelidir.");
assert(reportsService.includes("/admin/finance/reports/income-expense"), "Hub kartları income-expense route'unu içermelidir.");
assert(reportsService.includes("/admin/finance/reports/bank-cash"), "Hub kartları bank-cash route'unu içermelidir.");
assert(reportsService.includes("async getBankCashMovementReport"), "Kasa-banka raporu metodu tanımlı olmalıdır.");
assert(reportsService.includes("async getVatSummaryReport"), "KDV özeti raporu metodu tanımlı olmalıdır.");
assert(reportsService.includes("/admin/finance/reports/vat-summary"), "Hub kartları vat-summary route'unu içermelidir.");

const bankCashPage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/bank-cash/page.tsx");
const vatSummaryPage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/vat-summary/page.tsx");
assert(bankCashPage.includes("reportsService.getBankCashMovementReport"), "Kasa-banka sayfası reports servisini kullanmalıdır.");
assert(vatSummaryPage.includes("reportsService.getVatSummaryReport"), "KDV özeti sayfası reports servisini kullanmalıdır.");

assert(reportsHub.includes("reportsService.getOverview"), "Rapor hub sayfası overview servisini kullanmalıdır.");
assert(!reportsHub.includes("prisma."), "Rapor hub sayfası doğrudan Prisma kullanmamalıdır.");

assert(agingPage.includes("reportsService.getAgingReport"), "Aging sayfası reports servisini kullanmalıdır.");
assert(agingPage.includes("parseFinanceReportDateRangeQuery"), "Aging sayfası tarih aralığı parse etmelidir.");
assert(cashflowPage.includes("reportsService.getCashflowReport"), "Cashflow sayfası reports servisini kullanmalıdır.");
assert(cashflowPage.includes("parseFinanceReportDateRangeQuery"), "Cashflow sayfası tarih aralığı parse etmelidir.");
assert(stockValuePage.includes("reportsService.getStockValueReport"), "Stok değer sayfası reports servisini kullanmalıdır.");
assert(performancePage.includes("reportsService.getCollectionPaymentPerformanceReport"), "Performans sayfası reports servisini kullanmalıdır.");

for (const [name, source] of [
  ["aging", agingPage],
  ["cashflow", cashflowPage],
  ["income-expense", incomeExpensePage],
  ["bank-cash", bankCashPage],
  ["vat-summary", vatSummaryPage],
] as const) {
  assert(!source.includes("prisma."), `${name} rapor sayfası doğrudan Prisma kullanmamalıdır.`);
  assert(source.includes("FinanceReportPageShell"), `${name} rapor sayfası tarih aralığı kabuğunu kullanmalıdır.`);
}

for (const [name, source] of [
  ["stock-value", stockValuePage],
  ["performance", performancePage],
] as const) {
  assert(!source.includes("prisma."), `${name} rapor sayfası doğrudan Prisma kullanmamalıdır.`);
  assert(source.includes("FinanceReportDetailManager"), `${name} rapor sayfası ortak detay bileşenini kullanmalıdır.`);
}

console.log("verify-finance-reports: ok");
