import { PrismaClient } from "@prisma/client";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { commerceService } from "@/modules/commerce/services/commerce.service";

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

  const carrier = await catalogAdminService.createCarrierCompany({
    slug: `report-carrier-${unique}`,
    name: `Report Carrier ${unique}`,
    trackingUrlTemplate: "https://kargo.example.com/takip?kod={trackingNumber}",
  });

  const shippedAt = new Date("2026-01-01T00:00:00.000Z");
  const deliveredAtOrder1 = new Date("2026-01-02T00:00:00.000Z"); // 24 saat
  const deliveredAtOrder2 = new Date("2026-01-03T00:00:00.000Z"); // 48 saat

  const orderDelivered1 = await prisma.order.create({
    data: {
      orderNumber: `REPORT-A-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
      carrierCompanyId: carrier.id,
      shipmentStatus: "DELIVERED",
      cargoTrackingNumber: "TRK-REPORT-1",
      cargoShippedAt: shippedAt,
      cargoDeliveredAt: deliveredAtOrder1,
    },
    select: { id: true },
  });

  const orderDelivered2 = await prisma.order.create({
    data: {
      orderNumber: `REPORT-B-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
      carrierCompanyId: carrier.id,
      shipmentStatus: "DELIVERED",
      cargoTrackingNumber: "TRK-REPORT-2",
      cargoShippedAt: shippedAt,
      cargoDeliveredAt: deliveredAtOrder2,
    },
    select: { id: true },
  });

  const orderShippedOnly = await prisma.order.create({
    data: {
      orderNumber: `REPORT-C-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
      carrierCompanyId: carrier.id,
      shipmentStatus: "SHIPPED",
      cargoTrackingNumber: "TRK-REPORT-3",
    },
    select: { id: true },
  });

  const orderNoCarrier = await prisma.order.create({
    data: {
      orderNumber: `REPORT-D-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
    },
    select: { id: true },
  });

  try {
    // --- Bolum 1: getShipmentCarrierReport dogrudan servis testi ---
    const report = await commerceService.getShipmentCarrierReport();
    const carrierRow = report.find((row) => row.carrierCompanyId === carrier.id);
    assert(carrierRow, "Rapor, olusturulan kargo firmasi icin bir satir icermeli");
    assert(carrierRow!.orderCount === 3, `orderCount 3 beklenirdi, ${carrierRow!.orderCount} geldi`);
    assert(carrierRow!.shippedCount === 3, `shippedCount 3 beklenirdi (SHIPPED+DELIVERED), ${carrierRow!.shippedCount} geldi`);
    assert(carrierRow!.deliveredCount === 2, `deliveredCount 2 beklenirdi, ${carrierRow!.deliveredCount} geldi`);
    assert(carrierRow!.averageDeliveryHours === 36, `averageDeliveryHours 36 beklenirdi ((24+48)/2), ${carrierRow!.averageDeliveryHours} geldi`);

    const unassignedRow = report.find((row) => row.carrierCompanyId === null);
    assert(unassignedRow, "Rapor, kargo firmasi atanmamis siparisler icin bir satir icermeli");
    assert(unassignedRow!.orderCount >= 1, "Atanmamis kargo satirinda en az 1 siparis olmali");

    // --- Bolum 2: listOrders filtreleri (dogrudan servis) ---
    const filteredByCarrier = await commerceService.listOrders({ carrierCompanyId: carrier.id, page: 1, pageSize: 50 });
    assert(filteredByCarrier.items.length === 3, `carrierCompanyId filtresiyle 3 sonuc beklenirdi, ${filteredByCarrier.items.length} geldi`);
    assert(filteredByCarrier.items.every((item) => item.carrierCompanyId === carrier.id), "Tum sonuclar filtrelenen kargo firmasina ait olmali");

    const filteredByShipmentStatus = await commerceService.listOrders({ shipmentStatus: "DELIVERED", carrierCompanyId: carrier.id, page: 1, pageSize: 50 });
    assert(filteredByShipmentStatus.items.length === 2, `shipmentStatus=DELIVERED filtresiyle 2 sonuc beklenirdi, ${filteredByShipmentStatus.items.length} geldi`);

    const deliveredItem = filteredByShipmentStatus.items.find((item) => item.id === orderDelivered1.id);
    assert(deliveredItem, "Filtrelenen sonuclar arasinda beklenen siparis bulunmali");
    assert(deliveredItem!.carrierTrackingUrlTemplate === carrier.trackingUrlTemplate, "Liste ogesi carrier takip linki sablonunu tasimali");

    // --- Bolum 3: HTTP katmani (API route + query param gecisi) ---
    const adminCookie = await login("admin@beemmb.local", "Admin123!");

    const httpFiltered = await authFetch(`/api/admin/orders?carrierCompanyId=${carrier.id}&shipmentStatus=SHIPPED&pageSize=50`, adminCookie);
    assert(httpFiltered.status === 200, `HTTP filtre istegi 200 beklenirdi, ${httpFiltered.status} geldi`);
    const httpFilteredPayload = await httpFiltered.json() as { items: Array<{ id: string }> };
    assert(
      httpFilteredPayload.items.some((item) => item.id === orderShippedOnly.id),
      "HTTP filtreli listede SHIPPED durumundaki siparis bulunmali",
    );
    assert(
      !httpFilteredPayload.items.some((item) => item.id === orderDelivered1.id),
      "HTTP filtreli liste DELIVERED siparisi icermemeli (shipmentStatus=SHIPPED filtrelendi)",
    );

    // --- Bolum 4: sayfalarin gercekten render edildigini dogrula ---
    const ordersPageResponse = await authFetch("/tr/admin/orders", adminCookie);
    assert(ordersPageResponse.status === 200, `Siparis listesi sayfasi 200 beklenirdi, ${ordersPageResponse.status} geldi`);
    const ordersPageHtml = await ordersPageResponse.text();
    assert(!ordersPageHtml.includes("__next_error__"), "Siparis listesi sayfasi hatasiz render edilmeli");

    const reportPageResponse = await authFetch("/tr/admin/orders/shipping-report", adminCookie);
    assert(reportPageResponse.status === 200, `Kargo raporu sayfasi 200 beklenirdi, ${reportPageResponse.status} geldi`);
    const reportPageHtml = await reportPageResponse.text();
    assert(!reportPageHtml.includes("__next_error__"), "Kargo raporu sayfasi hatasiz render edilmeli");
    assert(reportPageHtml.includes(carrier.name), "Kargo raporu sayfasi olusturulan kargo firmasinin adini icermeli");

    console.log("Siparis listesi kargo filtresi ve kargo raporu dogrulamasi gecti");
  } finally {
    const orderIds = [orderDelivered1.id, orderDelivered2.id, orderShippedOnly.id, orderNoCarrier.id];
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderPaymentStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await catalogAdminService.softDeleteCarrierCompany(carrier.id, "system");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
