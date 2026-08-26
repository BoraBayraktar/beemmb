import { PrismaClient } from "@prisma/client";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { TrendyolClient } from "@/modules/integration/connectors/trendyol.client";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

const baseUrl = process.env.APP_URL || "http://localhost:3001";
const prisma = new PrismaClient();

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

async function verifyClientUrlMigrationAndSafetyCaps() {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const capturedUrls: string[] = [];
  const warnMessages: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnMessages.push(String(args[0] ?? ""));
  };

  try {
    const client = new TrendyolClient({
      sellerId: "1",
      apiKey: "k",
      apiSecret: "s",
      userAgent: "BEEMMB-Verify",
    });

    // --- getShipmentPackages: v2/orders'a taşınmış olmalı ve 10.000 kayıt penceresine (page*size<=10000) sıkı sıkıya bağlı kalmalı ---
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrls.push(String(input));
      return new Response(JSON.stringify({ content: [], totalElements: 12540, totalPages: 999, page: 0, size: 200 }), { status: 200 });
    }) as typeof fetch;

    await client.getShipmentPackages({
      startDate: new Date(0),
      endDate: new Date(),
      pageSize: 200,
      maxPages: 100,
    });

    assert(capturedUrls.length === 50, `getShipmentPackages 10.000 kayıt penceresine göre (200*50) en fazla 50 istek atmalı, atılan: ${capturedUrls.length}`);
    assert(capturedUrls.every((url) => url.includes("/v2/orders")), "getShipmentPackages artık /v2/orders endpoint'ini kullanmalı");
    assert(!capturedUrls.some((url) => /\/orders\?/.test(url) && !url.includes("/v2/orders")), "Eski /orders (v1) endpoint'i artık kullanılmamalı");
    assert(warnMessages.some((message) => message.includes("TRENDYOL_QUERY_WINDOW_EXCEEDED")), "totalElements 10.000'i aştığında uyarı loglanmalı");

    // --- getShipmentPackagesStream: cursor tabanlı akış endpoint'ini kullanmalı, hasMore=false'a kadar devam etmeli ---
    capturedUrls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrls.push(String(input));
      const hasMore = capturedUrls.length < 3;
      return new Response(JSON.stringify({
        content: [{ id: capturedUrls.length, orderNumber: `ORDER-${capturedUrls.length}` }],
        hasMore,
        nextCursor: hasMore ? `cursor-${capturedUrls.length}` : undefined,
      }), { status: 200 });
    }) as typeof fetch;

    const streamPackages = await client.getShipmentPackagesStream({
      startDate: new Date(0),
      endDate: new Date(),
      pageSize: 50,
      maxIterations: 10,
    });

    assert(capturedUrls.length === 3, `Stream hasMore=false olana kadar devam etmeli, atılan istek sayısı: ${capturedUrls.length}`);
    assert(capturedUrls.every((url) => url.includes("/orders/stream")), "getShipmentPackagesStream /orders/stream endpoint'ini kullanmalı");
    assert(capturedUrls[1].includes("nextCursor=cursor-1"), "İkinci istek bir önceki nextCursor değerini taşımalı");
    assert(capturedUrls[2].includes("nextCursor=cursor-2"), "Üçüncü istek bir önceki nextCursor değerini taşımalı");
    assert(streamPackages.length === 3, `Stream'den 3 paket toplanmalı, toplanan: ${streamPackages.length}`);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }

  console.log("Trendyol client: v2/orders migrasyonu + 10k güvenlik sınırı + stream cursor davranışı doğrulandı");
}

