-- Faz 1 / Dalga 5: Order, OrderItem, OrderStatusHistory, OrderPaymentStatusHistory
-- tenant-scoped hale getirilir. Expand+contract tek migration icinde: nullable
-- ekle -> backfill -> NOT NULL+FK -> composite-unique (yalnizca Order.orderNumber
-- icin) -> deleted index'lerini tenantId ile birlestir.
--
-- Dalga 4'te ogrenilen ders: bazi ortamlarda unique kisitlar duz index degil
-- UNIQUE CONSTRAINT olarak tanimlanmis olabilir (production/local sema farki).
-- Bu yuzden DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi
-- kullanilarak her iki durum da idempotent sekilde kapsanir.

-- AlterTable: Order.tenantId
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
UPDATE "Order" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_orderNumber_key";
DROP INDEX IF EXISTS "Order_orderNumber_key";
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");

DROP INDEX IF EXISTS "Order_deleted_idx";
CREATE INDEX "Order_tenantId_deleted_idx" ON "Order"("tenantId", "deleted");

-- AlterTable: OrderItem.tenantId
ALTER TABLE "OrderItem" ADD COLUMN "tenantId" TEXT;
UPDATE "OrderItem" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "OrderItem_deleted_idx";
CREATE INDEX "OrderItem_tenantId_deleted_idx" ON "OrderItem"("tenantId", "deleted");

-- AlterTable: OrderStatusHistory.tenantId
ALTER TABLE "OrderStatusHistory" ADD COLUMN "tenantId" TEXT;
UPDATE "OrderStatusHistory" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "OrderStatusHistory_deleted_idx";
CREATE INDEX "OrderStatusHistory_tenantId_deleted_idx" ON "OrderStatusHistory"("tenantId", "deleted");

-- AlterTable: OrderPaymentStatusHistory.tenantId
ALTER TABLE "OrderPaymentStatusHistory" ADD COLUMN "tenantId" TEXT;
UPDATE "OrderPaymentStatusHistory" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "OrderPaymentStatusHistory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "OrderPaymentStatusHistory" ADD CONSTRAINT "OrderPaymentStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "OrderPaymentStatusHistory_deleted_idx";
CREATE INDEX "OrderPaymentStatusHistory_tenantId_deleted_idx" ON "OrderPaymentStatusHistory"("tenantId", "deleted");
