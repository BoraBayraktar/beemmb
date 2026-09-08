-- Seed: Vekalet Yonetimi (baskasi adina vekalet olusturma/iptal etme) RBAC izni
INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name", "createdAt", "updatedAt")
VALUES
  ('perm-delegations-manage', 'delegations.manage', 'delegations', 'manage', 'delegations', 'Kullanıcılar adına vekalet yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

-- delegations.manage: sadece super-admin (roles.manage/systemUsers.manage ile ayni kapsam)
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId")
SELECT r."id" || '-' || p."key", r."tenantId", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'delegations.manage'
WHERE r."key" = 'super-admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
