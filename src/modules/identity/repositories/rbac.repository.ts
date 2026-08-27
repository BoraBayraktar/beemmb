import { prisma } from "@/lib/prisma";

export class RbacRepository {
  async listPermissions() {
    return prisma.permission.findMany({
      where: { deleted: false },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
  }

  async listRoles(tenantId: string) {
    return prisma.role.findMany({
      where: { tenantId, deleted: false },
      include: {
        permissions: { include: { permission: true } },
        userAssignments: { select: { id: true } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async findRoleById(tenantId: string, id: string) {
    return prisma.role.findFirst({
      where: { id, tenantId, deleted: false },
      include: {
        permissions: { include: { permission: true } },
        userAssignments: { select: { userId: true } },
      },
    });
  }

  async findRoleByKey(tenantId: string, key: string) {
    return prisma.role.findFirst({
      where: { tenantId, key, deleted: false },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async countUsersWithRoleKey(tenantId: string, roleKey: string) {
    return prisma.userRoleAssignment.count({
      where: {
        tenantId,
        role: { tenantId, key: roleKey, deleted: false, isActive: true },
        user: { deleted: false },
      },
    });
  }

  async userHasRoleKey(tenantId: string, userId: string, roleKey: string) {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: {
        tenantId,
        userId,
        role: { tenantId, key: roleKey, deleted: false, isActive: true },
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  async getEffectiveRolesForUser(tenantId: string, userId: string) {
    return prisma.userRoleAssignment.findMany({
      where: {
        tenantId,
        userId,
        role: { tenantId, deleted: false, isActive: true },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async createRole(tenantId: string, input: { key: string; name: string; description?: string | null; permissionKeys: string[] }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          tenantId,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          isSystem: false,
          permissions: {
            create: input.permissionKeys.map((permissionKey) => ({
              tenant: { connect: { id: tenantId } },
              permission: { connect: { key: permissionKey } },
            })),
          },
        },
      });

      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: {
          permissions: { include: { permission: true } },
          userAssignments: { select: { id: true } },
        },
      });
    });
  }

  async updateRole(tenantId: string, input: { id: string; name: string; description?: string | null; isActive: boolean; permissionKeys: string[] }) {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: input.id, tenantId } });
      await tx.role.update({
        where: { id: input.id, tenantId },
        data: {
          name: input.name,
          description: input.description ?? null,
          isActive: input.isActive,
          permissions: {
            create: input.permissionKeys.map((permissionKey) => ({
              tenant: { connect: { id: tenantId } },
              permission: { connect: { key: permissionKey } },
            })),
          },
        },
      });

      return tx.role.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          permissions: { include: { permission: true } },
          userAssignments: { select: { id: true } },
        },
      });
    });
  }

  async assignRolesToUser(tenantId: string, input: { userId: string; roleIds: string[]; actorUserId: string }) {
    return prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.deleteMany({ where: { userId: input.userId, tenantId } });
      if (input.roleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: input.roleIds.map((roleId) => ({
            tenantId,
            userId: input.userId,
            roleId,
            assignedByUserId: input.actorUserId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  async softDeleteRole(tenantId: string, input: { id: string; deletedUserId: string }) {
    return prisma.role.update({
      where: { id: input.id, tenantId },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
        isActive: false,
      },
    });
  }

  async softDeletePermission(input: { id: string; deletedUserId: string }) {
    return prisma.permission.update({
      where: { id: input.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
      },
    });
  }
}
