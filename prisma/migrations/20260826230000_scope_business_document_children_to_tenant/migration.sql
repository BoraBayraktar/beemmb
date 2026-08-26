-- Faz 1 / Dalga 13b: BusinessDocument ailesinin kalan cocuk modelleri --
-- BusinessDocumentXmlArtifact, BusinessDocumentDispatch,
-- BusinessDocumentLifecycleEvent, BusinessDocumentIntegrationMessage
-- tenant-scoped hale getirilir. Hicbirinde tenant-composite'e cevrilecek
-- is-anlamli unique kisit yok (tumu internal FK-scoped cocuk kayitlari).

ALTER TABLE "BusinessDocumentXmlArtifact" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocumentXmlArtifact" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocumentXmlArtifact" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocumentXmlArtifact" ADD CONSTRAINT "BusinessDocumentXmlArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BusinessDocumentXmlArtifact_tenantId_idx" ON "BusinessDocumentXmlArtifact"("tenantId");

ALTER TABLE "BusinessDocumentDispatch" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocumentDispatch" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocumentDispatch" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocumentDispatch" ADD CONSTRAINT "BusinessDocumentDispatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BusinessDocumentDispatch_tenantId_idx" ON "BusinessDocumentDispatch"("tenantId");

ALTER TABLE "BusinessDocumentLifecycleEvent" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocumentLifecycleEvent" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocumentLifecycleEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocumentLifecycleEvent" ADD CONSTRAINT "BusinessDocumentLifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BusinessDocumentLifecycleEvent_tenantId_idx" ON "BusinessDocumentLifecycleEvent"("tenantId");

ALTER TABLE "BusinessDocumentIntegrationMessage" ADD COLUMN "tenantId" TEXT;
UPDATE "BusinessDocumentIntegrationMessage" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "BusinessDocumentIntegrationMessage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BusinessDocumentIntegrationMessage" ADD CONSTRAINT "BusinessDocumentIntegrationMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BusinessDocumentIntegrationMessage_tenantId_idx" ON "BusinessDocumentIntegrationMessage"("tenantId");
