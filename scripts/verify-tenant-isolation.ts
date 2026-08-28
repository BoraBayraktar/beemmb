import { PrismaClient } from "@prisma/client";

import { platformService } from "@/modules/platform/services/platform.service";

const baseUrl = process.env.APP_URL || "http://localhost:3001";
const prisma = new PrismaClient();

const SLUG_A = "verify-tenant-iso-a";
const SLUG_B = "verify-tenant-iso-b";
const ADMIN_EMAIL_A = "verify-tenant-iso-admin-a@example.com";
const ADMIN_EMAIL_B = "verify-tenant-iso-admin-b@example.com";
const ADMIN_PASSWORD = "verify-tenant-iso-pw-1234";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    return null;
  }

  return setCookieHeader.split(";")[0] || null;
}

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/identity/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `Login failed for ${email} with status ${response.status}`);
  const cookie = extractCookie(response.headers.get("set-cookie"));
  assert(cookie, `No auth cookie received for ${email}`);
  return cookie;
}

async function authFetch(path: string, cookie: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookie,
    },
  });
}

async function cleanupTenant(slug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { slug } });
  if (!tenant) {
    return;
  }

  await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.rolePermission.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.role.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenantModuleEntitlement.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
}

async function cleanup() {
  await cleanupTenant(SLUG_A);
  await cleanupTenant(SLUG_B);
}

