-- Faz 1 / Dalga 9: Finans modulunun cekirdegi -- FinancialAccount,
-- CashTransaction, FinanceLedgerAccount, FinanceAccountEntry tenant-scoped
-- hale getirilir. Bu, finans modulunun ilk dalgasi; diger tum finans
-- modelleri (Collections/Payments, Bank Reconciliation, Negotiable
-- Instrument, BusinessDocument/e-fatura, Incoming Invoice) bu 4 modele FK
-- ile bagli oldugundan sonraki dalgalarin temelini olusturur.
--
-- FinanceLedgerAccount.code (muhasebe hesap plani kodu, is-verisi anlamli --
-- farkli tenant'lar ayni kodu [orn. "100", "600"] kullanacagindan cakisma
-- riski yuksek) tenant-composite'e cevrildi. FinanceAccountEntry.lineKey
-- ic cuid'lerden turetildigi (collectionRecordId/paymentRecordId/
-- cashTransactionId/line.id + sabit ekler) icin zaten global-tenant-safe --
-- StockCountLine/InventoryItem.productId presedaniyla tutarli sekilde
-- degistirilmedi.
--
-- DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi, prod/local sema
-- farkina karsi onceden dayanikli olacak sekilde kullanilir.

-- AlterTable: FinancialAccount.tenantId
ALTER TABLE "FinancialAccount" ADD COLUMN "tenantId" TEXT;
UPDATE "FinancialAccount" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "FinancialAccount" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinancialAccount_tenantId_idx" ON "FinancialAccount"("tenantId");

-- AlterTable: CashTransaction.tenantId
ALTER TABLE "CashTransaction" ADD COLUMN "tenantId" TEXT;
UPDATE "CashTransaction" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "CashTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CashTransaction_tenantId_idx" ON "CashTransaction"("tenantId");

-- AlterTable: FinanceLedgerAccount.tenantId
ALTER TABLE "FinanceLedgerAccount" ADD COLUMN "tenantId" TEXT;
UPDATE "FinanceLedgerAccount" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "FinanceLedgerAccount" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FinanceLedgerAccount" ADD CONSTRAINT "FinanceLedgerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceLedgerAccount" DROP CONSTRAINT IF EXISTS "FinanceLedgerAccount_code_key";
DROP INDEX IF EXISTS "FinanceLedgerAccount_code_key";
CREATE UNIQUE INDEX "FinanceLedgerAccount_tenantId_code_key" ON "FinanceLedgerAccount"("tenantId", "code");

CREATE INDEX "FinanceLedgerAccount_tenantId_idx" ON "FinanceLedgerAccount"("tenantId");

-- AlterTable: FinanceAccountEntry.tenantId
ALTER TABLE "FinanceAccountEntry" ADD COLUMN "tenantId" TEXT;
UPDATE "FinanceAccountEntry" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "FinanceAccountEntry" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinanceAccountEntry_tenantId_idx" ON "FinanceAccountEntry"("tenantId");
