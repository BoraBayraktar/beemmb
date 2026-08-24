import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContext = {
  tenantId: string;
  isPlatformOperator: boolean;
};

/**
 * Next.js App Router ayni dosyayi "react-server" (RSC) ve "node" (route handler)
 * kosullari icin ayri ayri paketleyebiliyor; globalThis uzerinde tek ornek
 * tutmak (src/lib/prisma.ts'teki global.prismaClient deseniyle ayni) bu
 * kosullar arasinda tek bir AsyncLocalStorage paylasilmasini saglar.
 *
 * KRITIK: enterWith(...) BU ORTAMDA (Next.js 16 + Turbopack) fonksiyon
 * sinirlarini guvenilir sekilde asamiyor -- bir async fonksiyon icinde
 * enterWith cagirip return ettiginizde, cagiran taraf context'i GORMUYOR
 * (izole testlerle hem dev hem production build'de kanitlandi). Bunun
 * yerine run(context, callback) kullanilir: context, SADECE callback'in
 * calisma suresi ve onun cagirdigi her sey icin garanti altindadir.
 */
declare global {
  var tenantContextStorage: AsyncLocalStorage<TenantContext> | undefined;
}

function resolveTenantContextStorage(): AsyncLocalStorage<TenantContext> {
  if (!global.tenantContextStorage) {
    global.tenantContextStorage = new AsyncLocalStorage<TenantContext>();
  }

  return global.tenantContextStorage;
}

/**
 * Tenant-scoped Prisma erisimi gerektiren TUM isin bu callback icinde
 * calismasi gerekir -- callback donduginde context artik gecerli degildir.
 */
export function runWithTenantContext<T>(context: TenantContext, fn: () => Promise<T>): Promise<T> {
  return resolveTenantContextStorage().run(context, fn);
}

export function getTenantContext(): TenantContext | null {
  return resolveTenantContextStorage().getStore() ?? null;
}

/** Composite-unique (tenantId_x) where/create nesneleri kurarken kullanilir -- context yoksa fail-closed hata firlatir. */
export function requireTenantId(): string {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new Error("Tenant context bulunamadi -- bu islem runWithTenantContext(...) callback'i disinda calistirilamaz.");
  }

  return ctx.tenantId;
}
