import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { cariService } from "@/modules/cari/services/cari.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { CariManager } from "@/ui/admin/cari-manager";

export default async function AdminCariPage({
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
  const items = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => cariService.listCari(),
  );

  return (
    <CariManager
      items={items}
      canDelete={await rbacService.hasPermission(user, "cari.manage")}
      labels={{
        title: dictionary.admin.cariTitle,
        description: dictionary.admin.cariDescription,
        createTitle: dictionary.admin.cariCreateTitle,
        listTitle: dictionary.admin.cariTitle,
        search: dictionary.admin.cariSearch,
        filterStatus: dictionary.admin.status,
        filterAllStatuses: dictionary.admin.allStatuses,
        filterActive: dictionary.admin.active,
        filterPassive: dictionary.admin.passive,
        sort: dictionary.admin.sort,
        sortNameAsc: dictionary.admin.cariSortNameAsc,
        sortNameDesc: dictionary.admin.cariSortNameDesc,
        slug: dictionary.admin.cariSlugLabel,
        name: dictionary.admin.name,
        roleLabel: dictionary.admin.role,
        roleCustomer: dictionary.admin.cariRoleCustomer,
        roleSupplier: dictionary.admin.cariRoleSupplier,
        roleCarrier: dictionary.admin.cariRoleCarrier,
        roleFilterAll: dictionary.admin.cariRoleFilterAll,
        photo: dictionary.admin.cariPhoto,
        uploadPhoto: dictionary.admin.cariUploadPhoto,
        uploadingPhoto: dictionary.admin.cariUploadingPhoto,
        removePhoto: dictionary.admin.cariRemovePhoto,
        photoUploadFailed: dictionary.admin.cariPhotoUploadFailed,
        email: dictionary.admin.email,
        phone: dictionary.admin.supplierPhone,
        taxNumber: dictionary.admin.supplierTaxNumber,
        taxNumberVkn: dictionary.admin.cariTaxNumberVkn,
        taxNumberTckn: dictionary.admin.cariTaxNumberTckn,
        taxIdentifierLabel: dictionary.admin.cariTaxIdentifierLabel,
        taxNumberVknShort: dictionary.admin.cariTaxNumberVknShort,
        taxNumberTcknShort: dictionary.admin.cariTaxNumberTcknShort,
        taxOffice: dictionary.admin.cariTaxOffice,
        bankSectionTitle: dictionary.admin.cariBankSectionTitle,
        iban: dictionary.admin.cariIban,
        bankName: dictionary.admin.cariBankName,
        bankAccountHolder: dictionary.admin.cariBankAccountHolder,
        contactPersonSectionTitle: dictionary.admin.cariContactPersonSectionTitle,
        contactPersonName: dictionary.admin.cariContactPersonName,
        contactPersonPhone: dictionary.admin.cariContactPersonPhone,
        contactPersonEmail: dictionary.admin.cariContactPersonEmail,
        carrierSectionTitle: dictionary.admin.cariCarrierSectionTitle,
        trackingUrlTemplate: dictionary.admin.cariTrackingUrlTemplate,
        trackingUrlTemplateHint: dictionary.admin.cariTrackingUrlTemplateHint,
        trendyolId: dictionary.admin.cariTrendyolId,
        pazaramaId: dictionary.admin.cariPazaramaId,
        hepsiburadaId: dictionary.admin.cariHepsiburadaId,
        address: dictionary.admin.cariAddress,
        note: dictionary.admin.documentsNote,
        defaultPaymentTermDays: dictionary.admin.cariDefaultPaymentTermDays,
        creditLimit: dictionary.admin.cariCreditLimit,
        status: dictionary.admin.status,
        create: dictionary.admin.create,
        save: dictionary.admin.save,
        edit: dictionary.admin.edit,
        delete: dictionary.admin.delete,
        saving: dictionary.common.loading,
        cancel: dictionary.admin.cancel,
        empty: dictionary.admin.cariEmpty,
        createFailed: dictionary.admin.cariCreateFailed,
        operationFailed: dictionary.admin.operationFailed,
        duplicateSlug: dictionary.admin.cariDuplicateSlug,
        invalidTaxIdentifier: dictionary.admin.cariInvalidTaxIdentifier,
        invalidIban: dictionary.admin.cariInvalidIban,
        roleRequired: dictionary.admin.cariRoleRequired,
        deleteConfirmTitle: dictionary.admin.deleteConfirmTitle,
        deleteConfirmDescription: dictionary.admin.deleteConfirmDescription,
      }}
    />
  );
}
