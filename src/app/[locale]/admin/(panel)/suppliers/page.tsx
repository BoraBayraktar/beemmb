import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { SupplierDirectoryManager } from "@/ui/admin/supplier-directory-manager";

export default async function AdminSuppliersPage({
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
  const items = await catalogAdminService.listSuppliers();

  return (
    <SupplierDirectoryManager
      items={items}
      canDelete={await rbacService.hasPermission(user, "inventory.manage")}
      labels={{
        title: dictionary.admin.suppliersTitle,
        description: dictionary.admin.suppliersDescription,
        createTitle: dictionary.admin.suppliersCreateTitle,
        listTitle: dictionary.admin.suppliersTitle,
        search: dictionary.admin.searchSupplier,
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
        name: dictionary.admin.name,
        email: dictionary.admin.supplierEmail,
        phone: dictionary.admin.supplierPhone,
        taxNumber: dictionary.admin.supplierTaxNumber,
        defaultPaymentTermDays: dictionary.admin.supplierDefaultPaymentTermDays,
        creditLimit: dictionary.admin.supplierCreditLimit,
        productCount: dictionary.admin.productCount,
        create: dictionary.admin.create,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        save: dictionary.admin.save,
        cancel: dictionary.admin.cancel,
        loading: dictionary.common.loading,
        empty: dictionary.admin.suppliersEmpty,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        validationDeleteBlocked: "Bu tedarikçi aktif ürünlerde kullanıldığı için silinemez.",
        importCsv: dictionary.admin.importCsv,
        exportCsv: dictionary.admin.exportCsv,
      }}
    />
  );
}
