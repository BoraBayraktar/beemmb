-- AlterTable
ALTER TABLE "ExpenseReportItem" ADD COLUMN     "vatAmount" DECIMAL(10,2),
ADD COLUMN     "vatRate" DECIMAL(5,2);

-- Seed "191 İndirilecek KDV" ledger account for every existing tenant (expense report VAT accrual)
INSERT INTO "FinanceLedgerAccount" ("id", "tenantId", "code", "name", "category", "isActive", "createdAt", "updatedAt")
SELECT 'fla-191-' || t."id", t."id", '191', 'İndirilecek KDV', 'ASSET', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId", "code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
