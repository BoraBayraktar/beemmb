import type { IncomingEDocumentProviderAdapter } from "@/modules/incoming-invoices/contracts/incoming-invoice-provider.contract";
import { mockIncomingEDocumentProviderAdapter } from "@/modules/incoming-invoices/services/incoming-invoice-provider.mock.adapter";

export class IncomingEDocumentProviderRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncomingEDocumentProviderRegistryError";
  }
}

export class IncomingEDocumentProviderRegistryService {
  private readonly adapters = new Map<string, IncomingEDocumentProviderAdapter>();

  constructor(adapters: IncomingEDocumentProviderAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.providerKey, adapter);
    }
  }

  resolve(providerKey?: string | null) {
    if (providerKey) {
      const adapter = this.adapters.get(providerKey);
      if (adapter) {
        return adapter;
      }
    }

    return mockIncomingEDocumentProviderAdapter;
  }

  resolveRequired(providerKey: string) {
    const adapter = this.adapters.get(providerKey);
    if (!adapter) {
      throw new IncomingEDocumentProviderRegistryError(`Gelen fatura sağlayıcı adaptörü bulunamadı: ${providerKey}`);
    }

    return adapter;
  }

  listProviderStatuses() {
    return Array.from(this.adapters.values())
      .map((adapter) => ({
        providerKey: adapter.providerKey,
        configured: adapter.isConfigured?.() !== false,
        operational: adapter.isOperational?.() !== false,
      }))
      .sort((left, right) => left.providerKey.localeCompare(right.providerKey));
  }
}

// NOT: Bugün yalnızca mock adaptör kayıtlı. Gerçek bir e-fatura entegratörü
// (Nilvera/Foriba/Uyumsoft vb.) bağlanacağı zaman burada yeni bir adaptör
// eklenip listeye dahil edilmesi yeterlidir — servis/route katmanı değişmez.
export const incomingEDocumentProviderRegistryService = new IncomingEDocumentProviderRegistryService([
  mockIncomingEDocumentProviderAdapter,
]);
