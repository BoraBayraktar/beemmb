import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CategoryManager } from "@/ui/admin/category-manager";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "categories.manage"))) {
    notFound();
  }

  const { categoryResult, candidateItems } = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    async () => {
      const categoryResult = await catalogAdminService.listCategories({
        page: 1,
        pageSize: 10,
      });

      const firstCandidatePage = await catalogAdminService.listCategories({
        page: 1,
        pageSize: 50,
      });

      const candidateItems = [...firstCandidatePage.items];
      for (let page = 2; page <= firstCandidatePage.totalPages; page += 1) {
        const nextPage = await catalogAdminService.listCategories({
          page,
          pageSize: 50,
        });
        candidateItems.push(...nextPage.items);
      }

      return { categoryResult, candidateItems };
    },
  );

  return (
    <CategoryManager
      initialResult={categoryResult}
      parentCandidates={candidateItems.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        parentId: item.parentId,
      }))}
      canDelete={await rbacService.hasPermission(user, "categories.manage")}
      labels={{
        title: dictionary.admin.categoryManager,
        marketplaceNote: dictionary.admin.categoriesMarketplaceNote,
        createTitle: dictionary.admin.createCategory,
        listTitle: dictionary.admin.categoryList,
        search: dictionary.admin.searchCategory,
        allParents: dictionary.admin.allParentCategories,
        slug: dictionary.admin.slug,
        name: dictionary.admin.name,
        productCount: dictionary.admin.productCount,
        trendyolId: dictionary.admin.trendyolId,
        trendyolSearch: dictionary.admin.trendyolCategorySearch,
        trendyolSearchHint: dictionary.admin.trendyolCategorySearchHint,
        trendyolSelected: dictionary.admin.trendyolSelected,
        pazaramaId: dictionary.admin.pazaramaId,
        pazaramaSearch: dictionary.admin.pazaramaCategorySearch,
        pazaramaSearchHint: dictionary.admin.pazaramaCategorySearchHint,
        pazaramaSelected: dictionary.admin.pazaramaSelected,
        parentCategory: dictionary.admin.parentCategory,
        filterProducts: dictionary.admin.filterProducts,
        filterAllProducts: dictionary.admin.filterAllProducts,
        filterWithProducts: dictionary.admin.filterWithProducts,
        filterWithoutProducts: dictionary.admin.filterWithoutProducts,
        sort: dictionary.admin.sortCategories,
        sortUpdatedDesc: dictionary.admin.sortUpdatedDesc,
        sortNameAsc: dictionary.admin.sortNameAsc,
        sortNameDesc: dictionary.admin.sortNameDesc,
        sortProductCountDesc: dictionary.admin.sortProductCountDesc,
        rootCategoriesOnly: dictionary.admin.rootCategoriesOnly,
        noParent: dictionary.admin.noParentCategory,
        page: dictionary.admin.page,
        prev: dictionary.admin.prev,
        next: dictionary.admin.next,
        save: dictionary.admin.save,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        cancel: dictionary.admin.cancel,
        empty: dictionary.admin.emptyCategories,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        validationDeleteBlocked: dictionary.admin.validationDeleteCategoryBlocked,
        loading: dictionary.common.loading,
        importCsv: dictionary.admin.importCsv,
        exportCsv: dictionary.admin.exportCsv,
      }}
    />
  );
}
