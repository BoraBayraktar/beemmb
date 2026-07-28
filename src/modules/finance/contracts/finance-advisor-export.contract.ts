import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";

export type FinanceAdvisorExportFileKey =
  | "counterparty-summary"
  | "vat-summary"
  | "bank-cash"
  | "aging"
  | "logo-luca-journal";

export type FinanceAdvisorExportFile = {
  key: FinanceAdvisorExportFileKey;
  title: string;
  format: "csv";
  rowCount: number;
  filename: string;
};

export type AdminFinanceAdvisorExportPackage = {
  generatedAt: string;
  periodLabel: string;
  query: AdminFinanceReportDateRangeQuery;
  files: FinanceAdvisorExportFile[];
  downloadXmlHref: string;
  downloadJsonHref: string;
};

export type AdminFinanceAdvisorExportManifest = {
  generatedAt: string;
  periodLabel: string;
  query: AdminFinanceReportDateRangeQuery;
  files: Array<FinanceAdvisorExportFile & { content: string }>;
};
