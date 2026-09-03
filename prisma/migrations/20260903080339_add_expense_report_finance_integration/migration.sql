-- AlterEnum
ALTER TYPE "CashTransactionSourceType" ADD VALUE 'EXPENSE_REPORT';

-- AlterEnum
ALTER TYPE "FinanceAccountEntrySourceType" ADD VALUE 'EXPENSE_REPORT';

-- AlterTable
ALTER TABLE "ExpenseReport" ADD COLUMN     "reimbursedAt" TIMESTAMP(3);

-- Seed "335 Personele Borçlar" ledger account for every existing tenant (expense report accrual/settlement)
INSERT INTO "FinanceLedgerAccount" ("id", "tenantId", "code", "name", "category", "isActive", "createdAt", "updatedAt")
SELECT 'fla-335-' || t."id", t."id", '335', 'Personele Borçlar', 'LIABILITY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId", "code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
