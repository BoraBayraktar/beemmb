export class EDocumentTaxConfigService {
  resolveTaxConfig() {
    const rawVatRate = process.env.EDOCUMENT_DEFAULT_VAT_RATE?.trim();
    const vatRate = rawVatRate ? Number(rawVatRate.replace(",", ".")) : null;

    return {
      vatRate: Number.isFinite(vatRate) ? vatRate : null,
    };
  }
}

export const eDocumentTaxConfigService = new EDocumentTaxConfigService();
