import { normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

export type EDocumentShipmentOrderContext = {
  carrierCompanyName: string | null;
  carrierCompanyTaxNumber: string | null;
};

export class EDocumentShipmentConfigService {
  /**
   * Taşıyıcı adı ve VKN/TCKN'si önce siparişe atanmış CarrierCompany kaydından okunur;
   * sipariş kargo bilgisi girilmemişse (veya belge bir siparişe bağlı değilse) mevcut
   * env tabanlı sabit değerlere düşülür. Araç plakası/şoför bilgisi kasıtlı olarak
   * yalnızca env'den okunur: bunlar kendi filo/şoför bilgisidir, Yurtiçi Kargo gibi
   * üçüncü taraf kargo firmaları için bilinmez.
   */
  resolveShipment(order?: EDocumentShipmentOrderContext | null) {
    const envCarrierTaxNumber = normalizeTaxNumber(process.env.EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER);
    const orderCarrierTaxNumber = normalizeTaxNumber(order?.carrierCompanyTaxNumber);
    const driverTckn = normalizeTaxNumber(process.env.EDOCUMENT_SHIPMENT_DRIVER_TCKN);

    return {
      carrierName: order?.carrierCompanyName?.trim() || process.env.EDOCUMENT_SHIPMENT_CARRIER_NAME?.trim() || null,
      carrierTaxNumber: orderCarrierTaxNumber || envCarrierTaxNumber || null,
      vehiclePlate: process.env.EDOCUMENT_SHIPMENT_VEHICLE_PLATE?.trim() || null,
      driverName: process.env.EDOCUMENT_SHIPMENT_DRIVER_NAME?.trim() || null,
      driverTckn: driverTckn || null,
    };
  }
}

export const eDocumentShipmentConfigService = new EDocumentShipmentConfigService();
