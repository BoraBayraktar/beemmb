INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name")
VALUES
  ('perm-finance-audit-read', 'finance.audit.read', 'finance', 'audit_read', 'finance-exports', 'Mali müşavir export paketi')
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "isActive")
VALUES
  ('role-accountant', 'accountant', 'Mali Müşavir', 'Finans raporlarını salt okunur görür ve muhasebe export paketi indirir.', true, true)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "isActive" = true,
  "deleted" = false,
  "deletedDate" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-super-admin-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'finance.audit.read'
WHERE r."key" = 'super-admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-finance-audit-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'finance.audit.read'
WHERE r."key" = 'finance'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-accountant-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('admin.access', 'documents.read', 'finance.read', 'finance.audit.read')
WHERE r."key" = 'accountant'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
