import { hash } from "bcryptjs";
import { z } from "zod";

import { redisCache } from "@/lib/redis";
import { buildTenantCacheKey } from "@/lib/cache-key";
import { runWithTenantContext } from "@/lib/tenant-context";
import { IdentityRepository } from "@/modules/identity/repositories/identity.repository";
import { PlatformRepository } from "@/modules/platform/repositories/platform.repository";

const ENTITLEMENT_CACHE_TTL_SECONDS = 300;

const TENANT_SLUG_REGEX = /^[a-z0-9-]+$/;
const TENANT_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"] as const;

const createTenantSchema = z.object({
  slug: z.string().trim().toLowerCase().min(2).max(63).regex(TENANT_SLUG_REGEX),
  name: z.string().trim().min(2),
  legalName: z.string().trim().min(2).optional(),
  taxNumber: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().optional(),
});

const updateTenantSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).optional(),
  legalName: z.string().trim().min(2).optional(),
  taxNumber: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().optional(),
  status: z.enum(TENANT_STATUSES).optional(),
});

const setEntitlementSchema = z.object({
  tenantId: z.string().trim().min(1),
  moduleKey: z.string().trim().min(1),
  isEnabled: z.boolean(),
  grantedByUserId: z.string().trim().min(1).optional(),
  note: z.string().trim().optional(),
});

const provisionTenantSchema = z.object({
  slug: z.string().trim().toLowerCase().min(2).max(63).regex(TENANT_SLUG_REGEX),
  name: z.string().trim().min(2),
  legalName: z.string().trim().min(2).optional(),
  taxNumber: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().optional(),
  moduleKeys: z.array(z.string().trim().min(1)).default([]),
  adminUser: z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2),
    password: z.string().min(6),
  }),
});

export class PlatformPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformPolicyError";
  }
}

export class PlatformService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly identityRepository: IdentityRepository,
  ) {}

  async listTenants() {
    return this.repository.listTenants();
  }

  async getTenant(id: string) {
    return this.repository.findTenantById(id);
  }

  async createTenant(input: unknown) {
    const parsed = createTenantSchema.parse(input);
    const existing = await this.repository.findTenantBySlug(parsed.slug);
    if (existing) {
      throw new PlatformPolicyError(`"${parsed.slug}" tenant kodu zaten kullanılıyor. Lütfen farklı bir kod seçin.`);
    }

    return this.repository.createTenant(parsed);
  }

  async updateTenant(input: unknown) {
    const parsed = updateTenantSchema.parse(input);
    return this.repository.updateTenant(parsed);
  }

  async listModuleCatalog() {
    return this.repository.listModuleCatalog();
  }

  async listEntitlements(tenantId: string) {
    return this.repository.listEntitlementsForTenant(tenantId);
  }

  async setEntitlement(input: unknown) {
    const parsed = setEntitlementSchema.parse(input);
    const result = await this.repository.setEntitlement(parsed);
    await redisCache.del(buildTenantCacheKey(parsed.tenantId, "platform", "entitlements"));
    return result;
  }

  /**
   * Yeni bir tenant'i, secilen modullerin entitlement'lariyla, RBAC_SYSTEM_ROLES'ten
   * klonlanan varsayilan rol setiyle ve tenant'in ilk (super-admin) kullanicisiyla
   * birlikte tek seferde kurar. Slug ve admin e-posta benzersizligi transaction
   * baslamadan once kontrol edilir (email global @unique -- ayni domain'den tek
   * giris akisi geregi tenant'lar arasinda da benzersiz olmali).
   */
  async provisionTenant(input: unknown, actorUserId: string) {
    const parsed = provisionTenantSchema.parse(input);

    const existingSlug = await this.repository.findTenantBySlug(parsed.slug);
    if (existingSlug) {
      throw new PlatformPolicyError(`"${parsed.slug}" tenant kodu zaten kullanılıyor. Lütfen farklı bir kod seçin.`);
    }

    const existingEmail = await this.identityRepository.findByEmail(parsed.adminUser.email);
    if (existingEmail) {
      throw new PlatformPolicyError(`"${parsed.adminUser.email}" e-posta adresi zaten bir kullanıcıya ait. Lütfen farklı bir e-posta girin.`);
    }

    const passwordHash = await hash(parsed.adminUser.password, 10);

    return this.repository.provisionTenant({
      slug: parsed.slug,
      name: parsed.name,
      legalName: parsed.legalName,
      taxNumber: parsed.taxNumber,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
      moduleKeys: parsed.moduleKeys,
      adminUser: { email: parsed.adminUser.email, name: parsed.adminUser.name, passwordHash },
      actorUserId,
    });
  }

  /** Menu cift-kontrolunde (Faz 3) kullanilacak: tenant'in acik oldugu modul anahtarlari. */
  async getEnabledModuleKeys(tenantId: string): Promise<Set<string>> {
    const cacheKey = buildTenantCacheKey(tenantId, "platform", "entitlements");
    const cached = await redisCache.get<string[]>(cacheKey);
    if (cached) {
      return new Set(cached);
    }

    const entitlements = await this.repository.listEntitlementsForTenant(tenantId);
    const enabledKeys = entitlements.filter((entitlement) => entitlement.isEnabled).map((entitlement) => entitlement.moduleKey);

    await redisCache.set(cacheKey, enabledKeys, ENTITLEMENT_CACHE_TTL_SECONDS);
    return new Set(enabledKeys);
  }

  /**
   * Sistem cron/job endpoint'leri (oturumsuz, paylasilan secret ile korunur)
   * icin: her aktif (ACTIVE/TRIAL) tenant sirayla kendi runWithTenantContext'i
   * icinde `fn` ile calistirilir. Bir tenant hata verirse digerlerini
   * engellemez -- hata sonuc listesinde tenant'a karsi toplanir. Elle
   * provizyon modelinde (DEVELOPMENT_RULES.md madde 7) kucuk/orta tenant
   * sayisi icin bu O(n) tarama kabul edilebilir bir maliyettir.
   */
  async runForEachActiveTenant<T>(fn: () => Promise<T>): Promise<Array<{ tenantId: string; result: T } | { tenantId: string; error: string }>> {
    const tenants = await this.repository.listTenants();
    const outcomes: Array<{ tenantId: string; result: T } | { tenantId: string; error: string }> = [];

    for (const tenant of tenants) {
      if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED") {
        continue;
      }

      try {
        const result = await runWithTenantContext({ tenantId: tenant.id, isPlatformOperator: true }, fn);
        outcomes.push({ tenantId: tenant.id, result });
      } catch (error) {
        outcomes.push({ tenantId: tenant.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return outcomes;
  }
}

export const platformService = new PlatformService(new PlatformRepository(), new IdentityRepository());
