import { z } from "zod";

import { ALL_PERMISSION_KEYS, type EffectiveRbac, type PermissionKey, type RbacRoleSummary } from "@/modules/identity/contracts/rbac.contract";
import { RbacRepository } from "@/modules/identity/repositories/rbac.repository";

const roleInputSchema = z.object({
  key: z.string().trim().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
  permissionKeys: z.array(z.enum(ALL_PERMISSION_KEYS as [PermissionKey, ...PermissionKey[]])).min(1),
});

const assignRolesSchema = z.object({
  userId: z.string().trim().min(1),
  roleIds: z.array(z.string().trim().min(1)),
  actorUserId: z.string().trim().min(1),
});

export class RbacPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RbacPolicyError";
  }
}

function mapRole(role: Awaited<ReturnType<RbacRepository["listRoles"]>>[number]): RbacRoleSummary {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    permissionKeys: role.permissions.map((item) => item.permission.key).sort(),
    userCount: role.userAssignments.length,
  };
}

function getLegacyEffectivePermissions(user: { role: "ADMIN" | "EDITOR" | "CUSTOMER" }): EffectiveRbac {
  if (user.role === "ADMIN") {
    return { roleKeys: ["legacy-admin"], roleNames: ["Yönetici"], permissionKeys: [...ALL_PERMISSION_KEYS] };
  }

  if (user.role === "EDITOR") {
    return {
      roleKeys: ["legacy-editor"],
      roleNames: ["Editör"],
      permissionKeys: ["admin.access", "products.read", "products.manage", "orders.read", "orders.manage", "inventory.read", "inventory.manage", "documents.read", "documents.manage", "incomingInvoices.read", "incomingInvoices.manage", "integrations.read"],
    };
  }

  return { roleKeys: [], roleNames: [], permissionKeys: [] };
}

export class RbacService {
  constructor(private readonly repository: RbacRepository) {}

  async listPermissions() {
    return this.repository.listPermissions();
  }

  async listRoles() {
    const roles = await this.repository.listRoles();
    return roles.map(mapRole);
  }

  async getEffectivePermissions(user: { id: string; role: "ADMIN" | "EDITOR" | "CUSTOMER" }): Promise<EffectiveRbac> {
    let assignments: Awaited<ReturnType<RbacRepository["getEffectiveRolesForUser"]>>;
    try {
      assignments = await this.repository.getEffectiveRolesForUser(user.id);
    } catch (error) {
      console.error("RBAC etkin yetki okuması başarısız oldu, legacy rol yetkileri kullanılacak.", error);
      return getLegacyEffectivePermissions(user);
    }

    const permissionKeys = new Set<PermissionKey>();
    const roleKeys: string[] = [];
    const roleNames: string[] = [];

    for (const assignment of assignments) {
      roleKeys.push(assignment.role.key);
      roleNames.push(assignment.role.name);
      for (const rolePermission of assignment.role.permissions) {
        if (ALL_PERMISSION_KEYS.includes(rolePermission.permission.key as PermissionKey)) {
          permissionKeys.add(rolePermission.permission.key as PermissionKey);
        }
      }
    }

    if (permissionKeys.size === 0) {
      return getLegacyEffectivePermissions(user);
    }

    return {
      roleKeys,
      roleNames,
      permissionKeys: [...permissionKeys].sort(),
    };
  }

  async hasPermission(user: { id: string; role: "ADMIN" | "EDITOR" | "CUSTOMER" }, permissionKey: PermissionKey) {
    const effective = await this.getEffectivePermissions(user);
    return effective.permissionKeys.includes(permissionKey);
  }

  async createRole(input: unknown) {
    const parsed = roleInputSchema.parse(input);
    const role = await this.repository.createRole(parsed);
    return mapRole(role);
  }

  async updateRole(id: string, input: unknown) {
    const existing = await this.repository.findRoleById(id);
    if (!existing) {
      throw new RbacPolicyError("Rol bulunamadı");
    }

    const parsed = roleInputSchema.omit({ key: true }).parse(input);
    if (existing.key === "super-admin") {
      const missingPermissions = ALL_PERMISSION_KEYS.filter((permissionKey) => !parsed.permissionKeys.includes(permissionKey));
      if (!parsed.isActive || missingPermissions.length > 0) {
        throw new RbacPolicyError("Süper Yönetici rolü pasifleştirilemez veya yetkileri daraltılamaz");
      }
    }

    const role = await this.repository.updateRole({ id, ...parsed });
    return mapRole(role);
  }

  async assignRolesToUser(input: unknown) {
    const parsed = assignRolesSchema.parse(input);
    if (parsed.roleIds.length === 0) {
      throw new RbacPolicyError("En az bir rol seçilmelidir");
    }

    const superAdminRole = await this.repository.findRoleByKey("super-admin");
    const removesSuperAdmin = superAdminRole
      ? await this.repository.userHasRoleKey(parsed.userId, "super-admin")
        && !parsed.roleIds.includes(superAdminRole.id)
      : false;

    if (removesSuperAdmin) {
      if (parsed.userId === parsed.actorUserId) {
        throw new RbacPolicyError("Kendi Süper Yönetici yetkinizi kaldıramazsınız");
      }

      const superAdminCount = await this.repository.countUsersWithRoleKey("super-admin");
      if (superAdminCount <= 1) {
        throw new RbacPolicyError("Son Süper Yönetici yetkisi kaldırılamaz");
      }
    }

    await this.repository.assignRolesToUser(parsed);
  }

  async deleteRole(id: string, deletedUserId: string) {
    const role = await this.repository.findRoleById(id);
    if (!role) {
      throw new RbacPolicyError("Rol bulunamadı");
    }

    if (role.isSystem) {
      throw new RbacPolicyError("Sistem rolleri silinemez");
    }

    if (role.userAssignments.length > 0) {
      throw new RbacPolicyError("Kullanıcıya atanmış rol silinemez");
    }

    await this.repository.softDeleteRole({ id, deletedUserId });
  }
}

export const rbacService = new RbacService(new RbacRepository());
