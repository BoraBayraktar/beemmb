import { normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

export class EDocumentShipmentConfigService {
  resolveShipment() {
    const carrierTaxNumber = normalizeTaxNumber(process.env.EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER);
    const driverTckn = normalizeTaxNumber(process.env.EDOCUMENT_SHIPMENT_DRIVER_TCKN);

    return {
      carrierName: process.env.EDOCUMENT_SHIPMENT_CARRIER_NAME?.trim() || null,
      carrierTaxNumber: carrierTaxNumber || null,
      vehiclePlate: process.env.EDOCUMENT_SHIPMENT_VEHICLE_PLATE?.trim() || null,
      driverName: process.env.EDOCUMENT_SHIPMENT_DRIVER_NAME?.trim() || null,
      driverTckn: driverTckn || null,
    };
  }
}

export const eDocumentShipmentConfigService = new EDocumentShipmentConfigService();
