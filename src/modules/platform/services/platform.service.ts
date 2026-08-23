import { redisCache } from "@/lib/redis";
import { buildTenantCacheKey } from "@/lib/cache-key";
import type { CreateTenantInput, SetTenantModuleEntitlementInput, UpdateTenantInput } from "@/modules/platform/contracts/platform.contract";
import { PlatformRepository } from "@/modules/platform/repositories/platform.repository";

const ENTITLEMENT_CACHE_TTL_SECONDS = 300;

export class PlatformService {
  constructor(private readonly repository: PlatformRepository) {}

  async listTenants() {
    return this.repository.listTenants();
  }

  async getTenant(id: string) {
    return this.repository.findTenantById(id);
  }

  async createTenant(input: CreateTenantInput) {
    const existing = await this.repository.findTenantBySlug(input.slug);
    if (existing) {
      throw new Error("TENANT_SLUG_ALREADY_EXISTS");
    }

    return this.repository.createTenant(input);
  }

  async updateTenant(input: UpdateTenantInput) {
    return this.repository.updateTenant(input);
  }

  async listModuleCatalog() {
    return this.repository.listModuleCatalog();
  }

  async listEntitlements(tenantId: string) {
    return this.repository.listEntitlementsForTenant(tenantId);
  }

  async setEntitlement(input: SetTenantModuleEntitlementInput) {
    const result = await this.repository.setEntitlement(input);
    await redisCache.del(buildTenantCacheKey(input.tenantId, "platform", "entitlements"));
    return result;
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
}

export const platformService = new PlatformService(new PlatformRepository());
