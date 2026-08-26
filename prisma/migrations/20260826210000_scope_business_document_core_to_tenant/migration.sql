-- Faz 1 / Dalga 13: BusinessDocument/e-fatura ailesinin cekirdegi --
-- BusinessDocument, BusinessDocumentLine, EDocumentNumberSequence,
-- DocumentProviderConfig tenant-scoped hale getirilir. Bu dalganin en
-- kritik risk noktasi EDocumentNumberSequence: tenant-composite'e
-- cevrilmezse iki tenant ayni yil/prefix/tur kombinasyonunda e-fatura
-- sira numarasi sayacini paylasip birbirinin numaralandirmasini bozar.
--
-- Is-verisi anlamli unique alanlar tenant-composite'e cevrildi:
-- BusinessDocument.documentNumber (fatura/irsaliye numarasi),
-- EDocumentNumberSequence(documentType, prefix, year) (sayac anahtari),
-- DocumentProviderConfig.providerCode (farkli tenant'lar ayni e-fatura
-- saglayicisini [orn. ayni entegratoru] farkli kimlik bilgileriyle
-- kullanabilir).
--
-- DROP CONSTRAINT IF EXISTS + DROP INDEX IF EXISTS ikilisi, prod/local
-- sema farkina karsi onceden dayanikli olacak sekilde kullanilir.

-- AlterTable: BusinessDocument.tenantId
ALTER TABLE "BusinessDocument" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocument" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocument" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessDocument" DROP CONSTRAINT IF EXISTS "BusinessDocument_documentNumber_key";
DROP INDEX IF EXISTS "BusinessDocument_documentNumber_key";
CREATE UNIQUE INDEX "BusinessDocument_tenantId_documentNumber_key" ON "BusinessDocument"("tenantId", "documentNumber");

CREATE INDEX "BusinessDocument_tenantId_idx" ON "BusinessDocument"("tenantId");

-- AlterTable: BusinessDocumentLine.tenantId
ALTER TABLE "BusinessDocumentLine" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocumentLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocumentLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocumentLine" ADD CONSTRAINT "BusinessDocumentLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BusinessDocumentLine_tenantId_idx" ON "BusinessDocumentLine"("tenantId");

-- AlterTable: EDocumentNumberSequence.tenantId
ALTER TABLE "EDocumentNumberSequence" ADD COLUMN "tenantId" TEXT;
UPDATE "EDocumentNumberSequence" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "EDocumentNumberSequence" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "EDocumentNumberSequence" ADD CONSTRAINT "EDocumentNumberSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EDocumentNumberSequence" DROP CONSTRAINT IF EXISTS "EDocumentNumberSequence_documentType_prefix_year_key";
DROP INDEX IF EXISTS "EDocumentNumberSequence_documentType_prefix_year_key";
CREATE UNIQUE INDEX "EDocumentNumberSequence_tenantId_documentType_prefix_year_key" ON "EDocumentNumberSequence"("tenantId", "documentType", "prefix", "year");

CREATE INDEX "EDocumentNumberSequence_tenantId_idx" ON "EDocumentNumberSequence"("tenantId");

-- AlterTable: DocumentProviderConfig.tenantId
ALTER TABLE "DocumentProviderConfig" ADD COLUMN "tenantId" TEXT;
UPDATE "DocumentProviderConfig" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "DocumentProviderConfig" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DocumentProviderConfig" ADD CONSTRAINT "DocumentProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentProviderConfig" DROP CONSTRAINT IF EXISTS "DocumentProviderConfig_providerCode_key";
DROP INDEX IF EXISTS "DocumentProviderConfig_providerCode_key";
CREATE UNIQUE INDEX "DocumentProviderConfig_tenantId_providerCode_key" ON "DocumentProviderConfig"("tenantId", "providerCode");

CREATE INDEX "DocumentProviderConfig_tenantId_idx" ON "DocumentProviderConfig"("tenantId");
