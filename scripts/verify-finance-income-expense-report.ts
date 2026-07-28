import { readFileSync } from "node:fs";
import { join } from "node:path";

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
const cashTransactionsService = readRepo("src/modules/finance/services/cash-transactions.service.ts");
const financeRepository = readRepo("src/modules/finance/repositories/finance.repository.ts");
const incomeExpensePage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/income-expense/page.tsx");
const dateRangeContract = readRepo("src/modules/finance/contracts/finance-report-date-range.contract.ts");
const dateRangeUtil = readRepo("src/modules/finance/services/finance-report-date-range.util.ts");

assert(reportsService.includes("async getIncomeExpenseReport"), "getIncomeExpenseReport tanımlı olmalıdır.");
assert(reportsService.includes("cashTransactionsService.listTransactionsForIncomeExpenseReport"), "Gelir-gider raporu nakit hareket servis omurgasını kullanmalıdır.");
assert(reportsService.includes("parseFinanceReportDateRangeQuery"), "Gelir-gider raporu tarih aralığı util kullanmalıdır.");
assert(reportsService.includes("/admin/finance/reports/income-expense"), "Hub kartı income-expense route'unu içermelidir.");
assert(!reportsService.includes("prisma."), "Rapor servisi doğrudan Prisma kullanmamalıdır.");

assert(cashTransactionsService.includes("listTransactionsForIncomeExpenseReport"), "Nakit hareket servisi gelir-gider listeleme metodu içermelidir.");
assert(cashTransactionsService.includes("financeRepository.listCashTransactionsForIncomeExpenseReport"), "Nakit hareket servisi repository omurgasını kullanmalıdır.");

assert(financeRepository.includes("listCashTransactionsForIncomeExpenseReport"), "Repository gelir-gider raporu listeleme metodu içermelidir.");
const incomeExpenseRepoMethod = financeRepository.slice(
  financeRepository.indexOf("listCashTransactionsForIncomeExpenseReport"),
  financeRepository.indexOf("async listCashTransactionsBySourceReferenceId"),
);
assert(!incomeExpenseRepoMethod.includes("take:"), "Gelir-gider raporu listelemesi take limiti kullanmamalıdır.");
assert(incomeExpenseRepoMethod.includes('status: "RECORDED"'), "Gelir-gider raporu yalnızca kayıtlı hareketleri içermelidir.");

assert(dateRangeContract.includes("AdminFinanceReportDateRangeQuery"), "Paylaşılan tarih aralığı sözleşmesi tanımlı olmalıdır.");
assert(dateRangeUtil.includes("resolveDefaultFinanceReportDateRange"), "Varsayılan ay tarih aralığı util içinde olmalıdır.");

assert(incomeExpensePage.includes("reportsService.getIncomeExpenseReport"), "Gelir-gider sayfası reports servisini kullanmalıdır.");
assert(incomeExpensePage.includes("FinanceReportDateRangeFilter"), "Gelir-gider sayfası tarih filtresi bileşenini kullanmalıdır.");
assert(incomeExpensePage.includes("FinanceReportDetailManager"), "Gelir-gider sayfası ortak detay bileşenini kullanmalıdır.");
assert(!incomeExpensePage.includes("prisma."), "Gelir-gider sayfası doğrudan Prisma kullanmamalıdır.");

const swapped = parseFinanceReportDateRangeQuery({ from: "2026-07-20", to: "2026-07-01" });
assert(swapped.fromIso === "2026-07-01" && swapped.toIso === "2026-07-20", "Ters tarih aralığı düzeltilmelidir.");

console.log("verify-finance-income-expense-report: ok");
