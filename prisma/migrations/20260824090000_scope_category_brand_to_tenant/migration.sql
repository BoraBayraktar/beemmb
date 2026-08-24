-- Faz 1 / Dalga 2: Category ve Brand tenant-scoped hale getirilir.
-- Category'nin tek public erisim noktasi (CatalogRepository.listCategories())
-- platform tenant'ina sabit runWithTenantContext ile sarildi (kod tarafinda,
-- bu migration'la ilgisi yok). Brand'in hic public erisimi yok. Expand+contract
-- tek migration icinde: nullable ekle -> backfill -> NOT NULL+FK -> composite-unique.

-- AlterTable: Category.tenantId
ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
UPDATE "Category" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Category_slug_key";
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

DROP INDEX "Category_deleted_idx";
CREATE INDEX "Category_tenantId_deleted_idx" ON "Category"("tenantId", "deleted");

-- AlterTable: Brand.tenantId
ALTER TABLE "Brand" ADD COLUMN "tenantId" TEXT;
UPDATE "Brand" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Brand" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Brand_slug_key";
CREATE UNIQUE INDEX "Brand_tenantId_slug_key" ON "Brand"("tenantId", "slug");

DROP INDEX "Brand_deleted_isActive_idx";
CREATE INDEX "Brand_tenantId_deleted_isActive_idx" ON "Brand"("tenantId", "deleted", "isActive");
