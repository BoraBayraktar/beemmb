-- Faz 1 / Dalga 6: InventoryItem, InventoryLevel, StockReservation, InventoryMovement
-- tenant-scoped hale getirilir. Bu dalgada bilincli karar: mevcut unique
-- kisitlar (InventoryItem.productId, InventoryItem.productVariantId,
-- InventoryLevel'in (inventoryItemId, warehouseId) kisiti) tenant-composite'e
-- CEVRILMIYOR -- bunlar zaten tenant-scoped Product/InventoryItem'a bagli ic
-- FK id'leri oldugundan cakisma riski yok; sadece tenantId kolonu+FK+index
-- eklenir. Expand+contract tek migration icinde: nullable ekle -> backfill ->
-- NOT NULL+FK -> deleted index'ini tenantId ile birlestir (yalniz InventoryItem'da
-- var, digerlerinde deleted alani yok).

-- AlterTable: InventoryItem.tenantId
ALTER TABLE "InventoryItem" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryItem" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "InventoryItem_deleted_idx";
CREATE INDEX "InventoryItem_tenantId_deleted_idx" ON "InventoryItem"("tenantId", "deleted");

-- AlterTable: InventoryLevel.tenantId
ALTER TABLE "InventoryLevel" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryLevel" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryLevel" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryLevel_tenantId_idx" ON "InventoryLevel"("tenantId");

-- AlterTable: StockReservation.tenantId
ALTER TABLE "StockReservation" ADD COLUMN "tenantId" TEXT;
UPDATE "StockReservation" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "StockReservation" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StockReservation_tenantId_idx" ON "StockReservation"("tenantId");

-- AlterTable: InventoryMovement.tenantId
ALTER TABLE "InventoryMovement" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryMovement" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");
