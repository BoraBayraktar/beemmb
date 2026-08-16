import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CarrierDirectoryManager } from "@/ui/admin/carrier-directory-manager";

export default async function AdminCarriersPage({
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
  const items = await catalogAdminService.listCarrierCompanies();

  return (
    <CarrierDirectoryManager
      items={items}
      canDelete={await rbacService.hasPermission(user, "products.manage")}
      labels={{
        title: dictionary.admin.carriersTitle,
        description: dictionary.admin.carriersDescription,
        createTitle: dictionary.admin.carriersCreateTitle,
        listTitle: dictionary.admin.carriersTitle,
        search: dictionary.admin.searchCarrier,
        filterStatus: dictionary.admin.role,
        filterAllStatuses: dictionary.admin.allStatuses,
        filterActive: dictionary.admin.active,
        filterPassive: dictionary.admin.passive,
        sort: dictionary.admin.sortCategories,
        sortNameAsc: dictionary.admin.sortNameAsc,
        sortNameDesc: dictionary.admin.sortNameDesc,
        slug: dictionary.admin.slug,
        name: dictionary.admin.carrierName,
        taxNumber: dictionary.admin.carrierTaxNumber,
        trackingUrlTemplate: dictionary.admin.carrierTrackingUrlTemplate,
        trackingUrlTemplateHint: dictionary.admin.carrierTrackingUrlTemplateHint,
        trendyolId: dictionary.admin.carrierTrendyolId,
        pazaramaId: dictionary.admin.carrierPazaramaId,
        orderCount: dictionary.admin.carrierOrderCount,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        save: dictionary.admin.save,
        cancel: dictionary.admin.cancel,
        loading: dictionary.common.loading,
        empty: dictionary.admin.carriersEmpty,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
      }}
    />
  );
}
