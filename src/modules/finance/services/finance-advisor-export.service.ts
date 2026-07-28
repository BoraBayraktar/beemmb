import { z } from "zod";

import type {
  AdminFinanceAdvisorExportManifest,
  AdminFinanceAdvisorExportPackage,
  FinanceAdvisorExportFile,
  FinanceAdvisorExportFileKey,
} from "@/modules/finance/contracts/finance-advisor-export.contract";
import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import { buildFinanceAdvisorExportXml } from "@/modules/finance/services/finance-advisor-export-xml.util";
import { resolveFinanceAdvisorExportCopy } from "@/modules/finance/services/finance-advisor-export-copy.resolver";
import { financeAccountEntryRepository } from "@/modules/finance/repositories/finance-account-entry.repository";
import {
  buildLogoLucaJournalCsv,
  mapFinanceEntriesToLogoLucaRows,
} from "@/modules/finance/services/finance-logo-luca-export.util";
import { buildFinanceReportTableCsv } from "@/modules/finance/services/finance-report-export.service";
import { parseFinanceReportDateRangeQuery, formatFinanceReportDateRangeLabel } from "@/modules/finance/services/finance-report-date-range.util";
import { payablesService } from "@/modules/finance/services/payables.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { reportsService } from "@/modules/finance/services/reports.service";

const querySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  financialAccountId: z.string().trim().optional(),
});

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function buildCounterpartySummaryCsv(locale: string) {
  const copy = resolveFinanceAdvisorExportCopy(locale);

  return receivablesService
    .listOperationalReceivables({ page: 1, pageSize: 5000, locale })
    .then(async (receivables) => {
      const payables = await payablesService.listSupplierPayables({});
      const header = [
        copy.colCounterpartyType,
        copy.colCounterpartyName,
        copy.colCounterpartyKey,
        copy.colOpenAmount,
        copy.colCurrency,
      ]
        .map(escapeCsvValue)
        .join(",");

      const receivableRows = receivables.items.map((item) =>
        [
          copy.counterpartyTypeCustomer,
          item.counterpartyName,
          item.customerAccountSlug ?? item.orderId,
          item.totalAmount.toFixed(2),
          item.currency,
        ]
          .map((cell) => escapeCsvValue(String(cell)))
          .join(","),
      );

      const payableRows = payables.items.map((item) =>
        [
          copy.counterpartyTypeSupplier,
          item.supplierName,
          item.supplierSlug ?? item.supplierKey,
          item.totalAmount.toFixed(2),
          item.currency,
        ]
          .map((cell) => escapeCsvValue(String(cell)))
          .join(","),
      );

      return `\uFEFF${[header, ...receivableRows, ...payableRows].join("\n")}`;
    });
}

export class FinanceAdvisorExportService {
  private async buildManifest(locale: string, query: AdminFinanceReportDateRangeQuery): Promise<AdminFinanceAdvisorExportManifest> {
    const parsed = querySchema.parse(query);
    const range = parseFinanceReportDateRangeQuery(parsed);
    const copy = resolveFinanceAdvisorExportCopy(locale);
    const generatedAt = new Date().toISOString();
    const periodLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const [counterpartyCsv, vatTable, bankCashTable, agingTable, ledgerEntries] = await Promise.all([
      buildCounterpartySummaryCsv(locale),
      reportsService.getVatSummaryReport(locale, parsed),
      reportsService.getBankCashMovementReport(locale, parsed),
      reportsService.getAgingReport(locale, parsed),
      financeAccountEntryRepository.listEntriesForPeriod({
        fromDate: range.fromDate,
        toDate: range.toDate,
      }),
    ]);

    const vatExport = {
      content: vatTable.table ? buildFinanceReportTableCsv(vatTable.table) : `\uFEFF${copy.fileVatSummary}\n`,
      filename: "kdv-ozeti.csv",
      rowCount: vatTable.table?.rows.length ?? 0,
    };
    const bankCashExport = {
      content: bankCashTable.table ? buildFinanceReportTableCsv(bankCashTable.table) : `\uFEFF${copy.fileBankCash}\n`,
      filename: "kasa-banka.csv",
      rowCount: bankCashTable.table?.rows.length ?? 0,
    };
    const agingExport = {
      content: agingTable.table ? buildFinanceReportTableCsv(agingTable.table) : `\uFEFF${copy.fileAging}\n`,
      filename: "yaslandirma.csv",
      rowCount: agingTable.table?.rows.length ?? 0,
    };

    const logoLucaRows = mapFinanceEntriesToLogoLucaRows(ledgerEntries);
    const logoLucaCsv = buildLogoLucaJournalCsv({
      rows: logoLucaRows,
      headerDate: copy.logoLucaColDate,
      headerVoucherNo: copy.logoLucaColVoucherNo,
      headerAccountCode: copy.logoLucaColAccountCode,
      headerDebit: copy.logoLucaColDebit,
      headerCredit: copy.logoLucaColCredit,
      headerDescription: copy.logoLucaColDescription,
      headerDocumentNo: copy.logoLucaColDocumentNo,
    });

    const files: AdminFinanceAdvisorExportManifest["files"] = [
      {
        key: "counterparty-summary",
        title: copy.fileCounterpartySummary,
        format: "csv",
        rowCount: Math.max(0, counterpartyCsv.split("\n").length - 1),
        filename: "cari-ozet.csv",
        content: counterpartyCsv,
      },
      {
        key: "vat-summary",
        title: copy.fileVatSummary,
        format: "csv",
        rowCount: vatExport.rowCount,
        filename: vatExport.filename,
        content: vatExport.content,
      },
      {
        key: "bank-cash",
        title: copy.fileBankCash,
        format: "csv",
        rowCount: bankCashExport.rowCount,
        filename: bankCashExport.filename,
        content: bankCashExport.content,
      },
      {
        key: "aging",
        title: copy.fileAging,
        format: "csv",
        rowCount: agingExport.rowCount,
        filename: agingExport.filename,
        content: agingExport.content,
      },
      {
        key: "logo-luca-journal",
        title: copy.fileLogoLucaJournal,
        format: "csv",
        rowCount: logoLucaRows.length,
        filename: "logo-luca-yevmiye.csv",
        content: logoLucaCsv,
      },
    ];

    return {
      generatedAt,
      periodLabel,
      query: parsed,
      files,
    };
  }

