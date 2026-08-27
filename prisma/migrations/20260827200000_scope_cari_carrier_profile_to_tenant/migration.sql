-- Faz 1 / Dalga 18b: CariCarrierProfile (Cari birlestirme commit'inden --
-- kalan, plana daha once girmemis model) tenant-scoped hale getirilir.
-- 1:1 internal FK unique kisiti (cariId) degismez. Backfill, bagli Cari'nin
-- gercek tenantId'sinden yapilir.

ALTER TABLE "CariCarrierProfile" ADD COLUMN "tenantId" TEXT;
UPDATE "CariCarrierProfile" AS cp SET "tenantId" = c."tenantId" FROM "Cari" AS c WHERE cp."cariId" = c."id" AND cp."tenantId" IS NULL;
UPDATE "CariCarrierProfile" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "CariCarrierProfile" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CariCarrierProfile" ADD CONSTRAINT "CariCarrierProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CariCarrierProfile_tenantId_idx" ON "CariCarrierProfile"("tenantId");
