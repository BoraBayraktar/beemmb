import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContext = {
  tenantId: string;
  isPlatformOperator: boolean;
};

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Request'in geri kalan async zincirinde tenant context'ini gorunur kilar.
 * getCurrentUserFromContext() tarafindan, kullanici cozuldukten hemen sonra cagrilir.
 */
export function enterTenantContext(context: TenantContext): void {
  tenantContextStorage.enterWith(context);
}

export function getTenantContext(): TenantContext | null {
  return tenantContextStorage.getStore() ?? null;
}
