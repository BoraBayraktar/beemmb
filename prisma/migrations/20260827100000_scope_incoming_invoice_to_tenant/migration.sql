-- Faz 1 / Dalga 14: Gelen Fatura ailesi --
-- IncomingInvoiceProviderConfig, IncomingInvoice, IncomingInvoiceLine,
-- IncomingInvoiceXmlArtifact, IncomingInvoiceLifecycleEvent tenant-scoped
-- hale getirilir. providerCode, providerConfigId+externalReference ve
-- xmlHash tenant-composite unique kisitlara donusturulur.

ALTER TABLE "IncomingInvoiceProviderConfig" ADD COLUMN "tenantId" TEXT;
UPDATE "IncomingInvoiceProviderConfig" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IncomingInvoiceProviderConfig" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IncomingInvoiceProviderConfig" ADD CONSTRAINT "IncomingInvoiceProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IncomingInvoiceProviderConfig" DROP CONSTRAINT IF EXISTS "IncomingInvoiceProviderConfig_providerCode_key";
DROP INDEX IF EXISTS "IncomingInvoiceProviderConfig_providerCode_key";
CREATE UNIQUE INDEX "IncomingInvoiceProviderConfig_tenantId_providerCode_key" ON "IncomingInvoiceProviderConfig"("tenantId", "providerCode");

CREATE INDEX "IncomingInvoiceProviderConfig_tenantId_idx" ON "IncomingInvoiceProviderConfig"("tenantId");


ALTER TABLE "IncomingInvoice" ADD COLUMN "tenantId" TEXT;
UPDATE "IncomingInvoice" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IncomingInvoice" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IncomingInvoice" ADD CONSTRAINT "IncomingInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IncomingInvoice" DROP CONSTRAINT IF EXISTS "IncomingInvoice_providerConfigId_externalReference_key";
DROP INDEX IF EXISTS "IncomingInvoice_providerConfigId_externalReference_key";
CREATE UNIQUE INDEX "IncomingInvoice_tenantId_providerConfigId_externalReference_key" ON "IncomingInvoice"("tenantId", "providerConfigId", "externalReference");

CREATE INDEX "IncomingInvoice_tenantId_idx" ON "IncomingInvoice"("tenantId");


ALTER TABLE "IncomingInvoiceLine" ADD COLUMN "tenantId" TEXT;
UPDATE "IncomingInvoiceLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IncomingInvoiceLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IncomingInvoiceLine" ADD CONSTRAINT "IncomingInvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "IncomingInvoiceLine_tenantId_idx" ON "IncomingInvoiceLine"("tenantId");


ALTER TABLE "IncomingInvoiceXmlArtifact" ADD COLUMN "tenantId" TEXT;
UPDATE "IncomingInvoiceXmlArtifact" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IncomingInvoiceXmlArtifact" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IncomingInvoiceXmlArtifact" ADD CONSTRAINT "IncomingInvoiceXmlArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IncomingInvoiceXmlArtifact" DROP CONSTRAINT IF EXISTS "IncomingInvoiceXmlArtifact_xmlHash_key";
DROP INDEX IF EXISTS "IncomingInvoiceXmlArtifact_xmlHash_key";
CREATE UNIQUE INDEX "IncomingInvoiceXmlArtifact_tenantId_xmlHash_key" ON "IncomingInvoiceXmlArtifact"("tenantId", "xmlHash");

CREATE INDEX "IncomingInvoiceXmlArtifact_tenantId_idx" ON "IncomingInvoiceXmlArtifact"("tenantId");


ALTER TABLE "IncomingInvoiceLifecycleEvent" ADD COLUMN "tenantId" TEXT;
UPDATE "IncomingInvoiceLifecycleEvent" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IncomingInvoiceLifecycleEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IncomingInvoiceLifecycleEvent" ADD CONSTRAINT "IncomingInvoiceLifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "IncomingInvoiceLifecycleEvent_tenantId_idx" ON "IncomingInvoiceLifecycleEvent"("tenantId");
