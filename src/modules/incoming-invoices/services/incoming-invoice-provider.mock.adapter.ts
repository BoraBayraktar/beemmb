import type {
  IncomingEDocumentProviderAdapter,
  IncomingEDocumentProviderFetchResult,
} from "@/modules/incoming-invoices/contracts/incoming-invoice-provider.contract";

export class MockIncomingEDocumentProviderAdapter implements IncomingEDocumentProviderAdapter {
  providerKey = "mock-incoming-edocs-provider";

  isConfigured() {
    return false;
  }

  isOperational() {
    return false;
  }

  async fetchIncomingInvoices(): Promise<IncomingEDocumentProviderFetchResult> {
    return {
      invoices: [],
      nextCursor: null,
    };
  }
}

export const mockIncomingEDocumentProviderAdapter = new MockIncomingEDocumentProviderAdapter();
