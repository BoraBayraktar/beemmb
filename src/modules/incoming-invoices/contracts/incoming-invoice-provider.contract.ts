export type IncomingEDocumentProviderInvoice = {
  externalReference: string;
  documentNumber: string;
  issueDate: string;
  currency: string;
  counterpartyName: string;
  counterpartyTaxNumber?: string | null;
  counterpartyTaxOffice?: string | null;
  counterpartyEmail?: string | null;
  counterpartyAddress?: string | null;
  xmlContent?: string | null;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal?: number | null;
    vatRate?: number | null;
  }>;
};

export type IncomingEDocumentProviderFetchResult = {
  invoices: IncomingEDocumentProviderInvoice[];
  nextCursor?: string | null;
};

export interface IncomingEDocumentProviderAdapter {
  providerKey: string;
  isConfigured?(): boolean;
  isOperational?(): boolean;
  fetchIncomingInvoices(input: {
    since?: Date | null;
    cursor?: string | null;
  }): Promise<IncomingEDocumentProviderFetchResult>;
}
