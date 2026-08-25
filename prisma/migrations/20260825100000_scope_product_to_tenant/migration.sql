-- Faz 1 / Dalga 4: Product ve ProductVariant tenant-scoped hale getirilir.
-- Public magaza tarafinda Product'a dokunan tum yollar (catalog.service.ts:
-- listProducts, getProductBySlug, createReview, createQuestion) kod tarafinda
-- platform tenant'ina sabit runWithTenantContext ile zaten sarildi. Expand+
-- contract tek migration icinde: nullable ekle -> backfill -> NOT NULL+FK ->
-- composite-unique donusumu (slug ve sku ayri ayri).

-- AlterTable: Product.tenantId
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
UPDATE "Product" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Not: bazi ortamlarda (ör. production) slug/sku unique kisitlari duz index
-- degil, UNIQUE CONSTRAINT olarak olusturulmus olabilir; DROP CONSTRAINT
-- IF EXISTS + DROP INDEX IF EXISTS ikilisi her iki durumu da idempotent
-- sekilde kapsar.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_slug_key";
DROP INDEX IF EXISTS "Product_slug_key";
CREATE UNIQUE INDEX "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key";
DROP INDEX IF EXISTS "Product_sku_key";
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

DROP INDEX "Product_deleted_idx";
CREATE INDEX "Product_tenantId_deleted_idx" ON "Product"("tenantId", "deleted");

-- AlterTable: ProductVariant.tenantId
ALTER TABLE "ProductVariant" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductVariant" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_slug_key";
DROP INDEX IF EXISTS "ProductVariant_slug_key";
CREATE UNIQUE INDEX "ProductVariant_tenantId_slug_key" ON "ProductVariant"("tenantId", "slug");

ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_sku_key";
DROP INDEX IF EXISTS "ProductVariant_sku_key";
CREATE UNIQUE INDEX "ProductVariant_tenantId_sku_key" ON "ProductVariant"("tenantId", "sku");
