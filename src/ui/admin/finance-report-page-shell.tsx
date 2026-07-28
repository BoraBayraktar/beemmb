import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import type { AdminFinanceReportDetail } from "@/modules/finance/contracts/reports.contract";
import type { FinanceReportsCopy } from "@/modules/finance/contracts/finance-reports-copy.contract";
import type { FinanceReportExportKey } from "@/modules/finance/services/finance-report-export.service";
import { FinanceReportDateRangeFilter } from "@/ui/admin/finance-report-date-range-filter";
import { FinanceReportDetailManager } from "@/ui/admin/finance-report-detail-manager";

type Props = {
  locale: string;
  reportKey: FinanceReportExportKey;
  range: {
    fromIso: string;
    toIso: string;
  };
  copy: FinanceReportsCopy;
  report: AdminFinanceReportDetail;
  query: AdminFinanceReportDateRangeQuery;
  labels: {
    primaryValue: string;
    secondaryValue: string;
  };
};

function buildServerExportHref(reportKey: FinanceReportExportKey, query: AdminFinanceReportDateRangeQuery) {
  const params = new URLSearchParams();
  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }
  if (query.financialAccountId) {
    params.set("financialAccountId", query.financialAccountId);
  }

  const suffix = params.toString();
  return `/api/admin/finance/reports/${reportKey}/export${suffix ? `?${suffix}` : ""}`;
}

export function FinanceReportPageShell({
  locale,
  reportKey,
  range,
  copy,
  report,
  query,
  labels,
}: Props) {
  return (
    <>
      <FinanceReportDateRangeFilter
        locale={locale}
        reportPath={reportKey}
        fromIso={range.fromIso}
        toIso={range.toIso}
        labels={copy.dateRange}
      />
      <FinanceReportDetailManager
        report={report}
        labels={labels}
        serverExportHref={buildServerExportHref(reportKey, {
          from: range.fromIso,
          to: range.toIso,
          financialAccountId: query.financialAccountId,
        })}
        exportCsvLabel={copy.dateRange.exportCsvLabel}
      />
    </>
  );
}
