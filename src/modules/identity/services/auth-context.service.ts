import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { enterTenantContext } from "@/lib/tenant-context";
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
  const user = await identityService.getAuthenticatedUser(token);

  if (user) {
    enterTenantContext({ tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin });
  }

  return user;
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

export async function requireUserRoles(roles: UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  if (!user.isSuperAdmin && !roles.includes(user.role)) {
    throw new AuthContextError(403, "Forbidden");
  }

  return user;
}

export async function requirePermission(permissionKey: PermissionKey): Promise<AuthUser> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  const allowed = await rbacService.hasPermission(user, permissionKey);
  if (!allowed) {
    throw new AuthContextError(403, "Forbidden");
  }

  return user;
}

export async function requireAnyPermission(permissionKeys: PermissionKey[]): Promise<AuthUser> {
  const user = await getCurrentUserFromContext();

  if (!user) {
    throw new AuthContextError(401, "Unauthorized");
  }

  const effective = await rbacService.getEffectivePermissions(user);
  if (!permissionKeys.some((permissionKey) => effective.permissionKeys.includes(permissionKey))) {
    throw new AuthContextError(403, "Forbidden");
  }

  return user;
}
