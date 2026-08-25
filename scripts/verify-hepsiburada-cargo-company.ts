import { PrismaClient } from "@prisma/client";

import { runWithTenantContext } from "@/lib/tenant-context";
import { cariService } from "@/modules/cari/services/cari.service";
import { hepsiburadaPackageStatusService } from "@/modules/integration/services/hepsiburada-package-status.service";
import { syncOrderShipmentFromPackageStatus } from "@/modules/integration/services/marketplace-package-shipment-sync.service";

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

async function main() {
  const unique = Date.now();

  // --- Bolum 1: CarrierCompany.externalCodeHepsiburada CRUD round-trip ---
  const carrierWithCode = await cariService.createCari({
    slug: `hb-carrier-with-code-${unique}`,
    name: `HB Carrier With Code ${unique}`,
    isCarrier: true,
    externalCodeHepsiburada: "aras",
  });
  assert(carrierWithCode.carrierProfile?.externalCodeHepsiburada === "aras", "externalCodeHepsiburada olusturma sirasinda kaydedilmeli");

  const updated = await cariService.updateCari({
    id: carrierWithCode.id,
    slug: carrierWithCode.slug,
    name: carrierWithCode.name,
    isCarrier: true,
    externalCodeHepsiburada: "yurtici",
  });
  assert(updated.carrierProfile?.externalCodeHepsiburada === "yurtici", "externalCodeHepsiburada guncelleme ile degismeli");

  const carrierWithoutCode = await cariService.createCari({
    slug: `hb-carrier-no-code-${unique}`,
    name: `HB Carrier No Code ${unique}`,
    isCarrier: true,
  });
  assert(carrierWithoutCode.carrierProfile?.externalCodeHepsiburada == null, "externalCodeHepsiburada varsayilan olarak null olmali");

  // --- Bolum 2: changeCargoCompany, ShortName tanimli olmayan carrier icin ONCE hata vermeli (dis API'ye hic gitmeden) ---
  const fakePackage = await prisma.marketplaceOrderPackage.findFirst({ where: { channel: "HEPSIBURADA" } });

  if (fakePackage) {
    const missingCodeResult = await hepsiburadaPackageStatusService
      .changeCargoCompany({ packageId: fakePackage.id, carrierCompanyId: carrierWithoutCode.id })
      .then(() => "no-error")
      .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
    assert(missingCodeResult === "HEPSIBURADA_CARRIER_SHORTNAME_MISSING", `ShortName eksikken beklenen hata HEPSIBURADA_CARRIER_SHORTNAME_MISSING, gelen: ${missingCodeResult}`);
  } else {
    console.log("Not: HEPSIBURADA kanalinda mevcut paket bulunamadi, ShortName-eksik senaryosu MARKETPLACE_PACKAGE_NOT_FOUND ile dogrulanacak.");
    const notFoundResult = await hepsiburadaPackageStatusService
      .changeCargoCompany({ packageId: "nonexistent-package-id", carrierCompanyId: carrierWithoutCode.id })
      .then(() => "no-error")
      .catch((error) => (error instanceof Error ? error.message : "unknown-error"));
    assert(notFoundResult === "MARKETPLACE_PACKAGE_NOT_FOUND", `Olmayan paket icin beklenen MARKETPLACE_PACKAGE_NOT_FOUND, gelen: ${notFoundResult}`);
  }

  // --- Bolum 3: syncOrderShipmentFromPackageStatus - shipmentStatus/cargoDeliveredAt genellemesi ---
  const product = await prisma.product.create({
    data: {
      tenantId: "tenant-beemmb-platform",
      slug: `hb-cargo-product-${unique}`,
      sku: `hb-cargo-sku-${unique}`,
      name: "HB Cargo Test Product",
      description: "temp",
      price: 30,
      stock: 2,
      imageUrl: "https://example.com/x.png",
    },
  });

  const order = await prisma.order.create({
    data: {
      tenantId: "tenant-beemmb-platform",
      orderNumber: `HB-CARGO-${unique}`,
      status: "CONFIRMED",
      subtotal: 30,
      total: 30,
      items: {
        create: {
          tenantId: "tenant-beemmb-platform",
          productId: product.id,
          productSlug: product.slug,
          productSku: product.sku,
          productName: product.name,
          productImageUrl: product.imageUrl,
          quantity: 1,
          unitPrice: 30,
          lineTotal: 30,
          currency: "TRY",
        },
      },
    },
  });

  // Sadece carrierCompanyId degisiyor, shipmentStatus dokunulmamali (Hepsiburada kargo firmasi degistirme akisi)
  await syncOrderShipmentFromPackageStatus({
    matchedOrderId: order.id,
    carrierCompanyId: carrierWithCode.id,
  });
  const afterCarrierChange = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterCarrierChange?.carrierCariId === carrierWithCode.id, "carrierCariId guncellenmeli");
  assert(afterCarrierChange?.shipmentStatus === "NOT_SHIPPED", "Sadece carrier degisince shipmentStatus degismemeli");

  // Intransit -> SHIPPED okuma senaryosu
  await syncOrderShipmentFromPackageStatus({
    matchedOrderId: order.id,
    shipmentStatus: "SHIPPED",
    cargoTrackingNumber: "HB-TRACK-1",
  });
  const afterShipped = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterShipped?.shipmentStatus === "SHIPPED", "shipmentStatus SHIPPED olmali");
  assert(afterShipped?.cargoTrackingNumber === "HB-TRACK-1", "cargoTrackingNumber Hepsiburada'dan okunan degeri tasimali");

  // Delivered -> DELIVERED + cargoDeliveredAt okuma senaryosu
  await syncOrderShipmentFromPackageStatus({
    matchedOrderId: order.id,
    shipmentStatus: "DELIVERED",
    cargoDeliveredAt: new Date(),
  });
  const afterDelivered = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterDelivered?.shipmentStatus === "DELIVERED", "shipmentStatus DELIVERED olmali");
  assert(afterDelivered?.cargoDeliveredAt !== null, "cargoDeliveredAt set edilmeli");

  // --- Bolum 4: HTTP katmani - sema dogrulamasi (gercek Hepsiburada API'sine hic gitmeden) ---
  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const cargoCompanyMissingBody = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/hepsiburada-cargo-company", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(cargoCompanyMissingBody.status === 400, `carrierCompanyId eksikken beklenen 400, gelen ${cargoCompanyMissingBody.status}`);

  const cargoCompanyNotFound = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/hepsiburada-cargo-company", adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carrierCompanyId: carrierWithCode.id }),
  });
  assert(cargoCompanyNotFound.status === 404, `Olmayan paket icin beklenen 404, gelen ${cargoCompanyNotFound.status}`);

  const shippingInfoNotFound = await authFetch("/api/admin/integrations/marketplaces/packages/nonexistent-package-id/hepsiburada-shipping-info", adminCookie, {
    method: "POST",
  });
  assert(shippingInfoNotFound.status === 404, `Olmayan paket icin beklenen 404, gelen ${shippingInfoNotFound.status}`);

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/integrations/marketplaces/packages/nonexistent-package-id/hepsiburada-cargo-company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carrierCompanyId: carrierWithCode.id }),
  });
  assert(unauthorizedResponse.status === 401, `Yetkisiz istek beklenen 401, gelen ${unauthorizedResponse.status}`);

  // --- Temizlik ---
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await cariService.deleteCari(carrierWithCode.id, "system");
  await cariService.deleteCari(carrierWithoutCode.id, "system");

  console.log("Hepsiburada kargo firmasi degistirme / takip bilgisi okuma dogrulamasi gecti");
}

runWithTenantContext({ tenantId: "tenant-beemmb-platform", isPlatformOperator: false }, main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