  async getExportPackage(locale: string, query: AdminFinanceReportDateRangeQuery = {}): Promise<AdminFinanceAdvisorExportPackage> {
    const manifest = await this.buildManifest(locale, query);
    const params = new URLSearchParams();
    if (manifest.query.from) params.set("from", manifest.query.from);
    if (manifest.query.to) params.set("to", manifest.query.to);
    if (manifest.query.financialAccountId) params.set("financialAccountId", manifest.query.financialAccountId);
    const suffix = params.toString();

    return {
      generatedAt: manifest.generatedAt,
      periodLabel: manifest.periodLabel,
      query: manifest.query,
      files: manifest.files.map(({ content: _content, ...file }) => file),
      downloadXmlHref: `/api/admin/finance/advisor-export/package?format=xml${suffix ? `&${suffix}` : ""}`,
      downloadJsonHref: `/api/admin/finance/advisor-export/package?format=json${suffix ? `&${suffix}` : ""}`,
    };
  }

  async exportPackageXml(locale: string, query: AdminFinanceReportDateRangeQuery = {}) {
    const manifest = await this.buildManifest(locale, query);
    const content = buildFinanceAdvisorExportXml({
      generatedAt: manifest.generatedAt,
      periodLabel: manifest.periodLabel,
      from: manifest.query.from,
      to: manifest.query.to,
      files: manifest.files,
    });

    return {
      content,
      filename: `mali-musavir-export-${manifest.generatedAt.slice(0, 10)}.xml`,
      fileCount: manifest.files.length,
    };
  }

  async exportPackageJson(locale: string, query: AdminFinanceReportDateRangeQuery = {}) {
    const manifest = await this.buildManifest(locale, query);
    return {
      content: JSON.stringify(manifest, null, 2),
      filename: `mali-musavir-export-${manifest.generatedAt.slice(0, 10)}.json`,
      fileCount: manifest.files.length,
    };
  }

  async exportSingleFileCsv(locale: string, fileKey: FinanceAdvisorExportFileKey, query: AdminFinanceReportDateRangeQuery = {}) {
    const manifest = await this.buildManifest(locale, query);
    const file = manifest.files.find((item) => item.key === fileKey);
    if (!file) {
      throw new Error("Export dosyası bulunamadı.");
    }

    return {
      content: file.content,
      filename: file.filename,
      rowCount: file.rowCount,
    };
  }

  /** Smoke helper for verify scripts */
  async previewReportTables(locale: string, query: AdminFinanceReportDateRangeQuery = {}) {
    const parsed = querySchema.parse(query);
    const aging = await reportsService.getAgingReport(locale, parsed);
    return {
      agingRowCount: aging.table?.rows.length ?? 0,
      agingCsvLength: aging.table ? buildFinanceReportTableCsv(aging.table).length : 0,
    };
  }
}

export const financeAdvisorExportService = new FinanceAdvisorExportService();
