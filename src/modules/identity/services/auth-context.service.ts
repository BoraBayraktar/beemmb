import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { runWithTenantContext } from "@/lib/tenant-context";
import type { AuthUser, UserRole } from "@/modules/identity/contracts/identity.contract";
import type { PermissionKey } from "@/modules/identity/contracts/rbac.contract";
import { identityService } from "@/modules/identity/services/identity.service";
import { rbacService } from "@/modules/identity/services/rbac.service";

export class AuthContextError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthContextError";
  }
}

export async function getCurrentUserFromContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  return identityService.getAuthenticatedUser(token);
}

/**
 * Tenant-scoped Prisma erisimi gerektiren TUM route/sayfa govdeleri `handler`
 * parametresi ile cagrilmalidir -- yalnizca bu callback icinde calisan kod
 * (ve onun cagirdigi her sey) tenant context'i gorur (bkz. tenant-context.ts).
 * `handler` verilmezse eski davranis korunur (sadece user dondurulur, tenant
 * context KURULMAZ) -- bu, henuz hicbir tenant-scoped modele dokunmayan
 * cagiran noktalar icin guvenlidir.
 */
export async function requirePermission(permissionKey: PermissionKey): Promise<AuthUser>;
export async function requirePermission<T>(permissionKey: PermissionKey, handler: (user: AuthUser) => Promise<T>): Promise<T>;
export async function requirePermission<T>(
  permissionKey: PermissionKey,
  handler?: (user: AuthUser) => Promise<T>,
): Promise<AuthUser | T> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  const allowed = await rbacService.hasPermission(user, permissionKey);
  if (!allowed) {
    throw new AuthContextError(403, "Forbidden");
  }

  if (!handler) {
    return user;
  }

  return runWithTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }, () => handler(user));
}

export async function requireAnyPermission(permissionKeys: PermissionKey[]): Promise<AuthUser>;
export async function requireAnyPermission<T>(permissionKeys: PermissionKey[], handler: (user: AuthUser) => Promise<T>): Promise<T>;
export async function requireAnyPermission<T>(
  permissionKeys: PermissionKey[],
  handler?: (user: AuthUser) => Promise<T>,
): Promise<AuthUser | T> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  const effective = await rbacService.getEffectivePermissions(user);
  if (!permissionKeys.some((permissionKey) => effective.permissionKeys.includes(permissionKey))) {
    throw new AuthContextError(403, "Forbidden");
  }

  if (!handler) {
    return user;
  }

  return runWithTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }, () => handler(user));
}

export async function requireUserRoles(roles: UserRole[]): Promise<AuthUser>;
export async function requireUserRoles<T>(roles: UserRole[], handler: (user: AuthUser) => Promise<T>): Promise<T>;
export async function requireUserRoles<T>(
  roles: UserRole[],
  handler?: (user: AuthUser) => Promise<T>,
): Promise<AuthUser | T> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  if (!user.isSuperAdmin && !roles.includes(user.role)) {
    throw new AuthContextError(403, "Forbidden");
  }

  if (!handler) {
    return user;
  }

  return runWithTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }, () => handler(user));
}

/** Platformun kendi ekibi (Beemmb) icin -- tenant/entitlement yonetimi gibi platform-geneli islemler. */
export async function requirePlatformOperator(): Promise<AuthUser> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  if (!user.isSuperAdmin) {
    throw new AuthContextError(403, "Forbidden");
  }

  return user;
}

export function getCurrentTenantId(user: Pick<AuthUser, "tenantId">): string {
  return user.tenantId;
}
