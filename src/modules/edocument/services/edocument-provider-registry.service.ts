import type { EDocumentProviderAdapter } from "@/modules/edocument/contracts/edocument-provider.contract";
import { liveEDocumentProviderAdapter } from "@/modules/edocument/services/live-edocument-provider.adapter";
import { mockEDocumentProviderAdapter } from "@/modules/edocument/services/mock-edocument-provider.adapter";

export class EDocumentProviderRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EDocumentProviderRegistryError";
  }
}

export class EDocumentProviderRegistryService {
  private readonly adapters = new Map<string, EDocumentProviderAdapter>();

  constructor(adapters: EDocumentProviderAdapter[]) {
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

    return mockEDocumentProviderAdapter;
  }

  resolveRequired(providerKey: string) {
    const adapter = this.adapters.get(providerKey);
    if (!adapter) {
      throw new EDocumentProviderRegistryError(`E-belge provider adapter bulunamadı: ${providerKey}`);
    }

    return adapter;
  }

  hasLiveAdapter() {
    return Array.from(this.adapters.values()).some((adapter) => adapter.providerKey !== mockEDocumentProviderAdapter.providerKey);
  }

  hasConfiguredLiveAdapter() {
    return Array.from(this.adapters.values()).some((adapter) => (
      adapter.providerKey !== mockEDocumentProviderAdapter.providerKey
      && adapter.isConfigured?.() !== false
    ));
  }

  hasOperationalLiveAdapter() {
    return Array.from(this.adapters.values()).some((adapter) => (
      adapter.providerKey !== mockEDocumentProviderAdapter.providerKey
      && adapter.isConfigured?.() !== false
      && adapter.isOperational?.() !== false
    ));
  }

  listProviderKeys() {
    return Array.from(this.adapters.keys()).sort();
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

export const eDocumentProviderRegistryService = new EDocumentProviderRegistryService([
  liveEDocumentProviderAdapter,
  mockEDocumentProviderAdapter,
]);
