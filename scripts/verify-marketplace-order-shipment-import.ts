import { PrismaClient } from "@prisma/client";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { marketplaceOrderService } from "@/modules/commerce/services/marketplace-order.service";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createTestProduct(unique: number) {
  return prisma.product.create({
    data: {
      slug: `marketplace-shipment-product-${unique}`,
      sku: `marketplace-shipment-sku-${unique}`,
      name: "Marketplace Shipment Test Product",
      description: "temp",
      price: 60,
      stock: 5,
      imageUrl: "https://example.com/x.png",
    },
  });
}

async function main() {
  const unique = Date.now();

  const carrier = await catalogAdminService.createCarrierCompany({
    slug: `marketplace-shipment-carrier-${unique}`,
    name: `Yurtici Kargo Test ${unique}`,
  });

  // Senaryo 1: eşleşen kargo firması + Trendyol tarzı adres alan adları (fullAddress/city/district/postalCode/fullName/phone)
  const productA = await createTestProduct(unique);
  const orderA = await marketplaceOrderService.createOrderFromMarketplace({
    channel: "TRENDYOL",
    externalOrderNumber: `SHIP-A-${unique}`,
    customerName: "Test Musteri A",
    customerEmail: `test-a-${unique}@example.com`,
    shipmentAddress: {
      fullAddress: "Test Mah. Test Sk. No:1",
      city: "Istanbul",
      district: "Kadikoy",
      postalCode: "34000",
      fullName: "Test Alici A",
      phone: "+905551112233",
    },
    invoiceAddress: {
      address1: "Fatura Mah. Fatura Sk. No:2",
      cityName: "Ankara",
      districtName: "Cankaya",
      postCode: "06000",
    },
    cargoProviderName: carrier.name,
    cargoTrackingNumber: "TRK-A-1",
    lines: [{ productId: productA.id, productVariantId: null, quantity: 1, unitPrice: null, currency: "TRY" }],
  });

  const orderARow = await prisma.order.findUnique({ where: { orderNumber: orderA.orderNumber } });
  assert(orderARow, "Order A should exist");
  assert(orderARow!.shipmentAddressLine === "Test Mah. Test Sk. No:1", `shipmentAddressLine mismatch: ${orderARow!.shipmentAddressLine}`);
  assert(orderARow!.shipmentCity === "Istanbul", `shipmentCity mismatch: ${orderARow!.shipmentCity}`);
  assert(orderARow!.shipmentDistrict === "Kadikoy", `shipmentDistrict mismatch: ${orderARow!.shipmentDistrict}`);
  assert(orderARow!.shipmentPostalCode === "34000", `shipmentPostalCode mismatch: ${orderARow!.shipmentPostalCode}`);
  assert(orderARow!.shipmentContactName === "Test Alici A", `shipmentContactName mismatch: ${orderARow!.shipmentContactName}`);
  assert(orderARow!.shipmentContactPhone === "+905551112233", `shipmentContactPhone mismatch: ${orderARow!.shipmentContactPhone}`);
  assert(orderARow!.invoiceAddressLine === "Fatura Mah. Fatura Sk. No:2", `invoiceAddressLine mismatch: ${orderARow!.invoiceAddressLine}`);
  assert(orderARow!.invoiceCity === "Ankara", `invoiceCity mismatch: ${orderARow!.invoiceCity}`);
  assert(orderARow!.carrierCompanyId === carrier.id, "carrierCompanyId should match resolved carrier");
  assert(orderARow!.externalCarrierNameRaw === null, "externalCarrierNameRaw should be null when carrier matched");
  assert(orderARow!.cargoTrackingNumber === "TRK-A-1", "cargoTrackingNumber should be persisted");
  assert(orderARow!.shipmentSourceChannel === "TRENDYOL", "shipmentSourceChannel should record source channel");
  assert(orderARow!.shipmentStatus === "NOT_SHIPPED", "shipmentStatus should default to NOT_SHIPPED on import");

  // Senaryo 2: eşleşmeyen kargo firması adı (ham veri kaybolmamalı) + alternatif alan adlarıyla (address/il/ilce/zipCode/name/gsm)
  const productB = await createTestProduct(unique + 1);
  const orderB = await marketplaceOrderService.createOrderFromMarketplace({
    channel: "PAZARAMA",
    externalOrderNumber: `SHIP-B-${unique}`,
    customerName: null,
    customerEmail: null,
    shipmentAddress: {
      address: "Baska Mah. Baska Sk. No:3",
      il: "Izmir",
      ilce: "Konak",
      zipCode: "35000",
      name: "Test Alici B",
      gsm: "+905559998877",
    },
    cargoProviderName: "Bilinmeyen Kargo Firmasi XYZ",
    cargoTrackingNumber: "TRK-B-1",
    lines: [{ productId: productB.id, productVariantId: null, quantity: 1, unitPrice: null, currency: "TRY" }],
  });

  const orderBRow = await prisma.order.findUnique({ where: { orderNumber: orderB.orderNumber } });
  assert(orderBRow, "Order B should exist");
  assert(orderBRow!.shipmentAddressLine === "Baska Mah. Baska Sk. No:3", `shipmentAddressLine (alt keys) mismatch: ${orderBRow!.shipmentAddressLine}`);
  assert(orderBRow!.shipmentCity === "Izmir", `shipmentCity (il) mismatch: ${orderBRow!.shipmentCity}`);
  assert(orderBRow!.shipmentDistrict === "Konak", `shipmentDistrict (ilce) mismatch: ${orderBRow!.shipmentDistrict}`);
  assert(orderBRow!.shipmentPostalCode === "35000", `shipmentPostalCode (zipCode) mismatch: ${orderBRow!.shipmentPostalCode}`);
  assert(orderBRow!.shipmentContactName === "Test Alici B", `shipmentContactName (name) mismatch: ${orderBRow!.shipmentContactName}`);
  assert(orderBRow!.shipmentContactPhone === "+905559998877", `shipmentContactPhone (gsm) mismatch: ${orderBRow!.shipmentContactPhone}`);
  assert(orderBRow!.carrierCompanyId === null, "carrierCompanyId should stay null when no carrier matches");
  assert(orderBRow!.externalCarrierNameRaw === "Bilinmeyen Kargo Firmasi XYZ", "externalCarrierNameRaw should preserve unmatched raw name");

  // Senaryo 3: hiç adres/kargo bilgisi gelmeyen kanal - Order sorunsuz oluşmalı, tüm alanlar null kalmalı
  const productC = await createTestProduct(unique + 2);
  const orderC = await marketplaceOrderService.createOrderFromMarketplace({
    channel: "N11",
    externalOrderNumber: `SHIP-C-${unique}`,
    lines: [{ productId: productC.id, productVariantId: null, quantity: 1, unitPrice: null, currency: "TRY" }],
  });

  const orderCRow = await prisma.order.findUnique({ where: { orderNumber: orderC.orderNumber } });
  assert(orderCRow, "Order C should exist");
  assert(orderCRow!.shipmentAddressLine === null, "Order C shipmentAddressLine should be null");
  assert(orderCRow!.carrierCompanyId === null, "Order C carrierCompanyId should be null");
  assert(orderCRow!.externalCarrierNameRaw === null, "Order C externalCarrierNameRaw should be null");
  assert(orderCRow!.shipmentStatus === "NOT_SHIPPED", "Order C shipmentStatus should default to NOT_SHIPPED");

  const orderIds = [orderARow!.id, orderBRow!.id, orderCRow!.id];
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderPaymentStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: [productA.id, productB.id, productC.id] } } });
  await catalogAdminService.softDeleteCarrierCompany(carrier.id, "system");

  console.log("Marketplace order shipment/address import verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
