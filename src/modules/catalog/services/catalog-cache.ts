import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";

/**
 * Bu cache namespace'i tek bir tenant'a (PLATFORM_TENANT_ID) aittir: mağaza
 * (catalog.service.ts) her zaman yalnızca BEEMMB'nin kendi platform tenant'ının
 * ürünlerini listeler (bkz. catalog.service.ts'deki runWithTenantContext
 * çağrıları). Bu yüzden invalidation da requireTenantId() (mutasyonu yapan
 * tenant) DEĞİL, sabit PLATFORM_TENANT_ID ile scoped olmak zorundadır --
 * aksi halde bir tenant'ın admin işlemi kendi (hiç okunmayan) cache anahtarını
 * temizler, mağazanın gerçek cache'i temizlenmeden bayat kalır.
 */
function catalogListCachePrefix() {
  return buildTenantCacheKey(PLATFORM_TENANT_ID, "catalog", "list");
}

export function buildCatalogListCacheKey(parts: Array<string | number>) {
  return buildTenantCacheKey(PLATFORM_TENANT_ID, "catalog", "list", ...parts);
}

function catalogDetailCachePrefix() {
  return buildTenantCacheKey(PLATFORM_TENANT_ID, "catalog", "detail");
}

export function buildCatalogDetailCacheKey(slug: string) {
  return buildTenantCacheKey(PLATFORM_TENANT_ID, "catalog", "detail", slug);
}

export function buildCatalogCategoriesCacheKey() {
  return buildTenantCacheKey(PLATFORM_TENANT_ID, "catalog", "categories");
}

export async function invalidateCatalogCache() {
  await Promise.all([
    redisCache.delByPrefix(catalogListCachePrefix()),
    redisCache.delByPrefix(catalogDetailCachePrefix()),
    redisCache.del(buildCatalogCategoriesCacheKey()),
  ]);
}

export async function invalidateProductDetailCache(slug: string) {
  await redisCache.del(buildCatalogDetailCacheKey(slug));
}
