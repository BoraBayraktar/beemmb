-- Faz 1 / Dalga 10: CollectionRecord, PaymentRecord, FinanceAllocationLink
-- tenant-scoped hale getirilir. Order'a en yakin finans grubu, Dalga 9'un
-- (FinancialAccount/CashTransaction/FinanceLedgerAccount/FinanceAccountEntry)
-- uzerine oturuyor.
--
-- CollectionRecord'in (onlineCollectionProvider, onlineCollectionExternalId)
-- compound unique'i -- online odeme saglayicisindan gelen dedupe anahtari,
-- ExternalStockEvent.eventKey/InventoryIntegrationMapping presedaniyla
-- tutarli sekilde tenant-composite'e cevrildi.
--
-- DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi, prod/local sema
-- farkina karsi onceden dayanikli olacak sekilde kullanilir.

-- AlterTable: CollectionRecord.tenantId
ALTER TABLE "CollectionRecord" ADD COLUMN "tenantId" TEXT;
UPDATE "CollectionRecord" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "CollectionRecord" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CollectionRecord" ADD CONSTRAINT "CollectionRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CollectionRecord" DROP CONSTRAINT IF EXISTS "CollectionRecord_onlineCollectionProvider_onlineCollectionE_key";
DROP INDEX IF EXISTS "CollectionRecord_onlineCollectionProvider_onlineCollectionE_key";
CREATE UNIQUE INDEX "CollectionRecord_tenantId_onlineCollectionProvider_onlineC_key" ON "CollectionRecord"("tenantId", "onlineCollectionProvider", "onlineCollectionExternalId");

CREATE INDEX "CollectionRecord_tenantId_idx" ON "CollectionRecord"("tenantId");

-- AlterTable: PaymentRecord.tenantId
ALTER TABLE "PaymentRecord" ADD COLUMN "tenantId" TEXT;
UPDATE "PaymentRecord" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "PaymentRecord" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PaymentRecord_tenantId_idx" ON "PaymentRecord"("tenantId");

-- AlterTable: FinanceAllocationLink.tenantId
ALTER TABLE "FinanceAllocationLink" ADD COLUMN "tenantId" TEXT;
UPDATE "FinanceAllocationLink" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "FinanceAllocationLink" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinanceAllocationLink_tenantId_idx" ON "FinanceAllocationLink"("tenantId");
