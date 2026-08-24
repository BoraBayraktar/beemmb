-- Faz 1 / Dalga 1: Warehouse tenant-scoped hale getirilir.
-- Warehouse sadece admin/stok yonetimi tarafindan kullanilir, hicbir anonim/public
-- rota bu modele erismiyor (Faz 1 arastirmasinda dogrulandi) -- bu yuzden guvenle
-- tenant-scope edilebilen ilk is-verisi modeli. Expand+contract tek migration
-- icinde: nullable ekle -> backfill -> NOT NULL+FK -> composite-unique donusumu.

-- AlterTable: tenantId eklenir, mevcut tum satirlar platform tenant'ina baglanir
ALTER TABLE "Warehouse" ADD COLUMN "tenantId" TEXT;

UPDATE "Warehouse" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;

ALTER TABLE "Warehouse" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- code artik global degil, tenant-composite unique
DROP INDEX "Warehouse_code_key";
CREATE UNIQUE INDEX "Warehouse_tenantId_code_key" ON "Warehouse"("tenantId", "code");

-- isActive/isDefault index'i tenantId ile genisletilir
DROP INDEX "Warehouse_isActive_isDefault_idx";
CREATE INDEX "Warehouse_tenantId_isActive_isDefault_idx" ON "Warehouse"("tenantId", "isActive", "isDefault");
