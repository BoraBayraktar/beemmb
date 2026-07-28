import { normalizeTaxNumber } from "@/modules/edocument/services/ubl-xml.util";

export class EDocumentSenderConfigService {
  resolveSender() {
    const taxNumber = normalizeTaxNumber(process.env.EDOCUMENT_SENDER_TAX_NUMBER);

    return {
      name: process.env.EDOCUMENT_SENDER_NAME?.trim() || null,
      taxNumber: taxNumber || null,
      taxOffice: process.env.EDOCUMENT_SENDER_TAX_OFFICE?.trim() || null,
      email: process.env.EDOCUMENT_SENDER_EMAIL?.trim() || null,
      address: process.env.EDOCUMENT_SENDER_ADDRESS?.trim() || null,
    };
  }
}

export const eDocumentSenderConfigService = new EDocumentSenderConfigService();
