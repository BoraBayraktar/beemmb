import { PrismaClient } from "@prisma/client";

import { cariService } from "@/modules/cari/services/cari.service";
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

  // --- Bolum 1: syncOrderShipmentFromPackageStatus dogrudan servis testi (dis API cagrisi yok) ---

  const carrier = await cariService.createCari({
    slug: `shipment-sync-carrier-${unique}`,
    name: `Shipment Sync Carrier ${unique}`,
    isCarrier: true,
  });

  const product = await prisma.product.create({
    data: {
      slug: `shipment-sync-product-${unique}`,
      sku: `shipment-sync-sku-${unique}`,
      name: "Shipment Sync Test Product",
      description: "temp",
      price: 40,
      stock: 3,
      imageUrl: "https://example.com/x.png",
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `SHIP-SYNC-${unique}`,
      status: "CONFIRMED",
      subtotal: 40,
      total: 40,
      items: {
        create: {
          productId: product.id,
          productSlug: product.slug,
          productSku: product.sku,
          productName: product.name,
          productImageUrl: product.imageUrl,
          quantity: 1,
          unitPrice: 40,
          lineTotal: 40,
          currency: "TRY",
        },
      },
    },
  });

  // matchedOrderId null oldugunda hicbir seyi degistirmemeli, hata firlatmamali
  await syncOrderShipmentFromPackageStatus({ matchedOrderId: null, targetStatus: "Invoiced" });
  const untouchedOrder = await prisma.order.findUnique({ where: { id: order.id } });
  assert(untouchedOrder?.shipmentStatus === "NOT_SHIPPED", "matchedOrderId null iken Order degismemeli");

  // Picking -> PREPARING
  await syncOrderShipmentFromPackageStatus({ matchedOrderId: order.id, targetStatus: "Picking" });
  const afterPicking = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterPicking?.shipmentStatus === "PREPARING", `Picking sonrasi PREPARING beklenirdi, ${afterPicking?.shipmentStatus} geldi`);

  // Invoiced + carrier + tracking -> SHIPPED, carrierCompanyId ve cargoTrackingNumber dolu, cargoShippedAt set
  await syncOrderShipmentFromPackageStatus({
    matchedOrderId: order.id,
    targetStatus: "Invoiced",
    carrierCompanyId: carrier.id,
    cargoTrackingNumber: "TRK-SYNC-1",
  });
  const afterInvoiced = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterInvoiced?.shipmentStatus === "SHIPPED", `Invoiced sonrasi SHIPPED beklenirdi, ${afterInvoiced?.shipmentStatus} geldi`);
  assert(afterInvoiced?.carrierCariId === carrier.id, "carrierCariId eslesmeli");
  assert(afterInvoiced?.cargoTrackingNumber === "TRK-SYNC-1", "cargoTrackingNumber eslesmeli");
  assert(afterInvoiced?.cargoShippedAt !== null, "cargoShippedAt set edilmeli");

  // gecersiz carrierCompanyId hata firlatmamali (yutulup loglanmali) - dis bildirim basarili sayilmis olabileceginden job'i FAILED'a dusurmemeli
  await syncOrderShipmentFromPackageStatus({
    matchedOrderId: order.id,
    targetStatus: "Invoiced",
    carrierCompanyId: "nonexistent-carrier-id",
  });

  // --- Bolum 2: queueStatusSyncSchema validasyonu (API katmani, gercek pazaryeri cagrisi yapilmadan) ---

  const adminCookie = await login("admin@beemmb.local", "Admin123!");
  const fakePackageId = "nonexistent-package-id";

  const n11InvoicedResponse = await authFetch(`/api/admin/integrations/marketplaces/packages/${fakePackageId}/status-sync`, adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "N11", status: "Invoiced" }),
  });
  assert(n11InvoicedResponse.status === 400, `N11 Invoiced beklenen 400, gelen ${n11InvoicedResponse.status}`);

  const pazaramaMissingFieldsResponse = await authFetch(`/api/admin/integrations/marketplaces/packages/${fakePackageId}/status-sync`, adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "PAZARAMA", status: "Invoiced" }),
  });
  assert(pazaramaMissingFieldsResponse.status === 400, `Pazarama eksik alanlarla beklenen 400, gelen ${pazaramaMissingFieldsResponse.status}`);

  const pazaramaValidPayloadResponse = await authFetch(`/api/admin/integrations/marketplaces/packages/${fakePackageId}/status-sync`, adminCookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "PAZARAMA",
      status: "Invoiced",
      cargoCompanyId: "pazarama-raw-id-123",
      shippingTrackingNumber: "TRK-1",
      carrierCompanyId: carrier.id,
    }),
  });
  // Şema doğrulamasını geçmeli (400 değil); paket bulunamadığı için 404 dönmeli - dış API'ye hiç istek gitmeden.
  assert(pazaramaValidPayloadResponse.status === 404, `Gecerli Pazarama payload'i icin beklenen 404 (paket yok), gelen ${pazaramaValidPayloadResponse.status}`);

  const dashboardPazaramaResponse = await authFetch("/api/admin/integrations/marketplaces/dashboard?channel=PAZARAMA", adminCookie);
  assert(dashboardPazaramaResponse.status === 200, `Pazarama dashboard beklenen 200, gelen ${dashboardPazaramaResponse.status}`);
  const dashboardPazarama = await dashboardPazaramaResponse.json() as { capabilities: { supportsStatusInvoiced: boolean } };
  assert(dashboardPazarama.capabilities.supportsStatusInvoiced === true, "Pazarama artik supportsStatusInvoiced=true olmali");

  const dashboardN11Response = await authFetch("/api/admin/integrations/marketplaces/dashboard?channel=N11", adminCookie);
  const dashboardN11 = await dashboardN11Response.json() as { capabilities: { supportsStatusInvoiced: boolean } };
  assert(dashboardN11.capabilities.supportsStatusInvoiced === false, "N11 icin supportsStatusInvoiced hala false olmali");

  // --- Temizlik ---
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
  await prisma.orderPaymentStatusHistory.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await cariService.deleteCari(carrier.id, "system");

  console.log("Marketplace package shipment sync verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
