INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name", "createdAt", "updatedAt")
VALUES
  ('perm-incoming-invoices-read', 'incomingInvoices.read', 'incomingInvoices', 'read', 'incoming-invoices', 'Gelen faturaları görüntüleme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm-incoming-invoices-manage', 'incomingInvoices.manage', 'incomingInvoices', 'manage', 'incoming-invoices', 'Gelen faturaları yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-super-admin-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('incomingInvoices.read', 'incomingInvoices.manage')
WHERE r."key" = 'super-admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-operation-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('incomingInvoices.read', 'incomingInvoices.manage')
WHERE r."key" = 'operation'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-finance-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('incomingInvoices.read', 'incomingInvoices.manage')
WHERE r."key" = 'finance'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-accountant-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('incomingInvoices.read', 'incomingInvoices.manage')
WHERE r."key" = 'accountant'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp-auditor-' || p."key", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'incomingInvoices.read'
WHERE r."key" = 'auditor'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
