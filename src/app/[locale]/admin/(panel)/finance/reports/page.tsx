import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { reportsService } from "@/modules/finance/services/reports.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceReportsManager } from "@/ui/admin/finance-reports-manager";

export default async function AdminFinanceReportsPage({
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

  const effective = await rbacService.getEffectivePermissions(user);
  if (!effective.permissionKeys.includes("financeReports.read")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const overview = await reportsService.getOverview(locale);

  return (
    <FinanceReportsManager
      overview={overview}
      labels={{
        title: dictionary.admin.financeReportsTitle,
        description: dictionary.admin.financeReportsDescription,
      }}
    />
  );
}
