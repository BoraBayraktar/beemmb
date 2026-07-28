-- CreateEnum
CREATE TYPE "FinanceLedgerAccountCategory" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceAccountEntrySide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FinanceAccountEntrySourceType" AS ENUM ('CASH_TRANSACTION', 'COLLECTION', 'PAYMENT');

-- CreateTable
CREATE TABLE "FinanceLedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FinanceLedgerAccountCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceLedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccountEntry" (
    "id" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "side" "FinanceAccountEntrySide" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "sourceType" "FinanceAccountEntrySourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceReference" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "customerAccountId" TEXT,
    "supplierId" TEXT,
    "financialAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceLedgerAccount_code_key" ON "FinanceLedgerAccount"("code");

-- CreateIndex
CREATE INDEX "FinanceLedgerAccount_isActive_code_idx" ON "FinanceLedgerAccount"("isActive", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccountEntry_lineKey_key" ON "FinanceAccountEntry"("lineKey");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_entryAt_idx" ON "FinanceAccountEntry"("entryAt");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_sourceType_sourceId_idx" ON "FinanceAccountEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_ledgerAccountId_entryAt_idx" ON "FinanceAccountEntry"("ledgerAccountId", "entryAt");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_customerAccountId_idx" ON "FinanceAccountEntry"("customerAccountId");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_supplierId_idx" ON "FinanceAccountEntry"("supplierId");

-- AddForeignKey
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "FinanceLedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed minimal TDHP subset
INSERT INTO "FinanceLedgerAccount" ("id", "code", "name", "category", "isActive", "updatedAt")
VALUES
  ('fla-100', '100', 'Kasa', 'ASSET', true, CURRENT_TIMESTAMP),
  ('fla-102', '102', 'Bankalar', 'ASSET', true, CURRENT_TIMESTAMP),
  ('fla-120', '120', 'Alıcılar', 'ASSET', true, CURRENT_TIMESTAMP),
  ('fla-320', '320', 'Satıcılar', 'LIABILITY', true, CURRENT_TIMESTAMP),
  ('fla-600', '600', 'Yurtiçi Satışlar', 'INCOME', true, CURRENT_TIMESTAMP),
  ('fla-770', '770', 'Genel Yönetim Giderleri', 'EXPENSE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
