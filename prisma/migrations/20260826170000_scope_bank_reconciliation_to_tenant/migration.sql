-- Faz 1 / Dalga 11: BankStatementImport, BankStatementLine,
-- BankReconciliationMatch tenant-scoped hale getirilir. Dalga 9'daki
-- FinancialAccount/CashTransaction'a bagimli. Bu 3 modelin tum unique
-- kisitlari ic FK-id'lerden turedigi icin (importId+lineIndex,
-- statementLineId, cashTransactionId) tenant-composite'e cevrilmez --
-- StockCountLine/InventoryItem.productId presedaniyla tutarli.

-- AlterTable: BankStatementImport.tenantId
ALTER TABLE "BankStatementImport" ADD COLUMN "tenantId" TEXT;
UPDATE "BankStatementImport" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BankStatementImport" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BankStatementImport_tenantId_idx" ON "BankStatementImport"("tenantId");

-- AlterTable: BankStatementLine.tenantId
ALTER TABLE "BankStatementLine" ADD COLUMN "tenantId" TEXT;
UPDATE "BankStatementLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BankStatementLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BankStatementLine_tenantId_idx" ON "BankStatementLine"("tenantId");

-- AlterTable: BankReconciliationMatch.tenantId
ALTER TABLE "BankReconciliationMatch" ADD COLUMN "tenantId" TEXT;
UPDATE "BankReconciliationMatch" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BankReconciliationMatch" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BankReconciliationMatch_tenantId_idx" ON "BankReconciliationMatch"("tenantId");
