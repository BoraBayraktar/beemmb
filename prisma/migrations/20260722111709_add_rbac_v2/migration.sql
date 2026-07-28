CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedDate" TIMESTAMP(3),
  "deletedUserId" TEXT,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "menuKey" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE INDEX "Role_deleted_isActive_idx" ON "Role"("deleted", "isActive");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "Permission_module_action_idx" ON "Permission"("module", "action");
CREATE INDEX "Permission_menuKey_idx" ON "Permission"("menuKey");
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleId_key" ON "UserRoleAssignment"("userId", "roleId");
CREATE INDEX "UserRoleAssignment_roleId_idx" ON "UserRoleAssignment"("roleId");
CREATE INDEX "UserRoleAssignment_assignedByUserId_idx" ON "UserRoleAssignment"("assignedByUserId");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name")
VALUES
  ('perm-admin-access', 'admin.access', 'admin', 'access', NULL, 'Admin panele erişim'),
  ('perm-users-manage', 'users.manage', 'users', 'manage', 'users', 'Kullanıcı ve rol yönetimi'),
  ('perm-audit-read', 'audit.read', 'audit', 'read', 'audit-logs', 'İşlem kayıtlarını görüntüleme'),
  ('perm-audit-export', 'audit.export', 'audit', 'export', 'audit-logs', 'İşlem kayıtlarını dışa aktarma'),
  ('perm-products-read', 'products.read', 'products', 'read', 'products', 'Ürünleri görüntüleme'),
  ('perm-products-manage', 'products.manage', 'products', 'manage', 'products', 'Ürünleri yönetme'),
  ('perm-orders-read', 'orders.read', 'orders', 'read', 'orders', 'Siparişleri görüntüleme'),
  ('perm-orders-manage', 'orders.manage', 'orders', 'manage', 'orders', 'Siparişleri yönetme'),
  ('perm-inventory-read', 'inventory.read', 'inventory', 'read', 'inventory', 'Stokları görüntüleme'),
  ('perm-inventory-manage', 'inventory.manage', 'inventory', 'manage', 'inventory', 'Stokları yönetme'),
  ('perm-documents-read', 'documents.read', 'documents', 'read', 'documents', 'Belgeleri görüntüleme'),
  ('perm-documents-manage', 'documents.manage', 'documents', 'manage', 'documents', 'Belgeleri yönetme'),
  ('perm-finance-read', 'finance.read', 'finance', 'read', 'finance', 'Finansı görüntüleme'),
  ('perm-finance-manage', 'finance.manage', 'finance', 'manage', 'finance', 'Finansı yönetme'),
  ('perm-integrations-read', 'integrations.read', 'integrations', 'read', 'integrations', 'Entegrasyonları görüntüleme'),
  ('perm-integrations-manage', 'integrations.manage', 'integrations', 'manage', 'integrations', 'Entegrasyonları yönetme')
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "isActive")
VALUES
  ('role-super-admin', 'super-admin', 'Süper Yönetici', 'BEEMMB genelindeki tüm menü, API ve güvenlik yönetimi yetkilerine sahiptir.', true, true),
  ('role-operation', 'operation', 'Operasyon', 'Ürün, sipariş, stok ve belge süreçlerini günlük operasyon için yönetir.', true, true),
  ('role-auditor', 'auditor', 'Denetçi', 'İşlem kayıtları ve kritik kayıtları salt okunur izler.', true, true),
  ('role-finance', 'finance', 'Finans', 'Tahsilat, ödeme, cari ve finans raporlarını yönetir.', true, true),
  ('role-catalog-manager', 'catalog-manager', 'Katalog Yöneticisi', 'Ürün, kategori, marka ve vitrin katalog süreçlerini yönetir.', true, true),
  ('role-integration-manager', 'integration-manager', 'Entegrasyon Yöneticisi', 'Pazaryeri ve dış sistem bağlantılarını yönetir.', true, true)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "isActive" = true,
  "deleted" = false,
  "deletedDate" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-' || r."key" || '-' || p."key", r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" = 'super-admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-operation-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'products.read', 'products.manage', 'orders.read', 'orders.manage', 'inventory.read', 'inventory.manage', 'documents.read', 'documents.manage', 'integrations.read')
WHERE r."key" = 'operation'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-auditor-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'audit.read', 'products.read', 'orders.read', 'inventory.read', 'documents.read', 'finance.read', 'integrations.read')
WHERE r."key" = 'auditor'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-finance-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'orders.read', 'documents.read', 'finance.read', 'finance.manage')
WHERE r."key" = 'finance'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-catalog-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'products.read', 'products.manage', 'inventory.read', 'integrations.read')
WHERE r."key" = 'catalog-manager'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-integration-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'products.read', 'orders.read', 'inventory.read', 'integrations.read', 'integrations.manage')
WHERE r."key" = 'integration-manager'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId")
SELECT 'ura-' || u."id" || '-super-admin', u."id", r."id"
FROM "User" u
JOIN "Role" r ON r."key" = 'super-admin'
WHERE u."deleted" = false AND u."role" = 'ADMIN'
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId")
SELECT 'ura-' || u."id" || '-operation', u."id", r."id"
FROM "User" u
JOIN "Role" r ON r."key" = 'operation'
WHERE u."deleted" = false AND u."role" = 'EDITOR'
ON CONFLICT ("userId", "roleId") DO NOTHING;
