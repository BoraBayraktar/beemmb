import { financeAccountEntryRepository } from "@/modules/finance/repositories/finance-account-entry.repository";
import { incomingInvoiceProviderConfigService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-config.service";
import { incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { incomingEDocumentProviderRegistryService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-registry.service";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>VRF2026000001</cbc:ID>
  <cbc:IssueDate>2026-08-10</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">1234567890</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>Test Tedarikci A.S.</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>Test Mah. No:1</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>Kadikoy</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:Contact><cbc:ElectronicMail>tedarikci@example.com</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="TRY">1180.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">2</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">1000.00</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cac:TaxSubtotal>
        <cbc:Percent>18</cbc:Percent>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item><cbc:Name>Ofis malzemesi</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="TRY">500.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

async function main() {
  // 1) Manuel giriş: DRAFT -> otomatik POSTED, finans defterine 770/320 kaydı düşmeli.
  const manual = await incomingInvoiceService.createManualIncomingInvoice({
    documentNumber: `MANUAL-VRF-${Date.now()}`,
    issueDate: new Date().toISOString(),
    counterpartyName: "Verify Manuel Tedarikci",
    counterpartyTaxNumber: "9998887770",
    lines: [{ productName: "Danismanlik hizmeti", quantity: 1, unitPrice: 500 }],
  });
  assert(manual.source === "MANUAL", "Manuel fatura source=MANUAL olmali.");
  assert(manual.status === "POSTED", "Manuel fatura otomatik olarak POSTED durumuna gecmeli.");
  assert(manual.totalAmount === 500, `Manuel fatura toplami 500 olmali, geldi: ${manual.totalAmount}`);

  const manualEntries = await financeAccountEntryRepository.countBySource("INCOMING_INVOICE", manual.id);
  assert(manualEntries > 0, "Manuel fatura icin finans defteri kaydi olusmali.");

  const manualLedgerRows = await prisma.financeAccountEntry.findMany({ where: { sourceType: "INCOMING_INVOICE", sourceId: manual.id } });
  assert(manualLedgerRows.length === 2, `Manuel fatura icin 2 defter satiri (borc/alacak) beklenir, gelen: ${manualLedgerRows.length}`);
  const debit = manualLedgerRows.find((row) => row.side === "DEBIT");
  const credit = manualLedgerRows.find((row) => row.side === "CREDIT");
  assert(Boolean(debit) && Boolean(credit), "Borc ve alacak satirlari olusmali.");

  // 2) XML import: DRAFT'ta kalmali, finansa hemen gitmemeli.
  const imported = await incomingInvoiceService.importIncomingInvoiceFromXml({ xmlContent: sampleXml });
  assert(imported.source === "XML_IMPORT", "XML import source=XML_IMPORT olmali.");
  assert(imported.status === "DRAFT", "XML import sonrasi fatura DRAFT durumunda kalmali (kullanici onayi bekler).");
  assert(imported.documentNumber === "VRF2026000001", "XML'den fatura numarasi dogru ayristirilmali.");
  assert(imported.counterpartyName === "Test Tedarikci A.S.", "XML'den unvan dogru ayristirilmali.");
  assert(imported.counterpartyTaxNumber === "1234567890", "XML'den VKN dogru ayristirilmali.");
  assert(imported.lines.length === 1, "XML'den tek kalem ayristirilmali.");
  assert(imported.lines[0].lineTotal === 1000, `XML kalem tutari 1000 olmali, geldi: ${imported.lines[0].lineTotal}`);
  assert(imported.hasXmlArtifact, "XML artifact kaydedilmis olmali.");

  const preReviewLedgerRows = await prisma.financeAccountEntry.findMany({ where: { sourceType: "INCOMING_INVOICE", sourceId: imported.id } });
  assert(preReviewLedgerRows.length === 0, "Onay verilmeden finans kaydi olusmamali.");

  // 2b) Ayni XML tekrar yuklenirse reddedilmeli (dedup).
  let duplicateRejected = false;
  try {
    await incomingInvoiceService.importIncomingInvoiceFromXml({ xmlContent: sampleXml });
  } catch (error) {
    duplicateRejected = error instanceof Error && error.message.includes("daha önce içe aktarılmış");
  }
  assert(duplicateRejected, "Ayni XML tekrar import edilmeye calisilinca reddedilmeli.");

  // 3) Onayla -> REVIEWED + finans kaydi (POSTED).
  const reviewed = await incomingInvoiceService.reviewIncomingInvoice(imported.id);
  assert(reviewed.status === "POSTED", "Onaylanan fatura POSTED durumuna gecmeli.");

  const postReviewLedgerRows = await prisma.financeAccountEntry.findMany({ where: { sourceType: "INCOMING_INVOICE", sourceId: imported.id } });
  assert(postReviewLedgerRows.length === 2, `Onay sonrasi 2 defter satiri beklenir, gelen: ${postReviewLedgerRows.length}`);

  // 4) POSTED fatura iptal edilememeli.
  let postedCancelRejected = false;
  try {
    await incomingInvoiceService.cancelIncomingInvoice(imported.id);
  } catch (error) {
    postedCancelRejected = error instanceof Error && error.message.includes("Muhasebeleştirilmiş");
  }
  assert(postedCancelRejected, "Muhasebelesmis (POSTED) fatura iptal edilmeye calisilinca reddedilmeli.");

  // 5) Listeleme calisir ve yeni kayitlari icerir.
  const list = await incomingInvoiceService.listIncomingInvoices({ search: "Verify Manuel Tedarikci", page: 1, pageSize: 10 });
  assert(list.items.some((item) => item.id === manual.id), "Liste aramasi manuel kaydi bulmali.");

  // 6) Entegrator altyapisi: mock adapter bos sonuc dondurmeli, hicbir provider aktif degil.
  const providerConfigs = await incomingInvoiceProviderConfigService.listProviderConfigs();
  assert(providerConfigs.every((config) => !config.isActive || config.adapterConfigured === false), "Hicbir entegrator gercekten yapilandirilmis olmamali (v1 kapsaminda).");
  const mockResult = await incomingEDocumentProviderRegistryService.resolve(undefined).fetchIncomingInvoices({});
  assert(mockResult.invoices.length === 0, "Mock entegrator adaptoru bos sonuc dondurmeli.");

  console.log("verify-incoming-invoices: ok");
}

runWithTenantContext({ tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false }, main)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
