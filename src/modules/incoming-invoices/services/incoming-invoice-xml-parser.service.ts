import { createHash } from "crypto";

import { XMLParser } from "fast-xml-parser";

export class IncomingInvoiceXmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncomingInvoiceXmlParseError";
  }
}

export type ParsedIncomingInvoiceLine = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number | null;
  vatRate: number | null;
};

export type ParsedIncomingInvoice = {
  documentNumber: string;
  issueDate: string;
  currency: string;
  counterpartyName: string;
  counterpartyTaxNumber: string | null;
  counterpartyTaxOffice: string | null;
  counterpartyEmail: string | null;
  counterpartyAddress: string | null;
  totalAmount: number | null;
  lines: ParsedIncomingInvoiceLine[];
};

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  textNodeName: "#text",
  parseTagValue: true,
  trimValues: true,
});

function asRecord(value: unknown): XmlNode | null {
  return value && typeof value === "object" ? (value as XmlNode) : null;
}

function toArray(value: unknown): XmlNode[] {
  if (value === undefined || value === null) {
    return [];
  }

  const list = Array.isArray(value) ? value : [value];
  return list.map((entry) => asRecord(entry) ?? {});
}

function readText(node: unknown): string | null {
  if (node === undefined || node === null) {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim() || null;
  }

  const record = asRecord(node);
  if (record && "#text" in record) {
    const value = record["#text"];
    if (value === undefined || value === null) {
      return null;
    }
    return String(value).trim() || null;
  }

  return null;
}

function readNumber(node: unknown): number | null {
  const text = readText(node);
  if (text === null) {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

// UBL-TR faturaları GİB standardı gerektirdiği için kendi ürettiğimiz XML
// (ubl-invoice-builder.service.ts) ile üçüncü taraf entegratörlerden/GİB
// portalından inen XML aynı temel yapıyı (Invoice/cac:AccountingSupplierParty/
// cac:InvoiceLine) paylaşır. removeNSPrefix sayesinde "cac:"/"cbc:" önekleri
// fark etmeksizin ayrıştırma yapılabilir.
export class IncomingInvoiceXmlParserService {
  parse(xmlContent: string): ParsedIncomingInvoice {
    let parsed: XmlNode;
    try {
      parsed = parser.parse(xmlContent) as XmlNode;
    } catch {
      throw new IncomingInvoiceXmlParseError("XML dosyası ayrıştırılamadı — geçersiz XML.");
    }

    const invoice = asRecord(parsed.Invoice);
    if (!invoice) {
      throw new IncomingInvoiceXmlParseError("XML kök elemanı UBL-TR Invoice değil.");
    }

    const documentNumber = readText(invoice.ID);
    if (!documentNumber) {
      throw new IncomingInvoiceXmlParseError("Fatura numarası (cbc:ID) bulunamadı.");
    }

    const issueDateRaw = readText(invoice.IssueDate);
    if (!issueDateRaw) {
      throw new IncomingInvoiceXmlParseError("Fatura tarihi (cbc:IssueDate) bulunamadı.");
    }

    const issueDate = new Date(issueDateRaw);
    if (Number.isNaN(issueDate.getTime())) {
      throw new IncomingInvoiceXmlParseError(`Fatura tarihi ayrıştırılamadı: ${issueDateRaw}`);
    }

    const currency = readText(invoice.DocumentCurrencyCode) ?? "TRY";

    const supplierParty = asRecord(asRecord(invoice.AccountingSupplierParty)?.Party);
    if (!supplierParty) {
      throw new IncomingInvoiceXmlParseError("Gönderici taraf bilgisi (AccountingSupplierParty) bulunamadı.");
    }

    const counterpartyName = readText(asRecord(supplierParty.PartyName)?.Name);
    if (!counterpartyName) {
      throw new IncomingInvoiceXmlParseError("Gönderici unvan bilgisi bulunamadı.");
    }

    const counterpartyTaxNumber = readText(asRecord(supplierParty.PartyIdentification)?.ID);
    const counterpartyTaxOffice = readText(asRecord(asRecord(supplierParty.PartyTaxScheme)?.TaxScheme)?.Name);
    const counterpartyEmail = readText(asRecord(supplierParty.Contact)?.ElectronicMail);
    const counterpartyAddress = readText(asRecord(supplierParty.PostalAddress)?.StreetName);

    const totalAmount = readNumber(asRecord(invoice.LegalMonetaryTotal)?.PayableAmount);

    const lineNodes = toArray(invoice.InvoiceLine);
    if (lineNodes.length === 0) {
      throw new IncomingInvoiceXmlParseError("Fatura kalemi (InvoiceLine) bulunamadı.");
    }

    const lines: ParsedIncomingInvoiceLine[] = lineNodes.map((lineNode, index) => {
      const item = asRecord(lineNode.Item);
      const price = asRecord(lineNode.Price);
      const taxSubtotal = asRecord(asRecord(lineNode.TaxTotal)?.TaxSubtotal);

      const productName = readText(item?.Name) ?? `Kalem ${index + 1}`;
      const quantity = readNumber(lineNode.InvoicedQuantity) ?? 1;
      const lineTotal = readNumber(lineNode.LineExtensionAmount);
      const priceAmount = readNumber(price?.PriceAmount);
      const unitPrice = priceAmount ?? (lineTotal !== null && quantity > 0 ? Number((lineTotal / quantity).toFixed(4)) : 0);
      const vatRate = readNumber(taxSubtotal?.Percent);

      return { productName, quantity, unitPrice, lineTotal, vatRate };
    });

    return {
      documentNumber,
      issueDate: issueDate.toISOString(),
      currency,
      counterpartyName,
      counterpartyTaxNumber,
      counterpartyTaxOffice,
      counterpartyEmail,
      counterpartyAddress,
      totalAmount,
      lines,
    };
  }

  computeXmlHash(xmlContent: string) {
    return createHash("sha256").update(xmlContent).digest("hex");
  }
}

export const incomingInvoiceXmlParserService = new IncomingInvoiceXmlParserService();
