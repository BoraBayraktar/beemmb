-- Faz 1 / Dalga 18: Kimlik-bitisik modeller --
-- SocialAccount ve UserNotification tenantId kolonu kazanir. Backfill,
-- sabit platform tenant yerine bagli oldugu User'in gercek tenantId'sinden
-- yapilir (daha dogru, ileride coklu tenant olustugunda da tutarli kalir).
-- SocialAccount kasitli olarak TENANT_SCOPED_MODELS'e eklenmez (bkz.
-- src/lib/prisma.ts) -- OAuth login akisinin bootstrap kisiti nedeniyle.

ALTER TABLE "SocialAccount" ADD COLUMN "tenantId" TEXT;
UPDATE "SocialAccount" AS sa SET "tenantId" = u."tenantId" FROM "User" AS u WHERE sa."userId" = u."id" AND sa."tenantId" IS NULL;
UPDATE "SocialAccount" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "SocialAccount" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "SocialAccount_tenantId_idx" ON "SocialAccount"("tenantId");


ALTER TABLE "UserNotification" ADD COLUMN "tenantId" TEXT;
UPDATE "UserNotification" AS n SET "tenantId" = u."tenantId" FROM "User" AS u WHERE n."userId" = u."id" AND n."tenantId" IS NULL;
UPDATE "UserNotification" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "UserNotification" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "UserNotification_tenantId_idx" ON "UserNotification"("tenantId");
