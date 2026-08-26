-- Faz 1 / Dalga 8: InventoryIntegrationMapping, InventoryExportHistory,
-- UserInventoryPreference, InventoryHistoryEvent tenant-scoped hale getirilir.
-- Envanter alani bu dalgayla tamamen tenant-scoped olur.
--
-- InventoryIntegrationMapping'in iki composite-unique kisiti tenant-composite'e
-- cevrilir (externalProductId/externalSku harici sistemden gelen degerler,
-- farkli tenant'larin ayni kanaldan cakisan degerler uretmesi teorik olarak
-- mumkun -- ExternalStockEvent.eventKey ile ayni gerekce, Dalga 7).
-- UserInventoryPreference.userId ic FK-id oldugundan (Dalga 6/7 karariyla
-- tutarli) degistirilmez.
--
-- DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi, prod/local sema
-- farkina karsi onceden dayanikli olacak sekilde kullanilir.

-- AlterTable: InventoryIntegrationMapping.tenantId
ALTER TABLE "InventoryIntegrationMapping" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryIntegrationMapping" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryIntegrationMapping" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryIntegrationMapping" ADD CONSTRAINT "InventoryIntegrationMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryIntegrationMapping" DROP CONSTRAINT IF EXISTS "InventoryIntegrationMapping_channel_externalProductId_exter_key";
DROP INDEX IF EXISTS "InventoryIntegrationMapping_channel_externalProductId_exter_key";
CREATE UNIQUE INDEX "InventoryIntegrationMapping_tenantId_channel_externalProdu_key" ON "InventoryIntegrationMapping"("tenantId", "channel", "externalProductId", "externalWarehouseCode");

ALTER TABLE "InventoryIntegrationMapping" DROP CONSTRAINT IF EXISTS "InventoryIntegrationMapping_channel_externalSku_externalWar_key";
DROP INDEX IF EXISTS "InventoryIntegrationMapping_channel_externalSku_externalWar_key";
CREATE UNIQUE INDEX "InventoryIntegrationMapping_tenantId_channel_externalSku_e_key" ON "InventoryIntegrationMapping"("tenantId", "channel", "externalSku", "externalWarehouseCode");

CREATE INDEX "InventoryIntegrationMapping_tenantId_idx" ON "InventoryIntegrationMapping"("tenantId");

-- AlterTable: InventoryExportHistory.tenantId
ALTER TABLE "InventoryExportHistory" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryExportHistory" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryExportHistory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryExportHistory" ADD CONSTRAINT "InventoryExportHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryExportHistory_tenantId_idx" ON "InventoryExportHistory"("tenantId");

-- AlterTable: UserInventoryPreference.tenantId
ALTER TABLE "UserInventoryPreference" ADD COLUMN "tenantId" TEXT;
UPDATE "UserInventoryPreference" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "UserInventoryPreference" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UserInventoryPreference" ADD CONSTRAINT "UserInventoryPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "UserInventoryPreference_tenantId_idx" ON "UserInventoryPreference"("tenantId");

-- AlterTable: InventoryHistoryEvent.tenantId
ALTER TABLE "InventoryHistoryEvent" ADD COLUMN "tenantId" TEXT;
UPDATE "InventoryHistoryEvent" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "InventoryHistoryEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryHistoryEvent" ADD CONSTRAINT "InventoryHistoryEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryHistoryEvent_tenantId_idx" ON "InventoryHistoryEvent"("tenantId");
