import type { UblBusinessDocumentInput } from "@/modules/edocument/contracts/edocument.contract";
import { calculateInvoiceTotals, calculateVatAmount, getLineTaxBase } from "@/modules/edocument/services/ubl-tax.util";
import { escapeXml, formatAmount, formatDate, formatTime, normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

function buildLineXml(line: UblBusinessDocumentInput["lines"][number], index: number, vatRate: number | null) {
  const lineTotal = getLineTaxBase(line);
  const taxAmount = calculateVatAmount(lineTotal, vatRate);

  return `    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:Note>${escapeXml(line.note ?? line.productSku)}</cbc:Note>
      <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escapeXml(line.currency)}">${formatAmount(lineTotal)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${escapeXml(line.currency)}">${formatAmount(taxAmount)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${escapeXml(line.currency)}">${formatAmount(lineTotal)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${escapeXml(line.currency)}">${formatAmount(taxAmount)}</cbc:TaxAmount>
          <cbc:Percent>${formatAmount(vatRate)}</cbc:Percent>
          <cac:TaxCategory>
            <cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(line.productName)}</cbc:Name>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(line.productSku)}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${escapeXml(line.currency)}">${formatAmount(line.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
}

export class UblInvoiceBuilderService {
  build(document: UblBusinessDocumentInput) {
    const issueDate = formatDate(document.issueDate);
    const issueTime = formatTime(document.issueDate);
    const taxNumber = normalizeTaxNumber(document.counterpartyTaxNumber);
    const senderTaxNumber = normalizeTaxNumber(document.sender.taxNumber);
    const totals = calculateInvoiceTotals(document);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2.1</cbc:CustomizationID>
  <cbc:ProfileID>TEMELFATURA</cbc:ProfileID>
  <cbc:ID>${escapeXml(document.documentNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(document.uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(document.note)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${escapeXml(document.currency)}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${document.lines.length}</cbc:LineCountNumeric>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${senderTaxNumber.length === 10 ? "VKN" : "TCKN"}">${escapeXml(senderTaxNumber)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(document.sender.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${escapeXml(document.sender.address)}</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${escapeXml(document.sender.taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:Contact><cbc:ElectronicMail>${escapeXml(document.sender.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:WebsiteURI>${escapeXml(document.counterpartyEmail)}</cbc:WebsiteURI>
      <cac:PartyIdentification><cbc:ID schemeID="${taxNumber.length === 10 ? "VKN" : "TCKN"}">${taxNumber}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(document.counterpartyName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${escapeXml(document.counterpartyAddress)}</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${escapeXml(document.counterpartyTaxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxExclusiveAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxAmount)}</cbc:TaxAmount>
      <cbc:Percent>${formatAmount(document.tax.vatRate)}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxExclusiveAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(document.currency)}">${formatAmount(totals.payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${document.lines.map((line, index) => buildLineXml(line, index, document.tax.vatRate)).join("\n")}
</Invoice>`;
  }
}

export const ublInvoiceBuilderService = new UblInvoiceBuilderService();
