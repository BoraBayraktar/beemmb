import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { AttributeDefinitionManager } from "@/ui/admin/attribute-definition-manager";

export default async function AdminProductAttributesPage({
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

  if (!(await rbacService.hasPermission(user, "productAttributes.manage"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const [items, valueMappings] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      catalogAdminService.listAttributeDefinitions(),
      catalogAdminService.listAttributeValueMarketplaceMappings("TRENDYOL"),
    ]),
  );

  return (
    <AttributeDefinitionManager
      items={items}
      valueMappings={valueMappings}
      labels={{
        title: dictionary.admin.productAttributesTitle,
        description: dictionary.admin.productAttributesDescription,
        createTitle: dictionary.admin.productAttributesCreateTitle,
        empty: dictionary.admin.productAttributesEmpty,
        slug: dictionary.admin.slug,
        attributeName: dictionary.admin.attributeName,
        attributeDisplayType: dictionary.admin.attributeDisplayType,
        attributeDisplayText: dictionary.admin.attributeDisplayText,
        attributeDisplayColor: dictionary.admin.attributeDisplayColor,
        attributeDisplayNumber: dictionary.admin.attributeDisplayNumber,
        trendyolId: dictionary.admin.trendyolId,
        trendyolCategorySearch: dictionary.admin.trendyolCategorySearch,
        trendyolCategorySearchHint: dictionary.admin.trendyolCategorySearchHint,
        trendyolAttributeSearchHint: dictionary.admin.trendyolAttributeSearchHint,
        trendyolValueSearchHint: dictionary.admin.trendyolValueSearchHint,
        trendyolSelected: dictionary.admin.trendyolSelected,
        variantAxisUsageCount: dictionary.admin.variantAxisUsageCount,
        page: dictionary.admin.page,
        create: dictionary.admin.create,
        save: dictionary.admin.save,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        cancel: dictionary.admin.cancel,
        saving: dictionary.common.loading,
        search: dictionary.admin.search,
        importCsv: dictionary.admin.importCsv,
        exportCsv: dictionary.admin.exportCsv,
        status: dictionary.admin.status,
        statusActive: dictionary.admin.productStatusActive,
        statusArchived: dictionary.admin.productStatusArchived,
        selectedCount: dictionary.admin.selectedCount,
        valueMappingsTitle: dictionary.admin.attributeValueMappingsTitle,
        valueMappingsDescription: dictionary.admin.attributeValueMappingsDescription,
        valueMappingsChannel: dictionary.admin.attributeValueMappingsChannel,
        valueMappingsManualHint: dictionary.admin.attributeValueMappingsManualHint,
        localValue: dictionary.admin.localValue,
        externalValueId: dictionary.admin.externalValueId,
        externalValueName: dictionary.admin.externalValueName,
        customValue: dictionary.admin.customValue,
        channelTrendyol: dictionary.admin.integrationChannelTrendyol,
        channelN11: dictionary.admin.integrationChannelN11,
        channelPazarama: dictionary.admin.integrationChannelPazarama,
        channelHepsiburada: dictionary.admin.integrationChannelHepsiburada,
      }}
    />
  );
}
