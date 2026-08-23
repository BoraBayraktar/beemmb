/**
 * Tenant-scoped Redis cache key'leri bu fonksiyon uzerinden uretilir.
 * Ham string concat ile tenant-scoped cache key yazmak DEVELOPMENT_RULES.md
 * madde 7 geregi yasaktir -- aksi halde farkli tenant'lar ayni key'i paylasip
 * veri sizintisina yol acabilir.
 */
export function buildTenantCacheKey(tenantId: string, ...segments: Array<string | number>): string {
  return ["t", tenantId, ...segments].join(":");
}
