import { PrismaClient } from "@prisma/client";

import { runWithTenantContext } from "@/lib/tenant-context";
import { cariService } from "@/modules/cari/services/cari.service";
import { eDocumentService } from "@/modules/edocument/services/edocument.service";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createDispatchDocument(args: {
  unique: number;
  orderId: string | null;
}) {
  return prisma.businessDocument.create({
    data: {
      documentNumber: `EDOC-SHIP-TEST-${args.unique}`,
      documentType: "E_DISPATCH",
      status: "DRAFT",
      issueDate: new Date(),
      currency: "TRY",
      counterpartyName: "Test Musteri",
      counterpartyTaxNumber: "1234567890",
      counterpartyAddress: "Test Adres",
      orderId: args.orderId,
      lines: {
        create: {
          productSku: `EDOC-SHIP-SKU-${args.unique}`,
          productName: "Test Urun",
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
          currency: "TRY",
        },
      },
    },
    select: { id: true },
  });
}

async function main() {
  const unique = Date.now();

  // Bu betik kendi surecinde env degiskenlerini set ediyor; eDocumentShipmentConfigService
  // her cagride process.env'i taze okudugu icin ayni Node sureci icinde dogrudan servis
  // cagrisiyla test edilebiliyor (dev server'in ayri sureci gerekmiyor).
  process.env.EDOCUMENT_SHIPMENT_CARRIER_NAME = "Env Fallback Kargo";
  process.env.EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER = "9998887766";
  process.env.EDOCUMENT_SHIPMENT_VEHICLE_PLATE = "34ABC123";
  process.env.EDOCUMENT_SHIPMENT_DRIVER_NAME = "Env Soför";
  process.env.EDOCUMENT_SHIPMENT_DRIVER_TCKN = "11111111110";

  const carrierWithTax = await cariService.createCari({
    slug: `edoc-carrier-with-tax-${unique}`,
    name: `Gercek Kargo Firmasi ${unique}`,
    isCarrier: true,
    taxNumber: "5551112233",
  });

  const carrierWithoutTax = await cariService.createCari({
    slug: `edoc-carrier-no-tax-${unique}`,
    name: `Vergisiz Kargo Firmasi ${unique}`,
    isCarrier: true,
  });

  const orderWithCarrier = await prisma.order.create({
    data: {
      tenantId: "tenant-beemmb-platform",
      orderNumber: `EDOC-SHIP-ORDER-A-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
      carrierCariId: carrierWithTax.id,
      cargoTrackingNumber: "TRK-EDOC-1",
    },
    select: { id: true },
  });

  const orderWithCarrierNoTax = await prisma.order.create({
    data: {
      tenantId: "tenant-beemmb-platform",
      orderNumber: `EDOC-SHIP-ORDER-B-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
      carrierCariId: carrierWithoutTax.id,
    },
    select: { id: true },
  });

  const orderWithoutCarrier = await prisma.order.create({
    data: {
      tenantId: "tenant-beemmb-platform",
      orderNumber: `EDOC-SHIP-ORDER-C-${unique}`,
      status: "CONFIRMED",
      subtotal: 10,
      total: 10,
    },
    select: { id: true },
  });

  const docNoOrder = await createDispatchDocument({ unique, orderId: null });
  const docOrderNoCarrier = await createDispatchDocument({ unique: unique + 1, orderId: orderWithoutCarrier.id });
  const docOrderWithCarrier = await createDispatchDocument({ unique: unique + 2, orderId: orderWithCarrier.id });
  const docOrderCarrierNoTax = await createDispatchDocument({ unique: unique + 3, orderId: orderWithCarrierNoTax.id });

  // Senaryo 1: belge hicbir siparise bagli degil -> env fallback (mevcut davranis, degismemeli)
  const resultNoOrder = await eDocumentService.generateXml({ businessDocumentId: docNoOrder.id, validate: false });
  assert(resultNoOrder.item.xmlContent?.includes("Env Fallback Kargo"), "Siparişsiz belge env taşıyıcı adını kullanmalı");
  assert(resultNoOrder.item.xmlContent?.includes("9998887766"), "Siparişsiz belge env taşıyıcı VKN'sini kullanmalı");

  // Senaryo 2: belge bir siparise bagli ama sipariste kargo firmasi atanmamis -> yine env fallback
  const resultOrderNoCarrier = await eDocumentService.generateXml({ businessDocumentId: docOrderNoCarrier.id, validate: false });
  assert(resultOrderNoCarrier.item.xmlContent?.includes("Env Fallback Kargo"), "Kargo firması atanmamış sipariş env taşıyıcı adını kullanmalı");

  // Senaryo 3: siparişe gerçek kargo firması atanmış -> XML gerçek firma adını/VKN'sini yansıtmalı
  const resultWithCarrier = await eDocumentService.generateXml({ businessDocumentId: docOrderWithCarrier.id, validate: false });
  assert(resultWithCarrier.item.xmlContent?.includes(carrierWithTax.name), "Sipariş taşıyıcısının gerçek adı XML'de olmalı");
  assert(resultWithCarrier.item.xmlContent?.includes("5551112233"), "Sipariş taşıyıcısının gerçek VKN'si XML'de olmalı");
  assert(!resultWithCarrier.item.xmlContent?.includes("Env Fallback Kargo"), "Gerçek kargo firması varken env adı kullanılmamalı");

  // Senaryo 4: siparişteki kargo firmasının vergi no'su boş -> isim siparişten, VKN env'den (fallback zinciri)
  const resultCarrierNoTax = await eDocumentService.generateXml({ businessDocumentId: docOrderCarrierNoTax.id, validate: false });
  assert(resultCarrierNoTax.item.xmlContent?.includes(carrierWithoutTax.name), "Vergisiz kargo firmasının adı yine siparişten gelmeli");
  assert(resultCarrierNoTax.item.xmlContent?.includes("9998887766"), "Kargo firmasında VKN yoksa env VKN'sine düşülmeli");

  // Araç plakası / şoför bilgisi her durumda env'den gelmeye devam etmeli (kendi filo bilgisi, kargo firmasından bağımsız)
  assert(resultWithCarrier.item.xmlContent?.includes("34ABC123"), "Araç plakası her koşulda env'den gelmeli");
  assert(resultWithCarrier.item.xmlContent?.includes("Env Soför"), "Şoför adı her koşulda env'den gelmeli");

  await prisma.businessDocumentXmlArtifact.deleteMany({ where: { businessDocumentId: { in: [docNoOrder.id, docOrderNoCarrier.id, docOrderWithCarrier.id, docOrderCarrierNoTax.id] } } });
  await prisma.businessDocumentLine.deleteMany({ where: { businessDocumentId: { in: [docNoOrder.id, docOrderNoCarrier.id, docOrderWithCarrier.id, docOrderCarrierNoTax.id] } } });
  await prisma.businessDocument.deleteMany({ where: { id: { in: [docNoOrder.id, docOrderNoCarrier.id, docOrderWithCarrier.id, docOrderCarrierNoTax.id] } } });
  await prisma.order.deleteMany({ where: { id: { in: [orderWithCarrier.id, orderWithCarrierNoTax.id, orderWithoutCarrier.id] } } });
  await cariService.deleteCari(carrierWithTax.id, "system");
  await cariService.deleteCari(carrierWithoutTax.id, "system");

  console.log("E-Irsaliye siparis/kargo firmasi tasiyici baglama dogrulamasi gecti");
}

runWithTenantContext({ tenantId: "tenant-beemmb-platform", isPlatformOperator: false }, main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
