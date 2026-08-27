-- Faz 1 / Dalga 17: Satinalma/Promosyon ailesi --
-- Promotion, PurchaseReceipt, PurchaseReceiptLine tenant-scoped hale
-- getirilir. code ve receiptNumber tenant-composite unique kisitlara
-- donusturulur. PurchaseReceipt.transactionId (1:1 internal FK) degismez.

ALTER TABLE "Promotion" ADD COLUMN "tenantId" TEXT;
UPDATE "Promotion" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Promotion" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_code_key";
DROP INDEX IF EXISTS "Promotion_code_key";
CREATE UNIQUE INDEX "Promotion_tenantId_code_key" ON "Promotion"("tenantId", "code");

CREATE INDEX "Promotion_tenantId_idx" ON "Promotion"("tenantId");


ALTER TABLE "PurchaseReceipt" ADD COLUMN "tenantId" TEXT;
UPDATE "PurchaseReceipt" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "PurchaseReceipt" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceipt" DROP CONSTRAINT IF EXISTS "PurchaseReceipt_receiptNumber_key";
DROP INDEX IF EXISTS "PurchaseReceipt_receiptNumber_key";
CREATE UNIQUE INDEX "PurchaseReceipt_tenantId_receiptNumber_key" ON "PurchaseReceipt"("tenantId", "receiptNumber");

CREATE INDEX "PurchaseReceipt_tenantId_idx" ON "PurchaseReceipt"("tenantId");


ALTER TABLE "PurchaseReceiptLine" ADD COLUMN "tenantId" TEXT;
UPDATE "PurchaseReceiptLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "PurchaseReceiptLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PurchaseReceiptLine_tenantId_idx" ON "PurchaseReceiptLine"("tenantId");