async function main() {
  await cleanup();

  // Setup, kendi HTTP oturumu olmadan (super-admin tekil/gercek bir kisiye
  // ait, CI'da ona guvenmek istemiyoruz) -- dogrudan servis katmanindan,
  // gercek uygulama kodunun kullandigi ayni provisionTenant() yolundan.
  const tenantA = await platformService.provisionTenant(
    {
      slug: SLUG_A,
      name: "Verify Tenant Isolation A",
      contactEmail: "a@verify-tenant-iso.example.com",
      moduleKeys: ["products", "system"],
      adminUser: { email: ADMIN_EMAIL_A, name: "Verify Admin A", password: ADMIN_PASSWORD },
    },
    "verify-script",
  );
  const tenantB = await platformService.provisionTenant(
    {
      slug: SLUG_B,
      name: "Verify Tenant Isolation B",
      contactEmail: "b@verify-tenant-iso.example.com",
      moduleKeys: ["finance"],
      adminUser: { email: ADMIN_EMAIL_B, name: "Verify Admin B", password: ADMIN_PASSWORD },
    },
    "verify-script",
  );

  // 1) Provizyon atomikligi: 7 sistem rolu + super-admin ataması.
  const rolesA = await prisma.role.findMany({ where: { tenantId: tenantA.tenant.id } });
  assert(rolesA.length === 7, `Tenant A expected 7 system roles, got ${rolesA.length}`);
  assert(rolesA.every((role) => role.isSystem), "Tenant A roles should all be isSystem");

  const assignmentA = await prisma.userRoleAssignment.findFirst({
    where: { userId: tenantA.adminUser.id, tenantId: tenantA.tenant.id },
    include: { role: true },
  });
  assert(assignmentA?.role.key === "super-admin", "Tenant A admin should be assigned the super-admin role");

  const rolesB = await prisma.role.findMany({ where: { tenantId: tenantB.tenant.id } });
  assert(rolesB.length === 7, `Tenant B expected 7 system roles, got ${rolesB.length}`);
  assert(
    rolesA.every((roleA) => !rolesB.some((roleB) => roleB.id === roleA.id)),
    "Tenant A and Tenant B role ids should never overlap (each tenant gets its own cloned rows, not shared references)",
  );

  // 2) Slug ve admin e-posta benzersizligi (tenant'lar arasi da).
  let duplicateSlugRejected = false;
  try {
    await platformService.provisionTenant(
      { slug: SLUG_A, name: "dup", contactEmail: "dup@example.com", moduleKeys: [], adminUser: { email: "dup-x@example.com", name: "Dup", password: ADMIN_PASSWORD } },
      "verify-script",
    );
  } catch (error) {
    duplicateSlugRejected = (error as Error).message === "TENANT_SLUG_ALREADY_EXISTS";
  }
  assert(duplicateSlugRejected, "Duplicate tenant slug should be rejected");

  let duplicateEmailRejected = false;
  try {
    await platformService.provisionTenant(
      { slug: "verify-tenant-iso-x", name: "dup", contactEmail: "dup2@example.com", moduleKeys: [], adminUser: { email: ADMIN_EMAIL_A, name: "Dup", password: ADMIN_PASSWORD } },
      "verify-script",
    );
  } catch (error) {
    duplicateEmailRejected = (error as Error).message === "ADMIN_EMAIL_ALREADY_EXISTS";
  }
  assert(duplicateEmailRejected, "Duplicate admin email across tenants should be rejected");
  await prisma.tenant.deleteMany({ where: { slug: "verify-tenant-iso-x" } });

  // 3) HTTP oturumu: her tenant kendi admin'i ile giris yapar.
  const cookieA = await login(ADMIN_EMAIL_A, ADMIN_PASSWORD);
  const cookieB = await login(ADMIN_EMAIL_B, ADMIN_PASSWORD);

  // 4) Rol listesi izolasyonu: A yalnizca kendi rollerini gormeli.
  const rolesResponseA = await authFetch("/api/admin/roles", cookieA);
  assert(rolesResponseA.status === 200, `Tenant A roles list expected 200, got ${rolesResponseA.status}`);
  const rolesPayloadA = (await rolesResponseA.json()) as { roles: Array<{ id: string }> };
  assert(rolesPayloadA.roles.length === 7, `Tenant A should see exactly its own 7 roles, got ${rolesPayloadA.roles.length}`);
  assert(
    rolesPayloadA.roles.every((role) => rolesA.some((r) => r.id === role.id)),
    "Tenant A role list should only contain Tenant A's own role ids",
  );

  // 5) Menu cift-kontrolu: A'da sadece products+system moduleKey'li gruplar,
  // finance/inventory/documents gorunmemeli.
  const homeResponseA = await authFetch("/tr/admin", cookieA, { redirect: "follow" });
  assert(homeResponseA.status === 200, `Tenant A admin home expected 200, got ${homeResponseA.status}`);
  const homeHtmlA = await homeResponseA.text();
  assert(homeHtmlA.includes("/tr/admin/products"), "Tenant A should see products (entitled module)");
  assert(!homeHtmlA.includes("/tr/admin/finance"), "Tenant A should NOT see finance (not entitled)");
  assert(!homeHtmlA.includes("platform/tenants"), "Tenant A admin is not a platform operator, should not see Platform Yönetimi link");

  const homeResponseB = await authFetch("/tr/admin", cookieB, { redirect: "follow" });
  assert(homeResponseB.status === 200, `Tenant B admin home expected 200, got ${homeResponseB.status}`);
  const homeHtmlB = await homeResponseB.text();
  assert(homeHtmlB.includes("/tr/admin/finance"), "Tenant B should see finance (entitled module)");
  assert(!homeHtmlB.includes("/tr/admin/products"), "Tenant B should NOT see products (not entitled)");

  // 6) Platform route'lari sadece isSuperAdmin icin -- tenant admin'leri 403 almali.
  const platformResponseA = await authFetch("/api/admin/platform/tenants", cookieA);
  assert(platformResponseA.status === 403, `Tenant A hitting platform route expected 403, got ${platformResponseA.status}`);

  // 7) Entitlement degisikligi canli menu'yu etkiler (Redis olsun/olmasin --
  // getEnabledModuleKeys DB'ye duser cache yoksa).
  await platformService.setEntitlement({ tenantId: tenantA.tenant.id, moduleKey: "finance", isEnabled: true });
  const homeResponseAAfter = await authFetch("/tr/admin", cookieA, { redirect: "follow" });
  const homeHtmlAAfter = await homeResponseAAfter.text();
  assert(homeHtmlAAfter.includes("/tr/admin/finance"), "Tenant A should see finance after entitlement granted");

  // 8) Kullanici listesi izolasyonu (2026-08-28'de canlida bulunan gercek
  // regresyon: identityRepository.listUsers/countUsers hic tenantId filtresi
  // tasimiyordu). Her tenant admin'i /api/admin/users'ta SADECE kendi
  // kullanicisini gormeli.
  const usersResponseA = await authFetch("/api/admin/users", cookieA);
  assert(usersResponseA.status === 200, `Tenant A users list expected 200, got ${usersResponseA.status}`);
  const usersPayloadA = (await usersResponseA.json()) as { items: Array<{ id: string; email: string }>; total: number };
  assert(usersPayloadA.total === 1, `Tenant A should see exactly 1 (its own) user, got ${usersPayloadA.total}`);
  assert(usersPayloadA.items[0]?.email === ADMIN_EMAIL_A, "Tenant A user list should only contain its own admin");

  const usersResponseB = await authFetch("/api/admin/users", cookieB);
  const usersPayloadB = (await usersResponseB.json()) as { items: Array<{ id: string; email: string }>; total: number };
  assert(usersPayloadB.total === 1, `Tenant B should see exactly 1 (its own) user, got ${usersPayloadB.total}`);
  assert(usersPayloadB.items[0]?.email === ADMIN_EMAIL_B, "Tenant B user list should only contain its own admin");

  // 9) Yeni kullanici olusturma dogru tenant'a yaziyor mu (identityAdminService.
  // createUser tenantId'yi repository.createUser'a hic gecirmiyordu -- yeni
  // kullanicilar sessizce PLATFORM_TENANT_ID'ye dusuyordu).
  const createUserResponse = await authFetch("/api/admin/users", cookieA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "verify-tenant-iso-newstaff-a@example.com", name: "New Staff A", role: "EDITOR", password: ADMIN_PASSWORD }),
  });
  assert(createUserResponse.status === 201, `Create user expected 201, got ${createUserResponse.status}`);
  const createdUserPayload = (await createUserResponse.json()) as { item: { id: string } };
  const createdUserRow = await prisma.user.findUniqueOrThrow({ where: { id: createdUserPayload.item.id }, select: { tenantId: true } });
  assert(createdUserRow.tenantId === tenantA.tenant.id, "New user created by Tenant A admin should belong to Tenant A, not fall back to the platform tenant");

  // 10) Capraz-tenant yazma reddi: Tenant A admin'i Tenant B'nin admin id'sini
  // biliyor olsaydi bile PATCH/DELETE edememeli (Extended Where Unique Fields:
  // where {id, tenantId} -> yanlis tenant'ta P2025).
  const crossTenantPatchResponse = await authFetch(`/api/admin/users/${tenantB.adminUser.id}`, cookieA, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "HACKED" }),
  });
  assert(crossTenantPatchResponse.status >= 400, `Cross-tenant PATCH should fail, got ${crossTenantPatchResponse.status}`);
  const tenantBAdminAfterAttack = await prisma.user.findUniqueOrThrow({ where: { id: tenantB.adminUser.id }, select: { name: true } });
  assert(tenantBAdminAfterAttack.name === "Verify Admin B", "Tenant B admin's name should be untouched by Tenant A's cross-tenant PATCH attempt");

  console.log("Tenant isolation verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
