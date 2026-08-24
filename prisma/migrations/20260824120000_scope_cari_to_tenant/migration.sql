-- Faz 1 / Dalga 3: Cari (musteri/tedarikci/nakliyeci merkezi kart modeli)
-- tenant-scoped hale getirilir. Genuine public erisim noktalari (checkout,
-- online-collection webhook, incoming-invoice webhook) kod tarafinda platform
-- tenant'ina sabit runWithTenantContext ile zaten sarildi. Expand+contract
-- tek migration icinde: nullable ekle -> backfill -> NOT NULL+FK -> composite-unique.

ALTER TABLE "Cari" ADD COLUMN "tenantId" TEXT;
UPDATE "Cari" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Cari" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Cari" ADD CONSTRAINT "Cari_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Cari_slug_key";
CREATE UNIQUE INDEX "Cari_tenantId_slug_key" ON "Cari"("tenantId", "slug");

DROP INDEX "Cari_deleted_isActive_idx";
CREATE INDEX "Cari_tenantId_deleted_isActive_idx" ON "Cari"("tenantId", "deleted", "isActive");
