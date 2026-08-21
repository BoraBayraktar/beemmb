import { hash } from "bcryptjs";
import { z } from "zod";

import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminUserListItem,
  AdminUserListQuery,
  AdminUserListResult,
} from "@/modules/identity/contracts/identity-admin.contract";
import { IdentityRepository } from "@/modules/identity/repositories/identity.repository";
import { rbacService } from "@/modules/identity/services/rbac.service";

const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(["ADMIN", "EDITOR", "CUSTOMER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2),
  role: z.enum(["ADMIN", "EDITOR", "CUSTOMER"]).default("EDITOR"),
  roleIds: z.array(z.string().trim().min(1)).optional(),
  password: z.string().min(6),
});

const updateUserSchema = z
  .object({
    id: z.string().trim().min(1),
    email: z.string().trim().email().optional(),
    name: z.string().trim().min(2).optional(),
    role: z.enum(["ADMIN", "EDITOR", "CUSTOMER"]).optional(),
    roleIds: z.array(z.string().trim().min(1)).optional(),
    password: z.string().min(6).optional(),
  })
  .refine((value) => value.email !== undefined || value.name !== undefined || value.role !== undefined || value.roleIds !== undefined || value.password !== undefined, {
    message: "At least one field must be provided",
  });

function mapAdminUser(user: {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR" | "CUSTOMER";
  createdAt: Date;
  roleAssignments?: Array<{ roleId: string; role: { name: string } }>;
}): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleIds: user.roleAssignments?.map((assignment) => assignment.roleId) ?? [],
    roleNames: user.roleAssignments?.map((assignment) => assignment.role.name) ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

export class IdentityAdminDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityAdminDeleteError";
  }
}

export class IdentityAdminService {
  constructor(private readonly repository: IdentityRepository) {}

  async listBackofficeUsers() {
    return this.repository.listUsersByRoles(["ADMIN", "EDITOR"]);
  }

  async listUsers(query: AdminUserListQuery): Promise<AdminUserListResult> {
    const parsed = listUsersQuerySchema.parse(query);
    // "Sistem Kullanıcıları" (system/staff users) is the default context: when no
    // explicit role filter is given, scope to ADMIN/EDITOR so CUSTOMER accounts never
    // leak into the staff user list. Callers that want customers pass role explicitly
    // (see the /admin/customers page, which always sends role: "CUSTOMER").
    const roleFilter = parsed.role ?? (["ADMIN", "EDITOR"] as Array<"ADMIN" | "EDITOR" | "CUSTOMER">);

    const [users, total] = await Promise.all([
      this.repository.listUsers({ ...parsed, role: roleFilter }),
      this.repository.countUsers({
        search: parsed.search,
        role: roleFilter,
      }),
    ]);

    return {
      items: users.map(mapAdminUser),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async createUser(input: AdminCreateUserInput, actorUserId?: string): Promise<AdminUserListItem> {
    const parsed = createUserSchema.parse(input);
    const passwordHash = await hash(parsed.password, 10);
    const created = await this.repository.createUser({
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      passwordHash,
    });

    if (parsed.roleIds && actorUserId) {
      await rbacService.assignRolesToUser({
        userId: created.id,
        roleIds: parsed.roleIds,
        actorUserId,
      });
    }

    return mapAdminUser(created);
  }

  async updateUser(input: AdminUpdateUserInput, actorUserId?: string): Promise<AdminUserListItem> {
    const parsed = updateUserSchema.parse(input);
    const passwordHash = parsed.password ? await hash(parsed.password, 10) : undefined;

    const updated = await this.repository.updateUser({
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      passwordHash,
    });

    if (parsed.roleIds && actorUserId) {
      await rbacService.assignRolesToUser({
        userId: parsed.id,
        roleIds: parsed.roleIds,
        actorUserId,
      });
    }

    return mapAdminUser(updated);
  }

  async softDeleteUser(userId: string, deletedUserId: string) {
    if (userId === deletedUserId) {
      throw new IdentityAdminDeleteError("You cannot delete your own account");
    }

    await this.repository.softDeleteUser(userId, deletedUserId);
  }
}

export const identityAdminService = new IdentityAdminService(new IdentityRepository());
