-- Faz 1 / Dalga 12: NegotiableInstrument (cek/senet) tenant-scoped hale
-- getirilir. Dalga 9/11'deki FinancialAccount/CashTransaction'a bagimli.
-- instrumentNumber su an unique kisit tasimiyor (global unique degil),
-- cashTransactionId ic FK-id oldugundan (1-1) tenant-composite'e cevrilmedi.

ALTER TABLE "NegotiableInstrument" ADD COLUMN "tenantId" TEXT;
UPDATE "NegotiableInstrument" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "NegotiableInstrument" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "NegotiableInstrument_tenantId_idx" ON "NegotiableInstrument"("tenantId");
