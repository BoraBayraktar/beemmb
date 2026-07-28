import type { UblBusinessDocumentInput } from "@/modules/edocument/contracts/edocument.contract";
import { ublDespatchBuilderService } from "@/modules/edocument/services/ubl-despatch-builder.service";
import { ublInvoiceBuilderService } from "@/modules/edocument/services/ubl-invoice-builder.service";
import { calculateInvoiceTotals } from "@/modules/edocument/services/ubl-tax.util";
import { ublValidationService } from "@/modules/edocument/services/ubl-validation.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildDocument(documentType: "E_INVOICE" | "E_DISPATCH"): UblBusinessDocumentInput {
  return {
    id: `doc-${documentType}`,
    uuid: "123e4567-e89b-42d3-a456-426614174000",
    documentNumber: "BEF2026000000001",
    documentType,
    issueDate: new Date("2026-07-25T10:30:15.000Z"),
    currency: "TRY",
    totalAmount: 120,
    counterpartyName: "Alıcı & Ortakları",
    counterpartyTaxNumber: "1234567890",
    counterpartyTaxOffice: "Kadıköy",
    counterpartyEmail: "alici@example.com",
    counterpartyAddress: "Test Mah. No: 1",
    note: "Test <notu>",
    sender: {
      name: "BEEMMB Yazılım",
      taxNumber: "9876543210",
      taxOffice: "Beşiktaş",
      email: "ebelge@example.com",
      address: "Gönderici adresi",
    },
    tax: {
      vatRate: 20,
    },
    shipment: {
      carrierName: "Taşıyıcı AŞ",
      carrierTaxNumber: "1234567890",
      vehiclePlate: "34ABC123",
      driverName: "Mehmet Test",
      driverTckn: "10000000146",
    },
    lines: [{
      id: "line-1",
      productSku: "SKU&1",
      productName: "Ürün <A>",
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
      currency: "TRY",
      note: "Satır <notu>",
    }],
  };
}

const invoiceDocument = buildDocument("E_INVOICE");
const invoiceXml = ublInvoiceBuilderService.build(invoiceDocument);
const invoiceTotals = calculateInvoiceTotals(invoiceDocument);
const invoiceReport = ublValidationService.validate(invoiceDocument, invoiceXml);

assert(invoiceXml.includes("<Invoice "), "E-fatura XML kökü Invoice olmalıdır.");
assert(invoiceXml.includes("<cbc:CustomizationID>TR1.2.1</cbc:CustomizationID>"), "E-fatura UBL-TR 1.2.1 customization taşımalıdır.");
assert(invoiceXml.includes("<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>"), "E-fatura satış tipi üretmelidir.");
assert(invoiceXml.includes("Alıcı &amp; Ortakları"), "E-fatura alıcı unvanını XML kaçışlamalıdır.");
assert(invoiceXml.includes("Test &lt;notu&gt;"), "E-fatura not alanını XML kaçışlamalıdır.");
assert(invoiceXml.includes(`<cbc:TaxInclusiveAmount currencyID="TRY">${invoiceTotals.taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>`), "E-fatura KDV dahil toplamı üretmelidir.");
assert(invoiceReport.documentRootType === "INVOICE", "E-fatura raporu Invoice root tipi üretmelidir.");
assert(Boolean(invoiceReport.xsdHash), "Resmi fatura XSD dosyası kurulu iken rapor hash alanı taşımalıdır.");
assert(Boolean(invoiceReport.schematronHash), "Resmi fatura Schematron dosyası kurulu iken rapor hash alanı taşımalıdır.");
assert(invoiceReport.localRuleValid, "Geçerli e-fatura yerel kurallardan geçmelidir.");
assert(invoiceReport.issues.some((issue) => issue.code === "MISSING_VALIDATION_ENGINE"), "Validator komutu yokken e-fatura raporu eksik doğrulama motoru issue üretmelidir.");

const despatchDocument = buildDocument("E_DISPATCH");
const despatchXml = ublDespatchBuilderService.build(despatchDocument);
const despatchReport = ublValidationService.validate(despatchDocument, despatchXml);

assert(despatchXml.includes("<DespatchAdvice "), "E-irsaliye XML kökü DespatchAdvice olmalıdır.");
assert(despatchXml.includes("<cbc:CustomizationID>TR1.2.1</cbc:CustomizationID>"), "E-irsaliye UBL-TR 1.2.1 customization taşımalıdır.");
assert(despatchXml.includes("<cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>"), "E-irsaliye sevk tipi üretmelidir.");
assert(despatchXml.includes("<cbc:LicensePlateID>34ABC123</cbc:LicensePlateID>"), "E-irsaliye araç plakasını taşımalıdır.");
assert(despatchXml.includes("<cbc:ID schemeID=\"TCKN\">10000000146</cbc:ID>"), "E-irsaliye şoför TCKN bilgisini taşımalıdır.");
assert(despatchReport.documentRootType === "DESPATCH_ADVICE", "E-irsaliye raporu DespatchAdvice root tipi üretmelidir.");
assert(Boolean(despatchReport.xsdHash), "Resmi irsaliye XSD dosyası kurulu iken rapor hash alanı taşımalıdır.");
assert(Boolean(despatchReport.schematronHash), "Resmi irsaliye Schematron dosyası kurulu iken rapor hash alanı taşımalıdır.");
assert(despatchReport.localRuleValid, "Geçerli e-irsaliye yerel kurallardan geçmelidir.");
assert(despatchReport.issues.some((issue) => issue.code === "MISSING_VALIDATION_ENGINE"), "Validator komutu yokken e-irsaliye raporu eksik doğrulama motoru issue üretmelidir.");

console.log("E-belge UBL builder doğrulaması geçti.");
