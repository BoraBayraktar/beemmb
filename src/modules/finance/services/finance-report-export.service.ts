import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import type { AdminFinanceReportTable } from "@/modules/finance/contracts/reports.contract";
import { reportsService } from "@/modules/finance/services/reports.service";

export type FinanceReportExportKey = "cashflow" | "aging" | "income-expense" | "bank-cash" | "vat-summary" | "trial-balance";

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

export function buildFinanceReportTableCsv(table: AdminFinanceReportTable) {
  const header = table.columns.map((column) => escapeCsvValue(column.label)).join(",");
  const rows = table.rows.map((row) => table.columns.map((column) => escapeCsvValue(row.cells[column.key] ?? "-")).join(","));
  return `\uFEFF${[header, ...rows].join("\n")}`;
}

function slugifyReportFilename(value: string) {
  return value.toLocaleLowerCase("tr-TR").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "finans-raporu";
}

export class FinanceReportExportService {
  async exportReportTableCsv(locale: string, reportKey: FinanceReportExportKey, query: AdminFinanceReportDateRangeQuery = {}) {
    const report = await this.loadReport(locale, reportKey, query);

    if (!report.table || report.table.rows.length === 0) {
      throw new Error("Dışa aktarılacak rapor satırı bulunamadı.");
    }

    const content = buildFinanceReportTableCsv(report.table);
    const filename = `${slugifyReportFilename(report.title)}-${reportKey}.csv`;

    return {
      content,
      filename,
      rowCount: report.table.rows.length,
    };
  }

  private async loadReport(locale: string, reportKey: FinanceReportExportKey, query: AdminFinanceReportDateRangeQuery) {
    switch (reportKey) {
      case "cashflow":
        return reportsService.getCashflowReport(locale, query);
      case "aging":
        return reportsService.getAgingReport(locale, query);
      case "income-expense":
        return reportsService.getIncomeExpenseReport(locale, query);
      case "bank-cash":
        return reportsService.getBankCashMovementReport(locale, query);
      case "vat-summary":
        return reportsService.getVatSummaryReport(locale, query);
      case "trial-balance":
        return reportsService.getTrialBalanceReport(locale, query);
      default: {
        const exhaustive: never = reportKey;
        throw new Error(`Desteklenmeyen rapor anahtarı: ${exhaustive}`);
      }
    }
  }
}

export const financeReportExportService = new FinanceReportExportService();
