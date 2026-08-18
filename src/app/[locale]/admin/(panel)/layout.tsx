import { notFound, redirect } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { AdminPanelShell, type MenuItem } from "@/ui/admin/panel-shell";

type ProtectedMenuItem = MenuItem & {
  permissionKey?: string;
  children?: ProtectedMenuItem[];
};

function filterMenuByPermissions(items: ProtectedMenuItem[], permissionKeys: string[]): MenuItem[] {
  const filteredItems: MenuItem[] = [];

  for (const item of items) {
    const children = item.children ? filterMenuByPermissions(item.children, permissionKeys) : undefined;
    const canSeeItem = !item.permissionKey || permissionKeys.includes(item.permissionKey);

    if (!canSeeItem && (!children || children.length === 0)) {
      continue;
    }

    filteredItems.push({
      href: item.href,
      label: item.label,
      children,
    });
  }

  return filteredItems;
}

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  const effectiveRbac = await rbacService.getEffectivePermissions(user);

  if (!effectiveRbac.permissionKeys.includes("admin.access")) {
    redirect(`/${locale}`);
  }

  const localizedRole = effectiveRbac.roleNames.length > 0
    ? effectiveRbac.roleNames.join(", ")
    : user.role === "ADMIN"
      ? dictionary.admin.roleAdmin
      : dictionary.admin.roleEditor;

  const rawMenuItems: ProtectedMenuItem[] = [
    {
      href: `/${locale}/admin/products`,
      label: dictionary.admin.productManager,
      permissionKey: "products.read",
      children: [
        { href: `/${locale}/admin/products`, label: "Ürünler", permissionKey: "products.read" },
        { href: `/${locale}/admin/product-questions`, label: dictionary.admin.questionManager, permissionKey: "products.read" },
        { href: `/${locale}/admin/categories`, label: dictionary.admin.categoryManager, permissionKey: "products.manage" },
        { href: `/${locale}/admin/storefront`, label: dictionary.admin.storefrontManager, permissionKey: "products.manage" },
        { href: `/${locale}/admin/product-attributes`, label: dictionary.admin.productAttributesTitle, permissionKey: "products.manage" },
        { href: `/${locale}/admin/orders`, label: dictionary.admin.orderManager, permissionKey: "orders.read" },
        { href: `/${locale}/admin/orders/shipping-report`, label: dictionary.admin.shippingReportTitle, permissionKey: "orders.read" },
        { href: `/${locale}/admin/brands`, label: dictionary.admin.brandsTitle, permissionKey: "products.manage" },
        { href: `/${locale}/admin/carriers`, label: dictionary.admin.carriersTitle, permissionKey: "products.manage" },
      ],
    },
    {
      href: `/${locale}/admin/inventory`,
      label: dictionary.admin.inventoryManager,
      permissionKey: "inventory.read",
      children: [
        { href: `/${locale}/admin/inventory`, label: "Genel Bakış", permissionKey: "inventory.read" },
        { href: `/${locale}/admin/inventory/quick-actions`, label: "Hızlı Barkod İşlemleri", permissionKey: "inventory.manage" },
        { href: `/${locale}/admin/inventory/products`, label: "Ürün Stokları", permissionKey: "inventory.read" },
        { href: `/${locale}/admin/inventory/transactions`, label: dictionary.admin.inventoryTransactionsTitle, permissionKey: "inventory.read" },
        { href: `/${locale}/admin/inventory/counts`, label: dictionary.admin.inventoryStockCountTitle, permissionKey: "inventory.manage" },
        { href: `/${locale}/admin/inventory/warehouses`, label: dictionary.admin.inventoryWarehousesTitle, permissionKey: "inventory.manage" },
        { href: `/${locale}/admin/suppliers`, label: dictionary.admin.suppliersTitle, permissionKey: "inventory.manage" },
        { href: `/${locale}/admin/inventory/exports`, label: "Dışa Aktarım Geçmişi", permissionKey: "inventory.read" },
      ],
    },
    {
      href: `/${locale}/admin/documents`,
      label: dictionary.admin.documentManager,
      permissionKey: "documents.read",
      children: [
        { href: `/${locale}/admin/documents`, label: dictionary.admin.documentsMenuOverview, permissionKey: "documents.read" },
        { href: `/${locale}/admin/documents/pending-invoices`, label: dictionary.admin.documentsMenuPendingInvoices, permissionKey: "documents.manage" },
        { href: `/${locale}/admin/documents/providers`, label: dictionary.admin.documentsMenuProviders, permissionKey: "documents.manage" },
        { href: `/${locale}/admin/documents/webhooks`, label: dictionary.admin.documentsMenuWebhooks, permissionKey: "documents.manage" },
      ],
    },
    {
      href: `/${locale}/admin/incoming-invoices`,
      label: "Gelen Faturalar",
      permissionKey: "incomingInvoices.read",
      children: [
        { href: `/${locale}/admin/incoming-invoices`, label: "Genel Bakış", permissionKey: "incomingInvoices.read" },
        { href: `/${locale}/admin/incoming-invoices/providers`, label: "Gelen Fatura Entegratörleri", permissionKey: "incomingInvoices.manage" },
      ],
    },
    {
      href: `/${locale}/admin/finance`,
      label: dictionary.admin.financeManager,
      permissionKey: "finance.read",
      children: [
        { href: `/${locale}/admin/finance`, label: dictionary.admin.financeMenuOverview, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/payables`, label: dictionary.admin.financeMenuSupplierPayables, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/receivables`, label: dictionary.admin.financeMenuCustomerReceivables, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/accounts`, label: dictionary.admin.financeMenuAccounts, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/customer-accounts`, label: dictionary.admin.customerAccountsTitle, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/collections`, label: dictionary.admin.financeMenuCollections, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/payments`, label: dictionary.admin.financeMenuPayments, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/bank-cash`, label: dictionary.admin.financeMenuBankCash, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/bank-reconciliation`, label: dictionary.admin.financeMenuBankReconciliation, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/instruments`, label: dictionary.admin.financeMenuNegotiableInstruments, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/transactions`, label: dictionary.admin.financeMenuTransactions, permissionKey: "finance.manage" },
        { href: `/${locale}/admin/finance/reports`, label: dictionary.admin.financeMenuReports, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/reports/trial-balance`, label: dictionary.admin.financeMenuTrialBalance, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/exports`, label: dictionary.admin.financeMenuAdvisorExports, permissionKey: "finance.audit.read" },
        { href: `/${locale}/admin/finance/ledger-entries`, label: dictionary.admin.financeMenuLedgerEntries, permissionKey: "finance.read" },
      ],
    },
    {
      href: `/${locale}/admin/integrations`,
      label: dictionary.admin.integrationManager,
      permissionKey: "integrations.read",
      children: [
        { href: `/${locale}/admin/integrations`, label: dictionary.admin.integrationManager, permissionKey: "integrations.read" },
        { href: `/${locale}/admin/integrations/trendyol`, label: dictionary.admin.integrationMarketplaceTrendyol, permissionKey: "integrations.manage" },
        { href: `/${locale}/admin/integrations/n11`, label: dictionary.admin.integrationMarketplaceN11, permissionKey: "integrations.manage" },
        { href: `/${locale}/admin/integrations/pazarama`, label: dictionary.admin.integrationMarketplacePazarama, permissionKey: "integrations.manage" },
        { href: `/${locale}/admin/integrations/hepsiburada`, label: dictionary.admin.integrationMarketplaceHepsiburada, permissionKey: "integrations.manage" },
        { href: `/${locale}/admin/inventory/external-events`, label: "Harici Stok Eventleri", permissionKey: "integrations.read" },
      ],
    },
    {
      href: `/${locale}/admin/users`,
      label: dictionary.admin.userManagerGroup,
      permissionKey: "users.manage",
      children: [
        { href: `/${locale}/admin/customers`, label: dictionary.admin.customerManager, permissionKey: "users.manage" },
        { href: `/${locale}/admin/users`, label: dictionary.admin.userManager, permissionKey: "users.manage" },
        { href: `/${locale}/admin/roles`, label: dictionary.admin.roleManager, permissionKey: "users.manage" },
        { href: `/${locale}/admin/audit-logs`, label: dictionary.admin.auditLogMenu, permissionKey: "audit.read" },
      ],
    },
  ];
  const menuItems = filterMenuByPermissions(rawMenuItems, effectiveRbac.permissionKeys);

  return (
    <AdminPanelShell
      locale={locale}
      title={dictionary.admin.title}
      userName={user.name}
      userEmail={user.email}
      userRole={localizedRole}
      logoutLabel={dictionary.admin.logout}
      loadingLabel={dictionary.common.loading}
      storeLabel={dictionary.admin.goStore}
      notificationsLabel={dictionary.admin.notifications}
      noNotificationsLabel={dictionary.admin.noNotifications}
      markAllReadLabel={dictionary.admin.markAllRead}
      notificationProductQuestionCreatedTitle={dictionary.admin.notificationProductQuestionCreatedTitle}
      notificationInventoryOutOfStockTitle={dictionary.admin.notificationInventoryOutOfStockTitle}
      notificationInventoryLowStockTitle={dictionary.admin.notificationInventoryLowStockTitle}
      notificationStockCountAppliedTitle={dictionary.admin.notificationStockCountAppliedTitle}
      notificationStockCountAppliedMessage={dictionary.admin.notificationStockCountAppliedMessage}
      menuItems={menuItems}
    >
      {children}
    </AdminPanelShell>
  );
}
