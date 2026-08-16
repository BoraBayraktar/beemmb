import type { GIBComplianceIssue, GIBComplianceReport, UblBusinessDocumentInput } from "@/modules/edocument/contracts/edocument.contract";
import { isValidGibDocumentNumber } from "@/lib/gib-document-number";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";
import { officialValidationAdapterService } from "@/modules/edocument/services/official-validation-adapter.service";
import { calculateInvoiceTotals } from "@/modules/edocument/services/ubl-tax.util";
import { isUuid, normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

export class UblValidationService {
  validate(document: UblBusinessDocumentInput, xmlContent: string): GIBComplianceReport {
    const documentRootType = document.documentType === "E_INVOICE" ? "INVOICE" : "DESPATCH_ADVICE";
    const schemaStatus = gibSchemaManifestService.getStatus(documentRootType);
    const issues: GIBComplianceIssue[] = [];
    const taxNumber = normalizeTaxNumber(document.counterpartyTaxNumber);
    const senderTaxNumber = normalizeTaxNumber(document.sender.taxNumber);
    const carrierTaxNumber = normalizeTaxNumber(document.shipment.carrierTaxNumber);
    const driverTckn = normalizeTaxNumber(document.shipment.driverTckn);

    if (!xmlContent.includes(document.documentType === "E_INVOICE" ? "<Invoice " : "<DespatchAdvice ")) {
      issues.push({
        code: "XML_ROOT_MISMATCH",
        severity: "ERROR",
        message: "XML kök elemanı belge tipi ile uyumlu değil.",
        path: "/",
      });
    }

    if (!document.documentNumber.trim()) {
      issues.push({ code: "MISSING_DOCUMENT_NUMBER", severity: "ERROR", message: "Belge numarası zorunludur.", path: "cbc:ID" });
    } else if (!isValidGibDocumentNumber(document.documentNumber)) {
      issues.push({
        code: "INVALID_DOCUMENT_NUMBER_FORMAT",
        severity: "ERROR",
        message: "Belge numarası 3 karakter seri, 4 haneli yıl ve 9 haneli sıra formatında olmalıdır.",
        path: "cbc:ID",
      });
    }

    if (!isUuid(document.uuid)) {
      issues.push({ code: "INVALID_DOCUMENT_UUID", severity: "ERROR", message: "ETTN/UUID geçerli UUID formatında olmalıdır.", path: "cbc:UUID" });
    }

    if (!document.sender.name?.trim()) {
      issues.push({ code: "MISSING_SUPPLIER_IDENTITY", severity: "ERROR", message: "Gönderici unvanı EDOCUMENT_SENDER_NAME ile tanımlanmalıdır.", path: "cac:AccountingSupplierParty|cac:DespatchSupplierParty" });
    }

    if (!senderTaxNumber) {
      issues.push({ code: "MISSING_SUPPLIER_IDENTITY", severity: "ERROR", message: "Gönderici VKN/TCKN EDOCUMENT_SENDER_TAX_NUMBER ile tanımlanmalıdır.", path: "cac:PartyIdentification/cbc:ID" });
    } else if (![10, 11].includes(senderTaxNumber.length)) {
      issues.push({ code: "INVALID_SUPPLIER_TAX_NUMBER", severity: "ERROR", message: "Gönderici VKN/TCKN alanı 10 veya 11 haneli olmalıdır.", path: "cac:PartyIdentification/cbc:ID" });
    }

    if (!taxNumber) {
      issues.push({ code: "MISSING_TAX_NUMBER", severity: "ERROR", message: "Alıcı VKN/TCKN alanı zorunludur.", path: "cac:PartyIdentification/cbc:ID" });
    } else if (![10, 11].includes(taxNumber.length)) {
      issues.push({ code: "INVALID_TAX_NUMBER", severity: "ERROR", message: "Alıcı VKN/TCKN alanı 10 veya 11 haneli olmalıdır.", path: "cac:PartyIdentification/cbc:ID" });
    }

    if (!document.counterpartyName.trim()) {
      issues.push({ code: "MISSING_COUNTERPARTY_NAME", severity: "ERROR", message: "Alıcı/unvan bilgisi zorunludur.", path: "cac:PartyName/cbc:Name" });
    }

    if (!document.counterpartyAddress?.trim()) {
      issues.push({ code: "MISSING_COUNTERPARTY_ADDRESS", severity: "WARNING", message: "Alıcı adresi GİB uyumluluğu için tamamlanmalıdır.", path: "cac:PostalAddress" });
    }

    if (document.lines.length === 0) {
      issues.push({ code: "MISSING_LINE", severity: "ERROR", message: "En az bir belge satırı zorunludur.", path: "cac:InvoiceLine|cac:DespatchLine" });
    }

    if (document.lines.some((line) => line.quantity <= 0)) {
      issues.push({ code: "INVALID_LINE_QUANTITY", severity: "ERROR", message: "Satır miktarları sıfırdan büyük olmalıdır.", path: "cbc:InvoicedQuantity|cbc:DeliveredQuantity" });
    }

    if (document.documentType === "E_INVOICE") {
      if (document.tax.vatRate === null) {
        issues.push({ code: "MISSING_TAX_RATE", severity: "ERROR", message: "Fatura KDV oranı EDOCUMENT_DEFAULT_VAT_RATE ile tanımlanmalıdır.", path: "cac:TaxTotal/cac:TaxSubtotal/cbc:Percent" });
      } else if (document.tax.vatRate < 0 || document.tax.vatRate > 100) {
        issues.push({ code: "INVALID_TAX_RATE", severity: "ERROR", message: "Fatura KDV oranı 0 ile 100 arasında olmalıdır.", path: "cac:TaxTotal/cac:TaxSubtotal/cbc:Percent" });
      }

      if (document.totalAmount !== null && document.totalAmount < 0) {
        issues.push({ code: "INVALID_TOTAL_AMOUNT", severity: "ERROR", message: "Fatura toplamı negatif olamaz.", path: "cac:LegalMonetaryTotal" });
      }

      if (document.totalAmount !== null) {
        const totals = calculateInvoiceTotals(document);
        if (Math.abs(document.totalAmount - totals.taxInclusiveAmount) > 0.05) {
          issues.push({
            code: "TOTAL_AMOUNT_MISMATCH",
            severity: "WARNING",
            message: "Fatura toplamı satır toplamları ve KDV oranından hesaplanan tutarla uyumlu değil.",
            path: "cac:LegalMonetaryTotal/cbc:PayableAmount",
          });
        }
      }
    }

    if (document.documentType === "E_DISPATCH") {
      if (!document.shipment.carrierName?.trim()) {
        issues.push({ code: "MISSING_DESPATCH_SHIPMENT_PARTY", severity: "ERROR", message: "E-irsaliye taşıyıcı adı tanımlanmalıdır (siparişe kargo firması atayın veya EDOCUMENT_SHIPMENT_CARRIER_NAME ile varsayılan tanımlayın).", path: "cac:ShipmentStage/cac:CarrierParty" });
      }

      if (!carrierTaxNumber || ![10, 11].includes(carrierTaxNumber.length)) {
        issues.push({ code: "MISSING_DESPATCH_SHIPMENT_PARTY", severity: "ERROR", message: "E-irsaliye taşıyıcı VKN/TCKN 10 veya 11 haneli olmalıdır (siparişteki kargo firmasının veya varsayılan taşıyıcının vergi numarasını kontrol edin).", path: "cac:ShipmentStage/cac:CarrierParty/cac:PartyIdentification/cbc:ID" });
      }

      if (!document.shipment.vehiclePlate?.trim()) {
        issues.push({ code: "MISSING_DESPATCH_SHIPMENT_PARTY", severity: "ERROR", message: "E-irsaliye araç plakası EDOCUMENT_SHIPMENT_VEHICLE_PLATE ile tanımlanmalıdır.", path: "cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID" });
      }

      if (!document.shipment.driverName?.trim()) {
        issues.push({ code: "MISSING_DESPATCH_SHIPMENT_PARTY", severity: "ERROR", message: "E-irsaliye şoför adı EDOCUMENT_SHIPMENT_DRIVER_NAME ile tanımlanmalıdır.", path: "cac:ShipmentStage/cac:DriverPerson" });
      }

      if (!driverTckn || driverTckn.length !== 11) {
        issues.push({ code: "MISSING_DESPATCH_SHIPMENT_PARTY", severity: "ERROR", message: "E-irsaliye şoför TCKN 11 haneli olmalıdır.", path: "cac:ShipmentStage/cac:DriverPerson/cbc:ID" });
      }
    }

    const localRuleValid = issues.every((issue) => issue.severity !== "ERROR");
    const xsdResult = officialValidationAdapterService.validateXsd(documentRootType, xmlContent);
    const schematronResult = officialValidationAdapterService.validateSchematron(documentRootType, xmlContent);
    const allIssues = [...issues, ...xsdResult.issues, ...schematronResult.issues];

    return {
      documentRootType,
      schemaVersion: schemaStatus.schemaVersion,
      officialSchemaReady: schemaStatus.officialSchemaReady,
      xsdHash: schemaStatus.xsdHash,
      officialSchematronReady: schemaStatus.officialSchematronReady,
      schematronHash: schemaStatus.schematronHash,
      localRuleValid,
      xsdValidationReady: xsdResult.ready,
      schematronValidationReady: schematronResult.ready,
      valid: allIssues.every((issue) => issue.severity !== "ERROR"),
      issues: allIssues,
    };
  }
}

export const ublValidationService = new UblValidationService();
