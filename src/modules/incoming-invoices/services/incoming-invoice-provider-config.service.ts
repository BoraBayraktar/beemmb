import { createHmac } from "node:crypto";

import { z } from "zod";

import { runWithTenantContext } from "@/lib/tenant-context";
import { documentProviderCryptoService } from "@/modules/documents/services/document-provider-crypto.service";
import type {
  AdminIncomingInvoiceProviderConfigItem,
  AdminUpsertIncomingInvoiceProviderConfigInput,
} from "@/modules/incoming-invoices/contracts/incoming-invoice.contract";
import { IncomingInvoiceRepository, incomingInvoiceRepository } from "@/modules/incoming-invoices/repositories/incoming-invoice.repository";
import { incomingEDocumentProviderRegistryService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-registry.service";
import { platformService } from "@/modules/platform/services/platform.service";

const upsertSchema = z.object({
  id: z.string().trim().min(1).optional(),
  providerCode: z.string().trim().min(2).max(64),
  displayName: z.string().trim().min(2).max(120),
  endpointUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
  username: z.string().trim().max(120).optional().nullable().or(z.literal("")).transform((value) => value || null),
  secretKey: z.string().trim().max(200).optional().nullable().or(z.literal("")).transform((value) => value || null),
  webhookSecret: z.string().trim().max(200).optional().nullable().or(z.literal("")).transform((value) => value || null),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  note: z.string().trim().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
});

export class IncomingInvoiceProviderConfigError extends Error {
  constructor(message: string, public readonly status = 404) {
    super(message);
    this.name = "IncomingInvoiceProviderConfigError";
  }
}

function verifyIncomingInvoiceWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string | null) {
  if (!webhookSecret || !signature) {
    return false;
  }

  const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return documentProviderCryptoService.compareSecret(digest, signature);
}

function maskSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function mapProviderConfig(item: Awaited<ReturnType<IncomingInvoiceRepository["listProviderConfigs"]>>[number]): AdminIncomingInvoiceProviderConfigItem {
  const status = incomingEDocumentProviderRegistryService
    .listProviderStatuses()
    .find((entry) => entry.providerKey === item.providerCode);

  return {
    id: item.id,
    providerCode: item.providerCode,
    displayName: item.displayName,
    endpointUrl: item.endpointUrl,
    username: item.username,
    secretKeyMasked: maskSecret(item.secretKey),
    webhookSecretMasked: maskSecret(item.webhookSecret),
    isActive: item.isActive,
    isDefault: item.isDefault,
    adapterRegistered: Boolean(status),
    adapterConfigured: status?.configured ?? false,
    lastSyncedAt: item.lastSyncedAt ? item.lastSyncedAt.toISOString() : null,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export class IncomingInvoiceProviderConfigService {
  constructor(private readonly repository: IncomingInvoiceRepository) {}

  async listProviderConfigs(): Promise<AdminIncomingInvoiceProviderConfigItem[]> {
    const items = await this.repository.listProviderConfigs();
    return items.map(mapProviderConfig);
  }

  async resolveActiveProviderForWebhook(providerCode: string) {
    const config = await this.repository.findActiveProviderConfigByCode(providerCode);
    if (!config) {
      return null;
    }

    return {
      id: config.id,
      webhookSecret: documentProviderCryptoService.decrypt(config.webhookSecret),
    };
  }

  /**
   * IncomingInvoiceProviderConfig tenant-scoped (Faz 1 / Dalga 14); ayni
   * providerCode'u birden fazla tenant kendi hesabiyla baglayabilir. Webhook'ta
   * oturum olmadigindan (HMAC imza ile korunuyor) hangi tenant'a ait oldugu
   * URL'den degil, imzanin HANGI tenant'in webhookSecret'iyla eslestiginden
   * cikarilir -- her aktif tenant sirayla denenir, ilk eslesen kazanir.
   */
  async resolveTenantAndProviderForWebhook(providerCode: string, rawBody: string, signature: string | null) {
    const tenants = await platformService.listTenants();

    for (const tenant of tenants) {
      if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED") {
        continue;
      }

      const config = await runWithTenantContext({ tenantId: tenant.id, isPlatformOperator: false }, () =>
        this.resolveActiveProviderForWebhook(providerCode));

      if (config && verifyIncomingInvoiceWebhookSignature(rawBody, signature, config.webhookSecret)) {
        return { tenantId: tenant.id, config };
      }
    }

    return null;
  }

  async upsertProviderConfig(input: AdminUpsertIncomingInvoiceProviderConfigInput): Promise<AdminIncomingInvoiceProviderConfigItem> {
    const parsed = upsertSchema.parse(input);

    if (parsed.id) {
      const existing = await this.repository.findProviderConfigById(parsed.id);
      if (!existing) {
        throw new IncomingInvoiceProviderConfigError("Sağlayıcı yapılandırması bulunamadı.", 404);
      }
    }

    const item = await this.repository.upsertProviderConfig({
      ...parsed,
      secretKey: parsed.secretKey ? documentProviderCryptoService.encrypt(parsed.secretKey) : parsed.secretKey,
      webhookSecret: parsed.webhookSecret ? documentProviderCryptoService.encrypt(parsed.webhookSecret) : parsed.webhookSecret,
    });

    return mapProviderConfig(item);
  }
}

export const incomingInvoiceProviderConfigService = new IncomingInvoiceProviderConfigService(incomingInvoiceRepository);