async function main() {
  await verifyClientUrlMigrationAndSafetyCaps();

  const unique = Date.now();

  // --- Kapasite (capability) kontrolü: tedarik edememe bildirimi yalnızca Trendyol'da desteklenmeli ---
  const [trendyolDashboard, n11Dashboard, pazaramaDashboard, hepsiburadaDashboard] = await Promise.all([
    marketplaceIntegrationService.getDashboard({ channel: "TRENDYOL" }),
    marketplaceIntegrationService.getDashboard({ channel: "N11" }),
    marketplaceIntegrationService.getDashboard({ channel: "PAZARAMA" }),
    marketplaceIntegrationService.getDashboard({ channel: "HEPSIBURADA" }),
  ]);
  assert(trendyolDashboard.capabilities.supportsUnsuppliedCancel === true, "Trendyol tedarik edememe bildirimini desteklemeli");
  assert(n11Dashboard.capabilities.supportsUnsuppliedCancel === false, "N11 tedarik edememe bildirimini desteklememeli");
  assert(pazaramaDashboard.capabilities.supportsUnsuppliedCancel === false, "Pazarama tedarik edememe bildirimini desteklememeli");
  assert(hepsiburadaDashboard.capabilities.supportsUnsuppliedCancel === false, "Hepsiburada tedarik edememe bildirimini desteklememeli");

  // --- Test fixture'ları: Trendyol ve N11 config + paket + satır ---
  const trendyolConfig = await prisma.marketplaceIntegrationConfig.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      channel: "TRENDYOL",
      displayName: `Trendyol Verify ${unique}`,
      sellerId: `trendyol-seller-${unique}`,
      apiKeyEncrypted: integrationSecretCryptoService.encrypt("test-key") ?? "",
      apiSecretEncrypted: integrationSecretCryptoService.encrypt("test-secret") ?? "",
      userAgent: "BEEMMB-Verify",
    },
  });

  const n11Config = await prisma.marketplaceIntegrationConfig.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      channel: "N11",
      displayName: `N11 Verify ${unique}`,
      sellerId: `n11-seller-${unique}`,
      apiKeyEncrypted: integrationSecretCryptoService.encrypt("test-key") ?? "",
      apiSecretEncrypted: integrationSecretCryptoService.encrypt("test-secret") ?? "",
      userAgent: "",
    },
  });

  const eligiblePackage = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: trendyolConfig.id,
      channel: "TRENDYOL",
      externalPackageId: `pkg-${unique}-eligible`,
      externalOrderNumber: `order-${unique}-eligible`,
      packageStatus: "Created",
      lines: {
        create: {
          tenantId: PLATFORM_TENANT_ID,
          externalLineId: `line-${unique}`,
          productName: "Verify Product",
          quantity: 3,
        },
      },
    },
    include: { lines: true },
  });

  const invoicedPackage = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: trendyolConfig.id,
      channel: "TRENDYOL",
      externalPackageId: `pkg-${unique}-invoiced`,
      externalOrderNumber: `order-${unique}-invoiced`,
      packageStatus: "Invoiced",
      lines: {
        create: {
          tenantId: PLATFORM_TENANT_ID,
          externalLineId: `line-${unique}-invoiced`,
          productName: "Verify Product",
          quantity: 1,
        },
      },
    },
  });

  const n11Package = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: n11Config.id,
      channel: "N11",
      externalPackageId: `pkg-${unique}-n11`,
      externalOrderNumber: `order-${unique}-n11`,
      packageStatus: "Created",
    },
  });

  const eligibleLine = eligiblePackage.lines[0];

  // --- Servis katmanı doğrulaması: dış API'ye hiç gitmeden yakalanması gereken hatalar ---
  const notFoundResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: "nonexistent-package-id", lines: [{ lineId: "x", quantity: 1 }], reasonId: 500 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(notFoundResult === "MARKETPLACE_PACKAGE_NOT_FOUND", `Olmayan paket için beklenen MARKETPLACE_PACKAGE_NOT_FOUND, gelen: ${notFoundResult}`);

  const unsupportedChannelResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: n11Package.id, lines: [{ lineId: "x", quantity: 1 }], reasonId: 500 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(unsupportedChannelResult === "MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL", `N11 paketi için beklenen MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL, gelen: ${unsupportedChannelResult}`);

  const statusInvalidResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: invoicedPackage.id, lines: [{ lineId: "x", quantity: 1 }], reasonId: 500 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(statusInvalidResult === "TRENDYOL_PACKAGE_UNSUPPLIED_STATUS_INVALID", `Invoiced paket için beklenen TRENDYOL_PACKAGE_UNSUPPLIED_STATUS_INVALID, gelen: ${statusInvalidResult}`);

  const lineNotFoundResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: eligiblePackage.id, lines: [{ lineId: "nonexistent-line-id", quantity: 1 }], reasonId: 500 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(lineNotFoundResult === "MARKETPLACE_LINE_NOT_FOUND", `Olmayan satır için beklenen MARKETPLACE_LINE_NOT_FOUND, gelen: ${lineNotFoundResult}`);

  const quantityInvalidResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: eligiblePackage.id, lines: [{ lineId: eligibleLine.id, quantity: 99 }], reasonId: 500 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(quantityInvalidResult === "TRENDYOL_PACKAGE_UNSUPPLIED_QUANTITY_INVALID", `Satır adedini aşan istek için beklenen TRENDYOL_PACKAGE_UNSUPPLIED_QUANTITY_INVALID, gelen: ${quantityInvalidResult}`);

  const invalidReasonResult = await marketplaceIntegrationService
    .cancelUnsuppliedItems({ packageId: eligiblePackage.id, lines: [{ lineId: eligibleLine.id, quantity: 1 }], reasonId: 999 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(invalidReasonResult?.includes("Geçersiz tedarik edememe nedeni"), `Geçersiz reasonId için validasyon hatası beklenirdi, gelen: ${invalidReasonResult}`);

  // --- HTTP katmanı doğrulaması ---
  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const missingBodyResponse = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/unsupplied", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(missingBodyResponse.status === 400, `Boş body için beklenen 400, gelen ${missingBodyResponse.status}`);

  const routeNotFoundResponse = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/unsupplied", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ lineId: "x", quantity: 1 }], reasonId: 500 }),
  });
  assert(routeNotFoundResponse.status === 404, `Olmayan paket için beklenen 404, gelen ${routeNotFoundResponse.status}`);

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/integrations/marketplaces/packages/nonexistent-package-id/unsupplied`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ lineId: "x", quantity: 1 }], reasonId: 500 }),
  });
  assert(unauthorizedResponse.status === 401, `Yetkisiz istek için beklenen 401, gelen ${unauthorizedResponse.status}`);

  // --- Temizlik ---
  await prisma.marketplaceOrderLine.deleteMany({ where: { packageId: { in: [eligiblePackage.id, invoicedPackage.id, n11Package.id] } } });
  await prisma.marketplaceOrderPackage.deleteMany({ where: { id: { in: [eligiblePackage.id, invoicedPackage.id, n11Package.id] } } });
  await prisma.marketplaceIntegrationConfig.deleteMany({ where: { id: { in: [trendyolConfig.id, n11Config.id] } } });

  console.log("Trendyol v2/orders migrasyonu + tedarik edememe bildirimi doğrulaması geçti");
}

runWithTenantContext({ tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false }, main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
