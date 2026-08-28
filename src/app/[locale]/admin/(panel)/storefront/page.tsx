import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogService } from "@/modules/catalog/services/catalog.service";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { storefrontService } from "@/modules/storefront/services/storefront.service";
import { StorefrontManager } from "@/ui/admin/storefront-manager";

export default async function AdminStorefrontPage({
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

  if (!(await rbacService.hasPermission(user, "storefront.manage"))) {
    notFound();
  }

  const [storefrontProductOptions, categories, storefrontItems] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      catalogAdminService.listProducts({
        page: 1,
        pageSize: 50,
      }),
      catalogService.listCategories(),
      storefrontService.listAdminItems(),
    ]),
  );

  return (
    <StorefrontManager
      items={storefrontItems}
      productOptions={storefrontProductOptions.items}
      categoryOptions={categories}
      canDelete={await rbacService.hasPermission(user, "storefront.manage")}
      labels={{
        title: dictionary.admin.storefrontManager,
        createTitle: dictionary.admin.createStorefrontItem,
        edit: dictionary.admin.edit,
        itemTitle: dictionary.admin.trTitle,
        itemDescription: dictionary.admin.trDescription,
        section: dictionary.admin.section,
        variant: dictionary.admin.variant,
        targetType: dictionary.admin.targetType,
        targetProduct: dictionary.admin.targetProduct,
        targetCategory: dictionary.admin.targetCategory,
        selectProduct: dictionary.admin.selectProduct,
        selectCategory: dictionary.admin.selectCategory,
        order: dictionary.admin.order,
        startAt: dictionary.admin.startAt,
        endAt: dictionary.admin.endAt,
        noDateWindow: dictionary.admin.noDateWindow,
        create: dictionary.admin.create,
        save: dictionary.admin.save,
        cancel: dictionary.admin.cancel,
        delete: dictionary.admin.delete,
        campaigns: dictionary.admin.campaigns,
        features: dictionary.admin.features,
        accent: dictionary.admin.accent,
        soft: dictionary.admin.soft,
        dark: dictionary.admin.dark,
        defaultVariant: dictionary.admin.defaultVariant,
        validationRequired: dictionary.admin.validationRequired,
        validationTarget: dictionary.admin.validationTarget,
        validationOrder: dictionary.admin.validationOrder,
        validationDateRange: dictionary.admin.validationDateRange,
        operationFailed: dictionary.admin.operationFailed,
        loading: dictionary.common.loading,
        sectionCampaign: dictionary.admin.sectionCampaign,
        sectionFeature: dictionary.admin.sectionFeature,
        variantAccent: dictionary.admin.variantAccent,
        variantSoft: dictionary.admin.variantSoft,
        variantDark: dictionary.admin.variantDark,
        variantDefault: dictionary.admin.variantDefault,
        deleteConfirmTitle: dictionary.admin.deleteConfirmTitle,
        deleteConfirmDescription: dictionary.admin.deleteConfirmDescription,
      }}
    />
  );
}
