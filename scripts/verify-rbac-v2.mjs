import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

const requiredPermissions = [
  "admin.access",
  "users.manage",
  "audit.read",
  "audit.export",
  "products.read",
  "products.manage",
  "orders.read",
  "orders.manage",
  "inventory.read",
  "inventory.manage",
  "documents.read",
  "documents.manage",
  "finance.read",
  "finance.manage",
  "finance.audit.read",
  "integrations.read",
  "integrations.manage",
];

const requiredRoles = ["super-admin", "operation", "auditor", "finance", "accountant", "catalog-manager", "integration-manager"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [permissions, roles, adminUsers] = await Promise.all([
    prisma.permission.findMany({ select: { key: true } }),
    prisma.role.findMany({
      where: { deleted: false },
      select: {
        key: true,
        isSystem: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { deleted: false, role: "ADMIN" },
      select: {
        id: true,
        email: true,
        roleAssignments: { select: { role: { select: { key: true } } } },
      },
    }),
  ]);

  const permissionKeys = new Set(permissions.map((permission) => permission.key));
  for (const permissionKey of requiredPermissions) {
    assert(permissionKeys.has(permissionKey), `Eksik RBAC izni: ${permissionKey}`);
  }

  const rolesByKey = new Map(roles.map((role) => [role.key, role]));
  for (const roleKey of requiredRoles) {
    const role = rolesByKey.get(roleKey);
    assert(role, `Eksik sistem rolü: ${roleKey}`);
    assert(role.isSystem, `Sistem rolü isSystem=true olmalı: ${roleKey}`);
  }

  const superAdmin = rolesByKey.get("super-admin");
  assert(superAdmin, "Süper Yönetici rolü bulunamadı");
  const superAdminPermissions = new Set(superAdmin.permissions.map((item) => item.permission.key));
  for (const permissionKey of requiredPermissions) {
    assert(superAdminPermissions.has(permissionKey), `Süper Yönetici izni eksik: ${permissionKey}`);
  }

  for (const adminUser of adminUsers) {
    const hasSuperAdminRole = adminUser.roleAssignments.some((assignment) => assignment.role.key === "super-admin");
    assert(hasSuperAdminRole, `Admin kullanıcı Süper Yönetici rolüne bağlanmamış: ${adminUser.email}`);
  }

  console.log(`RBAC v2 doğrulaması geçti. ${requiredRoles.length} rol ve ${requiredPermissions.length} izin kontrol edildi.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
