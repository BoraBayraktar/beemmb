import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { CustomerAccountManager } from "@/ui/admin/customer-account-manager";

export default async function AdminCustomerAccountsPage({
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
  const items = await customerAccountService.listCustomerAccounts();

  return (
    <CustomerAccountManager
      items={items}
      labels={{
        title: dictionary.admin.customerAccountsTitle,
        description: dictionary.admin.customerAccountsDescription,
        createTitle: dictionary.admin.customerAccountsCreateTitle,
        listTitle: dictionary.admin.customerAccountsTitle,
        search: dictionary.admin.customerAccountsSearch,
        filterStatus: dictionary.admin.status,
        filterAllStatuses: dictionary.admin.allStatuses,
        filterActive: dictionary.admin.active,
        filterPassive: dictionary.admin.passive,
        sort: dictionary.admin.sort,
        sortNameAsc: dictionary.admin.customerAccountsSortNameAsc,
        sortNameDesc: dictionary.admin.customerAccountsSortNameDesc,
        slug: dictionary.admin.slug,
        name: dictionary.admin.name,
        email: dictionary.admin.email,
        phone: dictionary.admin.supplierPhone,
        taxNumber: dictionary.admin.supplierTaxNumber,
        address: dictionary.admin.customerAccountsAddress,
        note: dictionary.admin.documentsNote,
        defaultPaymentTermDays: dictionary.admin.customerDefaultPaymentTermDays,
        creditLimit: dictionary.admin.customerCreditLimit,
        status: dictionary.admin.status,
        create: dictionary.admin.create,
        save: dictionary.admin.save,
        edit: dictionary.admin.edit,
        saving: dictionary.common.loading,
        cancel: dictionary.admin.cancel,
        empty: dictionary.admin.customerAccountsEmpty,
        createFailed: dictionary.admin.customerAccountsCreateFailed,
        operationFailed: dictionary.admin.operationFailed,
      }}
    />
  );
}
