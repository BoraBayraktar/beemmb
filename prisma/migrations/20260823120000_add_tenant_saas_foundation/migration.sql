-- Faz 0: Multi-tenant SaaS mimarisinin temeli.
-- Tenant/ModuleCatalog/TenantModuleEntitlement modelleri eklenir, mevcut TUM
-- veri "beemmb" adinda varsayilan bir platform tenant'ina baglanir (backfill).
-- Bu migration additive'dir: mevcut kullanicilarin davranisi degismez, sadece
-- her User artik bir Tenant'a ait olur. Is-verisi modellerine (Product, Order,
-- Finance, vb.) tenantId eklenmesi ayri bir faz (Faz 1) olarak planlanmistir.

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxNumber" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPlatformTenant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleCatalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantModuleEntitlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantModuleEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_deleted_status_idx" ON "Tenant"("deleted", "status");

CREATE UNIQUE INDEX "ModuleCatalog_key_key" ON "ModuleCatalog"("key");

CREATE UNIQUE INDEX "TenantModuleEntitlement_tenantId_moduleKey_key" ON "TenantModuleEntitlement"("tenantId", "moduleKey");
CREATE INDEX "TenantModuleEntitlement_tenantId_isEnabled_idx" ON "TenantModuleEntitlement"("tenantId", "isEnabled");

-- AddForeignKey
ALTER TABLE "TenantModuleEntitlement" ADD CONSTRAINT "TenantModuleEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantModuleEntitlement" ADD CONSTRAINT "TenantModuleEntitlement_moduleKey_fkey" FOREIGN KEY ("moduleKey") REFERENCES "ModuleCatalog"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: varsayilan platform tenant'i (Beemmb'nin kendisi)
INSERT INTO "Tenant" ("id", "slug", "name", "contactEmail", "isPlatformTenant", "status", "updatedAt")
VALUES ('tenant-beemmb-platform', 'beemmb', 'Beemmb', 'bora.bayraktar@hotmail.com', true, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Seed: modul katalogu (admin-menu.ts'teki ust menu gruplariyla eslesir)
INSERT INTO "ModuleCatalog" ("id", "key", "name", "sortOrder", "updatedAt")
VALUES
  ('module-products', 'products', 'Urun Yonetimi', 1, CURRENT_TIMESTAMP),
  ('module-inventory', 'inventory', 'Stok Yonetimi', 2, CURRENT_TIMESTAMP),
  ('module-documents', 'documents', 'Belge Yonetimi', 3, CURRENT_TIMESTAMP),
  ('module-incoming-invoices', 'incomingInvoices', 'Gelen Faturalar', 4, CURRENT_TIMESTAMP),
  ('module-finance', 'finance', 'Finans', 5, CURRENT_TIMESTAMP),
  ('module-integrations', 'integrations', 'Entegrasyonlar', 6, CURRENT_TIMESTAMP),
  ('module-system', 'system', 'Sistem ve Kullanicilar', 7, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed: platform tenant'i tum moduller icin yetkilendirilir (Beemmb kendi
-- panelinde her seyi kullanmaya devam eder, hicbir menu kaybolmaz).
INSERT INTO "TenantModuleEntitlement" ("id", "tenantId", "moduleKey", "isEnabled", "updatedAt")
SELECT 'ent-beemmb-' || m."key", t."id", m."key", true, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN "ModuleCatalog" m
WHERE t."slug" = 'beemmb'
ON CONFLICT ("tenantId", "moduleKey") DO NOTHING;

-- AlterTable: User.tenantId eklenir, mevcut tum kullanicilar backfill edilir,
-- ardindan NOT NULL + FK ile zorunlu kilinir (tek migration icinde expand+contract,
-- User tablosu kucuk oldugu icin guvenli).
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;

UPDATE "User" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
