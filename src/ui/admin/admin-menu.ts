import type { Dictionary, Locale } from "@/lib/i18n";
import type { MenuItem } from "@/ui/admin/panel-shell";

export type AdminMenuItem = {
  href: string;
  label: string;
  permissionKey?: string;
  /** Sadece ust-seviye (grup) node'larda set edilir; children ModuleCatalog.key'ini mirasla alir (bkz. filterMenuByPermissionsAndEntitlements). */
  moduleKey?: string;
  children?: AdminMenuItem[];
};

/**
 * Menude bir ogenin gorunmesi icin CIFT KONTROL gerekir: (1) kullanicinin
 * rolunde ilgili permissionKey olmali VE (2) tenant'in aboneliginde ilgili
 * moduleKey acik olmali. moduleKey sadece ust-seviye (grup) node'larda
 * tanimlidir, children parent'tan miras alir. Bu SADECE menu gorunurlugu
 * icin bir kolayliktir -- route-level yetkilendirme hala tek basina
 * requirePermission()'a dayanir, entitlement kontrolu API katmaninda
 * ZORUNLU degildir (bkz. plan Faz 3 notu).
 */
export function filterMenuByPermissionsAndEntitlements(
  items: AdminMenuItem[],
  permissionKeys: string[],
  enabledModuleKeys: Set<string>,
  inheritedModuleKey?: string,
): MenuItem[] {
  const filteredItems: MenuItem[] = [];

  for (const item of items) {
    const moduleKey = item.moduleKey ?? inheritedModuleKey;
    const hasEntitlement = !moduleKey || enabledModuleKeys.has(moduleKey);

    if (!hasEntitlement) {
      continue;
    }

    const children = item.children
      ? filterMenuByPermissionsAndEntitlements(item.children, permissionKeys, enabledModuleKeys, moduleKey)
      : undefined;
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

/**
 * `/admin` kok sayfasinin, kullanicinin GERCEKTEN erisimi olan ilk sayfaya
 * yonlendirebilmesi icin -- filterMenuByPermissionsAndEntitlements'in tersi:
 * tum agaci filtrelemek yerine, izin+entitlement kontrolunden gecen ILK
 * node'un href'ini bulup doner (bir grup basligi kendi permissionKey'ini
 * karsilamiyor ama bir alt ogesi karsiliyorsa, o alt ogenin href'i donulur --
 * boylece kullanici erisimi olmayan bir grup sayfasina yonlendirilmez).
 */
export function findFirstAccessibleHref(
  items: AdminMenuItem[],
  permissionKeys: string[],
  enabledModuleKeys: Set<string>,
  inheritedModuleKey?: string,
): string | null {
  for (const item of items) {
    const moduleKey = item.moduleKey ?? inheritedModuleKey;
    const hasEntitlement = !moduleKey || enabledModuleKeys.has(moduleKey);

    if (!hasEntitlement) {
      continue;
    }

    const canSeeItem = !item.permissionKey || permissionKeys.includes(item.permissionKey);
    if (canSeeItem) {
      return item.href;
    }

    if (item.children) {
      const childHref = findFirstAccessibleHref(item.children, permissionKeys, enabledModuleKeys, moduleKey);
      if (childHref) {
        return childHref;
      }
    }
  }

  return null;
}

export function buildAdminMenuTree(dictionary: Dictionary, locale: Locale): AdminMenuItem[] {
  return [
    {
      href: `/${locale}/admin/products`,
      label: dictionary.admin.productManager,
      permissionKey: "products.read",
      moduleKey: "products",
      children: [
        { href: `/${locale}/admin/products`, label: "Ürünler", permissionKey: "products.read" },
        { href: `/${locale}/admin/product-questions`, label: dictionary.admin.questionManager, permissionKey: "productQuestions.read" },
        { href: `/${locale}/admin/categories`, label: dictionary.admin.categoryManager, permissionKey: "categories.manage" },
        { href: `/${locale}/admin/storefront`, label: dictionary.admin.storefrontManager, permissionKey: "storefront.manage" },
        { href: `/${locale}/admin/product-attributes`, label: dictionary.admin.productAttributesTitle, permissionKey: "productAttributes.manage" },
        { href: `/${locale}/admin/orders`, label: dictionary.admin.orderManager, permissionKey: "orders.read" },
        { href: `/${locale}/admin/orders/shipping-report`, label: dictionary.admin.shippingReportTitle, permissionKey: "ordersShippingReport.read" },
        { href: `/${locale}/admin/brands`, label: dictionary.admin.brandsTitle, permissionKey: "brands.manage" },
      ],
    },
    {
      href: `/${locale}/admin/inventory`,
      label: dictionary.admin.inventoryManager,
      permissionKey: "inventory.read",
      moduleKey: "inventory",
      children: [
        { href: `/${locale}/admin/inventory`, label: "Genel Bakış", permissionKey: "inventory.read" },
        { href: `/${locale}/admin/inventory/quick-actions`, label: "Hızlı Barkod İşlemleri", permissionKey: "inventoryQuickActions.manage" },
        { href: `/${locale}/admin/inventory/products`, label: "Ürün Stokları", permissionKey: "inventoryProducts.read" },
        { href: `/${locale}/admin/inventory/transactions`, label: dictionary.admin.inventoryTransactionsTitle, permissionKey: "inventoryTransactions.read" },
        { href: `/${locale}/admin/inventory/counts`, label: dictionary.admin.inventoryStockCountTitle, permissionKey: "inventoryCounts.manage" },
        { href: `/${locale}/admin/inventory/warehouses`, label: dictionary.admin.inventoryWarehousesTitle, permissionKey: "warehouses.manage" },
        { href: `/${locale}/admin/inventory/exports`, label: "Dışa Aktarım Geçmişi", permissionKey: "inventoryExports.read" },
      ],
    },
    {
      href: `/${locale}/admin/documents`,
      label: dictionary.admin.documentManager,
      permissionKey: "documents.read",
      moduleKey: "documents",
      children: [
        { href: `/${locale}/admin/documents`, label: dictionary.admin.documentsMenuOverview, permissionKey: "documents.read" },
        { href: `/${locale}/admin/documents/pending-invoices`, label: dictionary.admin.documentsMenuPendingInvoices, permissionKey: "documentsPendingInvoices.manage" },
        { href: `/${locale}/admin/documents/providers`, label: dictionary.admin.documentsMenuProviders, permissionKey: "documentsProviders.manage" },
        { href: `/${locale}/admin/documents/webhooks`, label: dictionary.admin.documentsMenuWebhooks, permissionKey: "documentsWebhooks.manage" },
      ],
    },
    {
      href: `/${locale}/admin/incoming-invoices`,
      label: "Gelen Faturalar",
      permissionKey: "incomingInvoices.read",
      moduleKey: "incomingInvoices",
      children: [
        { href: `/${locale}/admin/incoming-invoices`, label: "Genel Bakış", permissionKey: "incomingInvoices.read" },
        { href: `/${locale}/admin/incoming-invoices/providers`, label: "Gelen Fatura Entegratörleri", permissionKey: "incomingInvoices.manage" },
      ],
    },
    {
      href: `/${locale}/admin/finance`,
      label: dictionary.admin.financeManager,
      permissionKey: "finance.read",
      moduleKey: "finance",
      children: [
        { href: `/${locale}/admin/finance`, label: dictionary.admin.financeMenuOverview, permissionKey: "finance.read" },
        { href: `/${locale}/admin/finance/payables`, label: dictionary.admin.financeMenuSupplierPayables, permissionKey: "financePayables.read" },
        { href: `/${locale}/admin/finance/receivables`, label: dictionary.admin.financeMenuCustomerReceivables, permissionKey: "financeReceivables.read" },
        { href: `/${locale}/admin/finance/accounts`, label: dictionary.admin.financeMenuAccounts, permissionKey: "financeAccounts.read" },
        { href: `/${locale}/admin/cari`, label: dictionary.admin.cariTitle, permissionKey: "cari.manage" },
        { href: `/${locale}/admin/finance/collections`, label: dictionary.admin.financeMenuCollections, permissionKey: "financeCollections.manage" },
        { href: `/${locale}/admin/finance/payments`, label: dictionary.admin.financeMenuPayments, permissionKey: "financePayments.manage" },
        { href: `/${locale}/admin/finance/bank-cash`, label: dictionary.admin.financeMenuBankCash, permissionKey: "financeBankCash.manage" },
        { href: `/${locale}/admin/finance/bank-reconciliation`, label: dictionary.admin.financeMenuBankReconciliation, permissionKey: "financeBankReconciliation.manage" },
        { href: `/${locale}/admin/finance/instruments`, label: dictionary.admin.financeMenuNegotiableInstruments, permissionKey: "financeInstruments.manage" },
        { href: `/${locale}/admin/finance/transactions`, label: dictionary.admin.financeMenuTransactions, permissionKey: "financeTransactions.manage" },
        { href: `/${locale}/admin/finance/reports`, label: dictionary.admin.financeMenuReports, permissionKey: "financeReports.read" },
        { href: `/${locale}/admin/finance/reports/trial-balance`, label: dictionary.admin.financeMenuTrialBalance, permissionKey: "financeTrialBalance.read" },
        { href: `/${locale}/admin/finance/exports`, label: dictionary.admin.financeMenuAdvisorExports, permissionKey: "finance.audit.read" },
        { href: `/${locale}/admin/finance/ledger-entries`, label: dictionary.admin.financeMenuLedgerEntries, permissionKey: "financeLedgerEntries.read" },
      ],
    },
    {
      href: `/${locale}/admin/integrations`,
      label: dictionary.admin.integrationManager,
      permissionKey: "integrations.read",
      moduleKey: "integrations",
      children: [
        { href: `/${locale}/admin/integrations`, label: dictionary.admin.integrationManager, permissionKey: "integrations.read" },
        { href: `/${locale}/admin/integrations/trendyol`, label: dictionary.admin.integrationMarketplaceTrendyol, permissionKey: "integrationsTrendyol.manage" },
        { href: `/${locale}/admin/integrations/n11`, label: dictionary.admin.integrationMarketplaceN11, permissionKey: "integrationsN11.manage" },
        { href: `/${locale}/admin/integrations/pazarama`, label: dictionary.admin.integrationMarketplacePazarama, permissionKey: "integrationsPazarama.manage" },
        { href: `/${locale}/admin/integrations/hepsiburada`, label: dictionary.admin.integrationMarketplaceHepsiburada, permissionKey: "integrationsHepsiburada.manage" },
        { href: `/${locale}/admin/inventory/external-events`, label: "Harici Stok Eventleri", permissionKey: "inventoryExternalEvents.read" },
      ],
    },
    {
      href: `/${locale}/admin/expense-reports`,
      label: dictionary.admin.expenseReportsTitle,
      permissionKey: "expenseReports.submit",
      moduleKey: "expenseReports",
      children: [
        { href: `/${locale}/admin/expense-reports`, label: dictionary.admin.expenseReportsMenuMine, permissionKey: "expenseReports.submit" },
        { href: `/${locale}/admin/expense-reports/approvals`, label: dictionary.admin.expenseReportsMenuApprovals, permissionKey: "expenseReports.approve" },
        { href: `/${locale}/admin/expense-reports/all`, label: dictionary.admin.expenseReportsMenuAll, permissionKey: "expenseReports.manage" },
        { href: `/${locale}/admin/expense-reports/settings`, label: dictionary.admin.expenseReportsMenuSettings, permissionKey: "expenseSettings.manage" },
      ],
    },
    {
      href: `/${locale}/admin/users`,
      label: dictionary.admin.userManagerGroup,
      permissionKey: "customers.manage",
      moduleKey: "system",
      children: [
        { href: `/${locale}/admin/customers`, label: dictionary.admin.customerManager, permissionKey: "customers.manage" },
        { href: `/${locale}/admin/users`, label: dictionary.admin.userManager, permissionKey: "systemUsers.manage" },
        { href: `/${locale}/admin/roles`, label: dictionary.admin.roleManager, permissionKey: "roles.manage" },
        { href: `/${locale}/admin/audit-logs`, label: dictionary.admin.auditLogMenu, permissionKey: "audit.read" },
      ],
    },
  ];
}
