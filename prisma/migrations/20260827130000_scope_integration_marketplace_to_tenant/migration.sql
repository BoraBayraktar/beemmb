-- Faz 1 / Dalga 15: Entegrasyon/Pazaryeri ailesi --
-- IntegrationSyncJob, IntegrationDeadLetter, MarketplaceIntegrationConfig,
-- MarketplaceOrderPackage, MarketplaceOrderLine tenant-scoped hale getirilir.
-- idempotencyKey, [channel, sellerId, deleted], [channel, configId,
-- externalPackageId] ve [packageId, externalLineId] tenant-composite unique
-- kisitlara donusturulur. IntegrationDeadLetter.jobId (1:1 internal FK) degismez.

ALTER TABLE "IntegrationSyncJob" ADD COLUMN "tenantId" TEXT;
UPDATE "IntegrationSyncJob" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IntegrationSyncJob" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IntegrationSyncJob" ADD CONSTRAINT "IntegrationSyncJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntegrationSyncJob" DROP CONSTRAINT IF EXISTS "IntegrationSyncJob_idempotencyKey_key";
DROP INDEX IF EXISTS "IntegrationSyncJob_idempotencyKey_key";
CREATE UNIQUE INDEX "IntegrationSyncJob_tenantId_idempotencyKey_key" ON "IntegrationSyncJob"("tenantId", "idempotencyKey");

CREATE INDEX "IntegrationSyncJob_tenantId_idx" ON "IntegrationSyncJob"("tenantId");


ALTER TABLE "IntegrationDeadLetter" ADD COLUMN "tenantId" TEXT;
UPDATE "IntegrationDeadLetter" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "IntegrationDeadLetter" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IntegrationDeadLetter" ADD CONSTRAINT "IntegrationDeadLetter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "IntegrationDeadLetter_tenantId_idx" ON "IntegrationDeadLetter"("tenantId");


ALTER TABLE "MarketplaceIntegrationConfig" ADD COLUMN "tenantId" TEXT;
UPDATE "MarketplaceIntegrationConfig" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "MarketplaceIntegrationConfig" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MarketplaceIntegrationConfig" ADD CONSTRAINT "MarketplaceIntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketplaceIntegrationConfig" DROP CONSTRAINT IF EXISTS "MarketplaceIntegrationConfig_channel_sellerId_deleted_key";
DROP INDEX IF EXISTS "MarketplaceIntegrationConfig_channel_sellerId_deleted_key";
CREATE UNIQUE INDEX "MarketplaceIntegrationConfig_tenantId_channel_sellerId_dele_key" ON "MarketplaceIntegrationConfig"("tenantId", "channel", "sellerId", "deleted");

CREATE INDEX "MarketplaceIntegrationConfig_tenantId_idx" ON "MarketplaceIntegrationConfig"("tenantId");


ALTER TABLE "MarketplaceOrderPackage" ADD COLUMN "tenantId" TEXT;
UPDATE "MarketplaceOrderPackage" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "MarketplaceOrderPackage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MarketplaceOrderPackage" ADD CONSTRAINT "MarketplaceOrderPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketplaceOrderPackage" DROP CONSTRAINT IF EXISTS "MarketplaceOrderPackage_channel_configId_externalPackageId_key";
DROP INDEX IF EXISTS "MarketplaceOrderPackage_channel_configId_externalPackageId_key";
CREATE UNIQUE INDEX "MarketplaceOrderPackage_tenantId_channel_configId_externalP_key" ON "MarketplaceOrderPackage"("tenantId", "channel", "configId", "externalPackageId");

CREATE INDEX "MarketplaceOrderPackage_tenantId_idx" ON "MarketplaceOrderPackage"("tenantId");


ALTER TABLE "MarketplaceOrderLine" ADD COLUMN "tenantId" TEXT;
UPDATE "MarketplaceOrderLine" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "MarketplaceOrderLine" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MarketplaceOrderLine" ADD CONSTRAINT "MarketplaceOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketplaceOrderLine" DROP CONSTRAINT IF EXISTS "MarketplaceOrderLine_packageId_externalLineId_key";
DROP INDEX IF EXISTS "MarketplaceOrderLine_packageId_externalLineId_key";
CREATE UNIQUE INDEX "MarketplaceOrderLine_tenantId_packageId_externalLineId_key" ON "MarketplaceOrderLine"("tenantId", "packageId", "externalLineId");

CREATE INDEX "MarketplaceOrderLine_tenantId_idx" ON "MarketplaceOrderLine"("tenantId");
