import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { financeOverviewService } from "@/modules/finance/services/finance-overview.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { FinanceOverviewManager } from "@/ui/admin/finance-overview-manager";

export default async function AdminFinancePage({
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
  const effectiveRbac = await rbacService.getEffectivePermissions(user);
  const overview = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => financeOverviewService.getOverview(locale),
  );
  const visibleSections = overview.sections.filter((section) => {
    if (!section.permissionKey) {
      return true;
    }

    if (section.permissionKey === "finance.audit.read") {
      return (
        effectiveRbac.permissionKeys.includes("finance.audit.read") ||
        effectiveRbac.permissionKeys.includes("finance.manage")
      );
    }

    return effectiveRbac.permissionKeys.includes(section.permissionKey);
  });

  return (
    <FinanceOverviewManager
      locale={locale}
      overview={{ ...overview, sections: visibleSections }}
      labels={{
        title: dictionary.admin.financeOverviewTitle,
        description: dictionary.admin.financeOverviewDescription,
        sectionsTitle: dictionary.admin.financeOverviewSectionsTitle,
        openRoute: dictionary.admin.financeOverviewOpenRoute,
      }}
    />
  );
}
