-- Faz 2 / Dalga 1: Role, RolePermission, UserRoleAssignment tenant-scoped --
-- hale getirilir. Permission GLOBAL kalir (tum tenant'larin paylastigi
-- platform-geneli izin katalogu). Role.key tenant-composite unique kisida
-- donusturulur ([tenantId, key]). Bu 3 model KASITLI OLARAK
-- TENANT_SCOPED_MODELS'e eklenmez -- rbacService.hasPermission() ambient
-- tenant context kurulmadan once calisir (bkz. src/lib/prisma.ts), tenantId
-- rbac.repository.ts'te acikca parametre olarak tasinir.

ALTER TABLE "Role" ADD COLUMN "tenantId" TEXT;
UPDATE "Role" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "Role" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_key_key";
DROP INDEX IF EXISTS "Role_key_key";
CREATE UNIQUE INDEX "Role_tenantId_key_key" ON "Role"("tenantId", "key");

CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");


ALTER TABLE "RolePermission" ADD COLUMN "tenantId" TEXT;
UPDATE "RolePermission" AS rp SET "tenantId" = r."tenantId" FROM "Role" AS r WHERE rp."roleId" = r."id" AND rp."tenantId" IS NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");


ALTER TABLE "UserRoleAssignment" ADD COLUMN "tenantId" TEXT;
UPDATE "UserRoleAssignment" AS ura SET "tenantId" = r."tenantId" FROM "Role" AS r WHERE ura."roleId" = r."id" AND ura."tenantId" IS NULL;
ALTER TABLE "UserRoleAssignment" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "UserRoleAssignment_tenantId_idx" ON "UserRoleAssignment"("tenantId");
