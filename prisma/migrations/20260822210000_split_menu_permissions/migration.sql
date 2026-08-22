-- Rol yönetimi ekranında her menü öğesinin bağımsız seçilebilmesi için,
-- birden fazla menü öğesi tarafından paylaşılan "şemsiye" izinler
-- (products.manage, inventory.manage, finance.manage, vb.) ince taneli
-- (granular), menü-başına-bir alt izne bölünüyor. Eski şemsiye izinler
-- SİLİNMİYOR/DEĞİŞTİRİLMİYOR — genel/ortak API endpoint'leri ve geriye
-- dönük uyumluluk için geçerliliklerini koruyorlar. Bu migration sadece
-- EKLEME yapar: yeni izin satırları + mevcut şemsiye izne sahip her role
-- otomatik olarak yeni alt izinleri de bağlar (additive, erişim kaybı yok).

INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name", "updatedAt")
VALUES
  ('perm-product-questions-read', 'productQuestions.read', 'productQuestions', 'read', 'product-questions', 'Ürün sorularını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-product-questions-manage', 'productQuestions.manage', 'productQuestions', 'manage', 'product-questions', 'Ürün sorularını yanıtlama/yönetme', CURRENT_TIMESTAMP),
  ('perm-categories-manage', 'categories.manage', 'categories', 'manage', 'categories', 'Kategorileri yönetme', CURRENT_TIMESTAMP),
  ('perm-storefront-manage', 'storefront.manage', 'storefront', 'manage', 'storefront', 'Vitrini yönetme', CURRENT_TIMESTAMP),
  ('perm-product-attributes-manage', 'productAttributes.manage', 'productAttributes', 'manage', 'product-attributes', 'Ürün özelliklerini yönetme', CURRENT_TIMESTAMP),
  ('perm-brands-manage', 'brands.manage', 'brands', 'manage', 'brands', 'Markaları yönetme', CURRENT_TIMESTAMP),
  ('perm-orders-shipping-report-read', 'ordersShippingReport.read', 'orders', 'shippingReportRead', 'orders-shipping-report', 'Kargo firması raporunu görüntüleme', CURRENT_TIMESTAMP),
  ('perm-inventory-products-read', 'inventoryProducts.read', 'inventory', 'productsRead', 'inventory-products', 'Ürün stoklarını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-inventory-transactions-read', 'inventoryTransactions.read', 'inventory', 'transactionsRead', 'inventory-transactions', 'Stok hareketlerini görüntüleme', CURRENT_TIMESTAMP),
  ('perm-inventory-exports-read', 'inventoryExports.read', 'inventory', 'exportsRead', 'inventory-exports', 'Stok dışa aktarım geçmişini görüntüleme', CURRENT_TIMESTAMP),
  ('perm-inventory-external-events-read', 'inventoryExternalEvents.read', 'inventory', 'externalEventsRead', 'inventory-external-events', 'Harici stok eventlerini görüntüleme', CURRENT_TIMESTAMP),
  ('perm-inventory-quick-actions-manage', 'inventoryQuickActions.manage', 'inventory', 'quickActionsManage', 'inventory-quick-actions', 'Hızlı barkod işlemlerini yönetme', CURRENT_TIMESTAMP),
  ('perm-inventory-counts-manage', 'inventoryCounts.manage', 'inventory', 'countsManage', 'inventory-counts', 'Stok sayımını yönetme', CURRENT_TIMESTAMP),
  ('perm-warehouses-manage', 'warehouses.manage', 'warehouses', 'manage', 'inventory-warehouses', 'Depoları yönetme', CURRENT_TIMESTAMP),
  ('perm-inventory-external-events-manage', 'inventoryExternalEvents.manage', 'inventory', 'externalEventsManage', 'inventory-external-events', 'Harici stok eventlerini yönetme', CURRENT_TIMESTAMP),
  ('perm-documents-pending-invoices-manage', 'documentsPendingInvoices.manage', 'documents', 'pendingInvoicesManage', 'documents-pending-invoices', 'Bekleyen faturaları yönetme', CURRENT_TIMESTAMP),
  ('perm-documents-providers-manage', 'documentsProviders.manage', 'documents', 'providersManage', 'documents-providers', 'Belge sağlayıcılarını yönetme', CURRENT_TIMESTAMP),
  ('perm-documents-webhooks-manage', 'documentsWebhooks.manage', 'documents', 'webhooksManage', 'documents-webhooks', 'Belge webhooklarını yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-payables-read', 'financePayables.read', 'finance', 'payablesRead', 'finance-payables', 'Tedarikçi borçlarını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-finance-receivables-read', 'financeReceivables.read', 'finance', 'receivablesRead', 'finance-receivables', 'Müşteri alacaklarını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-finance-reports-read', 'financeReports.read', 'finance', 'reportsRead', 'finance-reports', 'Finans raporlarını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-finance-trial-balance-read', 'financeTrialBalance.read', 'finance', 'trialBalanceRead', 'finance-trial-balance', 'Mizanı görüntüleme', CURRENT_TIMESTAMP),
  ('perm-finance-ledger-entries-read', 'financeLedgerEntries.read', 'finance', 'ledgerEntriesRead', 'finance-ledger-entries', 'Defter kayıtlarını görüntüleme', CURRENT_TIMESTAMP),
  ('perm-finance-accounts-read', 'financeAccounts.read', 'finance', 'accountsRead', 'finance-accounts', 'Hesapları görüntüleme', CURRENT_TIMESTAMP),
  ('perm-cari-manage', 'cari.manage', 'cari', 'manage', 'cari', 'Carileri yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-collections-manage', 'financeCollections.manage', 'finance', 'collectionsManage', 'finance-collections', 'Tahsilatları yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-payments-manage', 'financePayments.manage', 'finance', 'paymentsManage', 'finance-payments', 'Ödemeleri yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-bank-cash-manage', 'financeBankCash.manage', 'finance', 'bankCashManage', 'finance-bank-cash', 'Banka ve kasayı yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-bank-reconciliation-manage', 'financeBankReconciliation.manage', 'finance', 'bankReconciliationManage', 'finance-bank-reconciliation', 'Banka mutabakatını yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-instruments-manage', 'financeInstruments.manage', 'finance', 'instrumentsManage', 'finance-instruments', 'Kıymetli evrakları yönetme', CURRENT_TIMESTAMP),
  ('perm-finance-transactions-manage', 'financeTransactions.manage', 'finance', 'transactionsManage', 'finance-transactions', 'Finans işlemlerini yönetme', CURRENT_TIMESTAMP),
  ('perm-integrations-trendyol-manage', 'integrationsTrendyol.manage', 'integrations', 'trendyolManage', 'integrations-trendyol', 'Trendyol entegrasyonunu yönetme', CURRENT_TIMESTAMP),
  ('perm-integrations-n11-manage', 'integrationsN11.manage', 'integrations', 'n11Manage', 'integrations-n11', 'N11 entegrasyonunu yönetme', CURRENT_TIMESTAMP),
  ('perm-integrations-pazarama-manage', 'integrationsPazarama.manage', 'integrations', 'pazaramaManage', 'integrations-pazarama', 'Pazarama entegrasyonunu yönetme', CURRENT_TIMESTAMP),
  ('perm-integrations-hepsiburada-manage', 'integrationsHepsiburada.manage', 'integrations', 'hepsiburadaManage', 'integrations-hepsiburada', 'Hepsiburada entegrasyonunu yönetme', CURRENT_TIMESTAMP),
  ('perm-customers-manage', 'customers.manage', 'users', 'customersManage', 'customers', 'Müşteri kullanıcılarını yönetme', CURRENT_TIMESTAMP),
  ('perm-system-users-manage', 'systemUsers.manage', 'users', 'systemUsersManage', 'system-users', 'Sistem kullanıcılarını yönetme', CURRENT_TIMESTAMP),
  ('perm-roles-manage', 'roles.manage', 'users', 'rolesManage', 'roles', 'Rolleri yönetme', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Mevcut "products.read" sahibi her role: productQuestions.read de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('productQuestions.read')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'products.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "products.manage" sahibi her role: kategori/vitrin/özellik/marka yönetimi + soru yanıtlama da eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('categories.manage', 'storefront.manage', 'productAttributes.manage', 'brands.manage', 'productQuestions.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'products.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "orders.read" sahibi her role: kargo firması raporu da eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('ordersShippingReport.read')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'orders.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "inventory.read" sahibi her role: ürün stokları/hareketler/dışa aktarım geçmişi de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('inventoryProducts.read', 'inventoryTransactions.read', 'inventoryExports.read')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'inventory.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "inventory.manage" sahibi her role: hızlı barkod/sayım/depo yönetimi de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('inventoryQuickActions.manage', 'inventoryCounts.manage', 'warehouses.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'inventory.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- "Harici Stok Eventleri" eskiden hem inventory.* hem integrations.read ile karışık kullanılıyordu;
-- ikisinden birine sahip olan roller de yeni bağımsız izne birleşim (union) mantığıyla sahip olur.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'inventoryExternalEvents.read'
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" IN ('inventory.read', 'integrations.read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'inventoryExternalEvents.manage'
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" IN ('inventory.manage', 'integrations.manage')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "documents.manage" sahibi her role: bekleyen faturalar/sağlayıcılar/webhooks da eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('documentsPendingInvoices.manage', 'documentsProviders.manage', 'documentsWebhooks.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'documents.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "finance.read" sahibi her role: alt rapor/görünüm sayfaları da eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('financePayables.read', 'financeReceivables.read', 'financeReports.read', 'financeTrialBalance.read', 'financeLedgerEntries.read')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'finance.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- "Hesaplar" sayfası salt-okunur olduğu için finance.read VEYA finance.manage sahibi roller alır.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'financeAccounts.read'
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" IN ('finance.read', 'finance.manage')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "finance.manage" sahibi her role: cari/tahsilat/ödeme/banka/kıymetli evrak/işlemler de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('cari.manage', 'financeCollections.manage', 'financePayments.manage', 'financeBankCash.manage', 'financeBankReconciliation.manage', 'financeInstruments.manage', 'financeTransactions.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'finance.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "integrations.manage" sahibi her role: pazaryeri-özel yönetim izinleri de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('integrationsTrendyol.manage', 'integrationsN11.manage', 'integrationsPazarama.manage', 'integrationsHepsiburada.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'integrations.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Mevcut "users.manage" sahibi her role: müşteri/sistem kullanıcıları/rol yönetimi de eklenir.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('customers.manage', 'systemUsers.manage', 'roles.manage')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" op ON op."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND op."key" = 'users.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Süper admin rolü, yukarıdaki koşullardan bağımsız olarak yeni izinlerin tamamını alır.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-super-admin-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" = 'super-admin'
  AND p."id" LIKE 'perm-%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
