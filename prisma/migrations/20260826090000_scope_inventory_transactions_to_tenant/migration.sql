-- Faz 1 / Dalga 7: StockCount, StockCountLine, InventoryAlert,
-- InventoryTransaction, InventoryTransactionLine, ExternalStockEvent
-- tenant-scoped hale getirilir. Is-verisi anlamli unique alanlar
-- (StockCount.countNumber, InventoryTransaction.transactionNumber,
-- ExternalStockEvent.eventKey) tenant-composite'e cevrilir; StockCountLine'in
-- ic FK-id compound'u (stockCountId, inventoryItemId, warehouseId) Dalga 6'daki
-- kararla tutarli sekilde degistirilmez (zaten tenant-scoped modellere bagli).
-- DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi, prod/local sema
-- farkina karsi onceden dayanikli olacak sekilde kullanilir.

-- AlterTable: StockCount.tenantId
ALTER TABLE "StockCount" ADD COLUMN "tenantId" TEXT;
UPDATE "StockCount" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "StockCount" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockCount" DROP CONSTRAINT IF EXISTS "StockCount_countNumber_key";
DROP INDEX IF EXISTS "StockCount_countNumber_key";
CREATE UNIQUE INDEX "StockCount_tenantId_countNumber_key" ON "StockCount"("tenantId", "countNumber");
CREATE INDEX "StockCount_tenantId_idx" ON "StockCount"("tenantId");

-- AlterTable: StockCountLine.tenantId
ALTER TABLE "StockCountLine" ADD COLUMN "tenantId" TEXT;
UPDATE "StockCountLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "StockCountLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StockCountLine_tenantId_idx" ON "StockCountLine"("tenantId");

-- AlterTable: InventoryAlert.tenantId
ALTER TABLE "InventoryAlert" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryAlert" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryAlert" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryAlert_tenantId_idx" ON "InventoryAlert"("tenantId");

-- AlterTable: InventoryTransaction.tenantId
ALTER TABLE "InventoryTransaction" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryTransaction" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_transactionNumber_key";
DROP INDEX IF EXISTS "InventoryTransaction_transactionNumber_key";
CREATE UNIQUE INDEX "InventoryTransaction_tenantId_transactionNumber_key" ON "InventoryTransaction"("tenantId", "transactionNumber");
CREATE INDEX "InventoryTransaction_tenantId_idx" ON "InventoryTransaction"("tenantId");

-- AlterTable: InventoryTransactionLine.tenantId
ALTER TABLE "InventoryTransactionLine" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryTransactionLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryTransactionLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryTransactionLine" ADD CONSTRAINT "InventoryTransactionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryTransactionLine_tenantId_idx" ON "InventoryTransactionLine"("tenantId");

-- AlterTable: ExternalStockEvent.tenantId
ALTER TABLE "ExternalStockEvent" ADD COLUMN "tenantId" TEXT;
UPDATE "ExternalStockEvent" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ExternalStockEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ExternalStockEvent" ADD CONSTRAINT "ExternalStockEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalStockEvent" DROP CONSTRAINT IF EXISTS "ExternalStockEvent_eventKey_key";
DROP INDEX IF EXISTS "ExternalStockEvent_eventKey_key";
CREATE UNIQUE INDEX "ExternalStockEvent_tenantId_eventKey_key" ON "ExternalStockEvent"("tenantId", "eventKey");
CREATE INDEX "ExternalStockEvent_tenantId_idx" ON "ExternalStockEvent"("tenantId");
