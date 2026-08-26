import { PrismaClient } from "@prisma/client";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { N11Client } from "@/modules/integration/connectors/n11.client";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

const repository = new MarketplaceIntegrationRepository();

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

async function verifyClientRequestShapes() {
  const originalFetch = globalThis.fetch;
  const captured: Array<{ url: string; body: unknown }> = [];

  try {
    const client = new N11Client({ sellerId: "1", apiKey: "k", apiSecret: "s" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
      return new Response(JSON.stringify({ code: 200, message: "success" }), { status: 200 });
    }) as typeof fetch;

    await client.createCollectionRequest([
      { id: "PKG-1", orderLineId: "111", boxQuantity: 2, desi: 10, shipmentCompany: "HLZ" },
      { id: "PKG-1", orderLineId: "112", boxQuantity: 2, desi: 10, shipmentCompany: "HLZ" },
    ]);

    assert(captured.length === 1, "createCollectionRequest tek istek atmali");
    assert(captured[0].url.includes("/rest/delivery/v1/collectionRequest"), "createCollectionRequest dogru endpoint'i kullanmali");
    const collectionBody = captured[0].body as { collectionRequestDetails: Array<{ orderLineId: number | string; shipmentCompany: string }> };
    assert(collectionBody.collectionRequestDetails.length === 2, "Pakette yer alan tum satirlar istekte gonderilmeli");
    assert(collectionBody.collectionRequestDetails[0].shipmentCompany === "HLZ", "shipmentCompany dogru tasinmali");

    captured.length = 0;
    await client.splitPackageByQuantity(
      [{ packageDetails: [{ orderLineId: "111", quantities: 1 }] }],
      [{ orderLineId: "112", quantity: 1, cancelReasonId: 61 }],
    );

    assert(captured.length === 1, "splitPackageByQuantity tek istek atmali");
    const splitBody = captured[0].body as { splitPackages: unknown[]; cancelledItems?: Array<{ cancelReasonId: number }> };
    assert(Array.isArray(splitBody.cancelledItems) && splitBody.cancelledItems.length === 1, "cancelledItems body'ye eklenmeli");
    assert(splitBody.cancelledItems![0].cancelReasonId === 61, "cancelReasonId dogru tasinmali");

    captured.length = 0;
    await client.splitPackageByQuantity([{ packageDetails: [{ orderLineId: "111", quantities: 1 }] }]);
    const splitBodyNoCancel = captured[0].body as { cancelledItems?: unknown };
    assert(splitBodyNoCancel.cancelledItems === undefined, "cancelledItems verilmediginde body'de yer almamali");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("N11 client: createCollectionRequest + splitPackageByQuantity(cancelledItems) istek sekli dogrulandi");
}

async function main() {
  await verifyClientRequestShapes();

  const unique = Date.now();

  // --- Kapasite kontrolu: Toplama Talebi yalnizca N11'de desteklenmeli ---
  const [n11Dashboard, pazaramaDashboard, trendyolDashboard, hepsiburadaDashboard] = await Promise.all([
    marketplaceIntegrationService.getDashboard({ channel: "N11" }),
    marketplaceIntegrationService.getDashboard({ channel: "PAZARAMA" }),
    marketplaceIntegrationService.getDashboard({ channel: "TRENDYOL" }),
    marketplaceIntegrationService.getDashboard({ channel: "HEPSIBURADA" }),
  ]);
  assert(n11Dashboard.capabilities.supportsCollectionRequest === true, "N11 toplama talebini desteklemeli");
  assert(pazaramaDashboard.capabilities.supportsCollectionRequest === false, "Pazarama toplama talebini desteklememeli");
  assert(trendyolDashboard.capabilities.supportsCollectionRequest === false, "Trendyol toplama talebini desteklememeli");
  assert(hepsiburadaDashboard.capabilities.supportsCollectionRequest === false, "Hepsiburada toplama talebini desteklememeli");

  // --- Fixture'lar ---
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

  const pazaramaConfig = await prisma.marketplaceIntegrationConfig.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      channel: "PAZARAMA",
      displayName: `Pazarama Verify ${unique}`,
      sellerId: `pazarama-seller-${unique}`,
      apiKeyEncrypted: integrationSecretCryptoService.encrypt("test-key") ?? "",
      apiSecretEncrypted: integrationSecretCryptoService.encrypt("test-secret") ?? "",
      userAgent: "",
    },
  });

  const pickingPackage = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: n11Config.id,
      channel: "N11",
      externalPackageId: `pkg-${unique}-picking`,
      externalOrderNumber: `order-${unique}-picking`,
      packageStatus: "Picking",
      lines: {
        create: [
          { tenantId: PLATFORM_TENANT_ID, externalLineId: `line-${unique}-a`, productName: "Verify Product A", quantity: 3 },
          { tenantId: PLATFORM_TENANT_ID, externalLineId: `line-${unique}-b`, productName: "Verify Product B", quantity: 2 },
        ],
      },
    },
    include: { lines: true },
  });

  const createdPackage = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: n11Config.id,
      channel: "N11",
      externalPackageId: `pkg-${unique}-created`,
      externalOrderNumber: `order-${unique}-created`,
      packageStatus: "Created",
      lines: {
        create: { tenantId: PLATFORM_TENANT_ID, externalLineId: `line-${unique}-c`, productName: "Verify Product C", quantity: 1 },
      },
    },
  });

  const pazaramaPackage = await prisma.marketplaceOrderPackage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      configId: pazaramaConfig.id,
      channel: "PAZARAMA",
      externalPackageId: `pkg-${unique}-pazarama`,
      externalOrderNumber: `order-${unique}-pazarama`,
      packageStatus: "Picking",
    },
  });

  const [lineA, lineB] = pickingPackage.lines;

  // --- createN11CollectionRequest servis dogrulamasi (dis API'ye hic gitmeden yakalanmasi gereken hatalar) ---
  const notFoundResult = await marketplaceIntegrationService
    .createN11CollectionRequest({ packageId: "nonexistent-package-id", shipmentCompany: "HLZ", boxQuantity: 1, desi: 10 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(notFoundResult === "MARKETPLACE_PACKAGE_NOT_FOUND", `Olmayan paket icin beklenen MARKETPLACE_PACKAGE_NOT_FOUND, gelen: ${notFoundResult}`);

  const unsupportedChannelResult = await marketplaceIntegrationService
    .createN11CollectionRequest({ packageId: pazaramaPackage.id, shipmentCompany: "HLZ", boxQuantity: 1, desi: 10 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(unsupportedChannelResult === "MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL", `Pazarama paketi icin beklenen MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL, gelen: ${unsupportedChannelResult}`);

  const statusInvalidResult = await marketplaceIntegrationService
    .createN11CollectionRequest({ packageId: createdPackage.id, shipmentCompany: "HLZ", boxQuantity: 1, desi: 10 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(statusInvalidResult === "N11_COLLECTION_REQUEST_STATUS_INVALID", `Created paket icin beklenen N11_COLLECTION_REQUEST_STATUS_INVALID, gelen: ${statusInvalidResult}`);

  const invalidShipmentCompanyResult = await marketplaceIntegrationService
    .createN11CollectionRequest({ packageId: pickingPackage.id, shipmentCompany: "XYZ", boxQuantity: 1, desi: 10 })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.constructor.name : "unknown-error"));
  assert(invalidShipmentCompanyResult === "ZodError", `Gecersiz shipmentCompany icin ZodError beklenirdi, gelen: ${invalidShipmentCompanyResult}`);

  // --- splitPackage + cancellations (parcali iptal) servis dogrulamasi ---
  const lineNotFoundResult = await marketplaceIntegrationService
    .splitPackage({ packageId: pickingPackage.id, splits: [{ lineId: lineA.id, quantity: 1 }], cancellations: [{ lineId: "nonexistent-line-id", quantity: 1, cancelReasonId: 61 }] })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(lineNotFoundResult === "MARKETPLACE_LINE_NOT_FOUND", `Olmayan satir icin beklenen MARKETPLACE_LINE_NOT_FOUND, gelen: ${lineNotFoundResult}`);

  const combinedQuantityInvalidResult = await marketplaceIntegrationService
    .splitPackage({ packageId: pickingPackage.id, splits: [{ lineId: lineA.id, quantity: 2 }], cancellations: [{ lineId: lineA.id, quantity: 2, cancelReasonId: 61 }] })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
  assert(combinedQuantityInvalidResult === "N11_PACKAGE_SPLIT_QUANTITY_INVALID", `split+cancel toplami satir adedini asinca beklenen N11_PACKAGE_SPLIT_QUANTITY_INVALID, gelen: ${combinedQuantityInvalidResult}`);

  const invalidReasonResult = await marketplaceIntegrationService
    .splitPackage({ packageId: pickingPackage.id, splits: [{ lineId: lineA.id, quantity: 1 }], cancellations: [{ lineId: lineB.id, quantity: 1, cancelReasonId: 999 }] })
    .then(() => "no-error")
    .catch((error) => (error instanceof Error ? error.constructor.name : "unknown-error"));
  assert(invalidReasonResult === "ZodError", `Gecersiz cancelReasonId icin ZodError beklenirdi, gelen: ${invalidReasonResult}`);

  // --- GetShipmentPackages alan zenginlestirme: repository + servis round-trip (rawPayload disi normalize alanlar) ---
  await repository.upsertPackage({
    channel: "N11",
    configId: n11Config.id,
    externalPackageId: `pkg-${unique}-enriched`,
    externalOrderNumber: `order-${unique}-enriched`,
    packageStatus: "Shipped",
    orderDate: null,
    lastModifiedDate: null,
    customerName: null,
    customerEmail: null,
    shipmentAddress: null,
    invoiceAddress: null,
    cargoProviderName: "Balnak",
    cargoTrackingNumber: "TRK-N11-1",
    externalCargoCompanyId: "389",
    cargoSenderNumber: "18011950",
    cargoTrackingLink: "https://n11.com/kargo-takip/TRK-N11-1",
    shipmentMethod: "1",
    rawPayload: {},
    lines: [],
  });

  const enrichedPackage = await prisma.marketplaceOrderPackage.findFirst({
    where: { configId: n11Config.id, externalPackageId: `pkg-${unique}-enriched` },
  });
  assert(enrichedPackage?.externalCargoCompanyId === "389", "externalCargoCompanyId kaydedilmeli");
  assert(enrichedPackage?.cargoSenderNumber === "18011950", "cargoSenderNumber kaydedilmeli");
  assert(enrichedPackage?.cargoTrackingLink === "https://n11.com/kargo-takip/TRK-N11-1", "cargoTrackingLink kaydedilmeli");
  assert(enrichedPackage?.shipmentMethod === "1", "shipmentMethod kaydedilmeli");

  const packageDetail = await marketplaceIntegrationService.getPackageDetail({ id: enrichedPackage!.id });
  assert(packageDetail.externalCargoCompanyId === "389", "mapPackage externalCargoCompanyId'i tasimali");
  assert(packageDetail.cargoTrackingLink === "https://n11.com/kargo-takip/TRK-N11-1", "mapPackage cargoTrackingLink'i tasimali");

  // --- HTTP katmani dogrulamasi ---
  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const missingBodyResponse = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/collection-request", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(missingBodyResponse.status === 400, `Bos body icin beklenen 400, gelen ${missingBodyResponse.status}`);

  const routeNotFoundResponse = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/collection-request", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipmentCompany: "HLZ", boxQuantity: 1, desi: 10 }),
  });
  assert(routeNotFoundResponse.status === 404, `Olmayan paket icin beklenen 404, gelen ${routeNotFoundResponse.status}`);

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/integrations/marketplaces/packages/nonexistent-package-id/collection-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipmentCompany: "HLZ", boxQuantity: 1, desi: 10 }),
  });
  assert(unauthorizedResponse.status === 401, `Yetkisiz istek icin beklenen 401, gelen ${unauthorizedResponse.status}`);

  // --- Temizlik ---
  await prisma.marketplaceOrderLine.deleteMany({ where: { packageId: { in: [pickingPackage.id, createdPackage.id, pazaramaPackage.id, enrichedPackage!.id] } } });
  await prisma.marketplaceOrderPackage.deleteMany({ where: { id: { in: [pickingPackage.id, createdPackage.id, pazaramaPackage.id, enrichedPackage!.id] } } });
  await prisma.marketplaceIntegrationConfig.deleteMany({ where: { id: { in: [n11Config.id, pazaramaConfig.id] } } });

  console.log("N11 kargo genisletmesi (toplama talebi + parcali iptal + alan zenginlestirme) dogrulamasi gecti");
}

runWithTenantContext({ tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false }, main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
