-- Expand TDHP subset and allow business-document ledger source
ALTER TYPE "FinanceAccountEntrySourceType" ADD VALUE IF NOT EXISTS 'BUSINESS_DOCUMENT';

INSERT INTO "FinanceLedgerAccount" ("id", "code", "name", "category", "isActive", "updatedAt")
VALUES
  ('fla-153', '153', 'Ticari Mallar', 'ASSET', true, CURRENT_TIMESTAMP),
  ('fla-191', '191', 'İndirilecek KDV', 'ASSET', true, CURRENT_TIMESTAMP),
  ('fla-391', '391', 'Hesaplanan KDV', 'LIABILITY', true, CURRENT_TIMESTAMP),
  ('fla-760', '760', 'Pazarlama, Satış ve Dağıtım Giderleri', 'EXPENSE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
