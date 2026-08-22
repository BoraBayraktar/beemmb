import type { Dictionary, Locale } from "@/lib/i18n";

export type AdminMenuItem = {
  href: string;
  label: string;
  permissionKey?: string;
  children?: AdminMenuItem[];
};

export function buildAdminMenuTree(dictionary: Dictionary, locale: Locale): AdminMenuItem[] {
  return [
    {
      href: `/${locale}/admin/products`,
      label: dictionary.admin.productManager,
      permissionKey: "products.read",
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
      href: `/${locale}/admin/users`,
      label: dictionary.admin.userManagerGroup,
      permissionKey: "customers.manage",
      children: [
        { href: `/${locale}/admin/customers`, label: dictionary.admin.customerManager, permissionKey: "customers.manage" },
        { href: `/${locale}/admin/users`, label: dictionary.admin.userManager, permissionKey: "systemUsers.manage" },
        { href: `/${locale}/admin/roles`, label: dictionary.admin.roleManager, permissionKey: "roles.manage" },
        { href: `/${locale}/admin/audit-logs`, label: dictionary.admin.auditLogMenu, permissionKey: "audit.read" },
      ],
    },
  ];
}
