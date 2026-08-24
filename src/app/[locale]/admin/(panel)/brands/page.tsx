import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { BrandDirectoryManager } from "@/ui/admin/brand-directory-manager";

export default async function AdminBrandsPage({
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

  if (!(await rbacService.hasPermission(user, "brands.manage"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const items = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => catalogAdminService.listBrands(),
  );

  return (
    <BrandDirectoryManager
      items={items}
      canDelete={await rbacService.hasPermission(user, "brands.manage")}
      labels={{
        title: dictionary.admin.brandsTitle,
        description: dictionary.admin.brandsDescription,
        marketplaceNote: dictionary.admin.brandsMarketplaceNote,
        createTitle: dictionary.admin.brandsCreateTitle,
        listTitle: dictionary.admin.brandsTitle,
        search: dictionary.admin.searchBrand,
        filterStatus: dictionary.admin.role,
        filterAllStatuses: dictionary.admin.allStatuses,
        filterActive: dictionary.admin.active,
        filterPassive: dictionary.admin.passive,
        filterProducts: dictionary.admin.filterProducts,
        filterAllProducts: dictionary.admin.filterAllProducts,
        filterWithProducts: dictionary.admin.filterWithProducts,
        filterWithoutProducts: dictionary.admin.filterWithoutProducts,
        sort: dictionary.admin.sortCategories,
        sortNameAsc: dictionary.admin.sortNameAsc,
        sortNameDesc: dictionary.admin.sortNameDesc,
        sortProductCountDesc: dictionary.admin.sortProductCountDesc,
        slug: dictionary.admin.slug,
        name: dictionary.admin.brandName,
        productCount: dictionary.admin.productCount,
        trendyolId: dictionary.admin.trendyolId,
        trendyolSearch: dictionary.admin.trendyolBrandSearch,
        trendyolSearchHint: dictionary.admin.trendyolBrandSearchHint,
        trendyolSelected: dictionary.admin.trendyolSelected,
        pazaramaId: dictionary.admin.pazaramaId,
        pazaramaSearch: dictionary.admin.pazaramaBrandSearch,
        pazaramaSearchHint: dictionary.admin.pazaramaBrandSearchHint,
        pazaramaSelected: dictionary.admin.pazaramaSelected,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        save: dictionary.admin.save,
        cancel: dictionary.admin.cancel,
        loading: dictionary.common.loading,
        empty: dictionary.admin.brandsEmpty,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        validationDeleteBlocked: "Bu marka aktif ürünlerde kullanıldığı için silinemez.",
        importCsv: dictionary.admin.importCsv,
        exportCsv: dictionary.admin.exportCsv,
      }}
    />
  );
}
