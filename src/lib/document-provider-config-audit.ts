import type { AdminDocumentProviderConfigItem } from "@/modules/documents/contracts/document.contract";

export function buildDocumentProviderConfigAuditMetadata(item: AdminDocumentProviderConfigItem) {
  return {
    providerCode: item.providerCode,
    isDefault: item.isDefault,
    isActive: item.isActive,
    supportsStatusSync: item.supportsStatusSync,
    hasSecretKey: Boolean(item.secretKeyMasked),
    hasWebhookSecret: Boolean(item.webhookSecretMasked),
    adapterRegistered: item.adapterRegistered,
    adapterConfigured: item.adapterConfigured,
    adapterOperational: item.adapterOperational,
  };
}
