import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { reportsService } from "@/modules/finance/services/reports.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { FinanceReportDetailManager } from "@/ui/admin/finance-report-detail-manager";

export default async function AdminFinancePerformanceReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const report = await reportsService.getCollectionPaymentPerformanceReport(locale);

  return (
    <FinanceReportDetailManager
      report={report}
      labels={{
        primaryValue: dictionary.admin.financeReportsPrimaryValue,
        secondaryValue: dictionary.admin.financeReportsSecondaryValue,
      }}
    />
  );
}
