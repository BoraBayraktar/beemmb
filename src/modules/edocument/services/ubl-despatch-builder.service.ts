import type { UblBusinessDocumentInput } from "@/modules/edocument/contracts/edocument.contract";
import { escapeXml, formatDate, formatTime, normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

function buildLineXml(line: UblBusinessDocumentInput["lines"][number], index: number) {
  return `    <cac:DespatchLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:Note>${escapeXml(line.note ?? line.productSku)}</cbc:Note>
      <cbc:DeliveredQuantity unitCode="C62">${line.quantity}</cbc:DeliveredQuantity>
      <cac:OrderLineReference><cbc:LineID>${index + 1}</cbc:LineID></cac:OrderLineReference>
      <cac:Item>
        <cbc:Name>${escapeXml(line.productName)}</cbc:Name>
        <cac:SellersItemIdentification><cbc:ID>${escapeXml(line.productSku)}</cbc:ID></cac:SellersItemIdentification>
      </cac:Item>
    </cac:DespatchLine>`;
}

export class UblDespatchBuilderService {
  build(document: UblBusinessDocumentInput) {
    const issueDate = formatDate(document.issueDate);
    const issueTime = formatTime(document.issueDate);
    const taxNumber = normalizeTaxNumber(document.counterpartyTaxNumber);
    const senderTaxNumber = normalizeTaxNumber(document.sender.taxNumber);
    const carrierTaxNumber = normalizeTaxNumber(document.shipment.carrierTaxNumber);
    const driverTckn = normalizeTaxNumber(document.shipment.driverTckn);

    return `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2.1</cbc:CustomizationID>
  <cbc:ProfileID>TEMELIRSALIYE</cbc:ProfileID>
  <cbc:ID>${escapeXml(document.documentNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(document.uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>
  <cbc:Note>${escapeXml(document.note)}</cbc:Note>
  <cbc:LineCountNumeric>${document.lines.length}</cbc:LineCountNumeric>
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${senderTaxNumber.length === 10 ? "VKN" : "TCKN"}">${escapeXml(senderTaxNumber)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(document.sender.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${escapeXml(document.sender.address)}</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${escapeXml(document.sender.taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:Contact><cbc:ElectronicMail>${escapeXml(document.sender.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:DespatchSupplierParty>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${taxNumber.length === 10 ? "VKN" : "TCKN"}">${taxNumber}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(document.counterpartyName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${escapeXml(document.counterpartyAddress)}</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${escapeXml(document.counterpartyTaxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:DeliveryCustomerParty>
  <cac:Shipment>
    <cbc:ID>${escapeXml(document.documentNumber)}</cbc:ID>
    <cac:ShipmentStage>
      <cac:CarrierParty>
        <cac:PartyIdentification><cbc:ID schemeID="${carrierTaxNumber.length === 10 ? "VKN" : "TCKN"}">${escapeXml(carrierTaxNumber)}</cbc:ID></cac:PartyIdentification>
        <cac:PartyName><cbc:Name>${escapeXml(document.shipment.carrierName)}</cbc:Name></cac:PartyName>
      </cac:CarrierParty>
      <cac:TransportMeans>
        <cac:RoadTransport><cbc:LicensePlateID>${escapeXml(document.shipment.vehiclePlate)}</cbc:LicensePlateID></cac:RoadTransport>
      </cac:TransportMeans>
      <cac:DriverPerson>
        <cbc:ID schemeID="TCKN">${escapeXml(driverTckn)}</cbc:ID>
        <cbc:FirstName>${escapeXml(document.shipment.driverName)}</cbc:FirstName>
        <cbc:FamilyName>-</cbc:FamilyName>
      </cac:DriverPerson>
    </cac:ShipmentStage>
    <cac:Delivery>
      <cac:Despatch><cbc:ActualDespatchDate>${issueDate}</cbc:ActualDespatchDate><cbc:ActualDespatchTime>${issueTime}</cbc:ActualDespatchTime></cac:Despatch>
    </cac:Delivery>
  </cac:Shipment>
${document.lines.map(buildLineXml).join("\n")}
</DespatchAdvice>`;
  }
}

export const ublDespatchBuilderService = new UblDespatchBuilderService();
