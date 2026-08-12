import { prisma } from "@/lib/prisma";

export class RbacRepository {
  async listPermissions() {
    return prisma.permission.findMany({
      where: { deleted: false },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
  }

  async listRoles() {
    return prisma.role.findMany({
      where: { deleted: false },
      include: {
        permissions: { include: { permission: true } },
        userAssignments: { select: { id: true } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async findRoleById(id: string) {
    return prisma.role.findFirst({
      where: { id, deleted: false },
      include: {
        permissions: { include: { permission: true } },
        userAssignments: { select: { userId: true } },
      },
    });
  }

  async findRoleByKey(key: string) {
    return prisma.role.findFirst({
      where: { key, deleted: false },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async countUsersWithRoleKey(roleKey: string) {
    return prisma.userRoleAssignment.count({
      where: {
        role: { key: roleKey, deleted: false, isActive: true },
        user: { deleted: false },
      },
    });
  }

  async userHasRoleKey(userId: string, roleKey: string) {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        role: { key: roleKey, deleted: false, isActive: true },
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  async getEffectiveRolesForUser(userId: string) {
    return prisma.userRoleAssignment.findMany({
      where: {
        userId,
        role: { deleted: false, isActive: true },
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

  async createRole(input: { key: string; name: string; description?: string | null; permissionKeys: string[] }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          isSystem: false,
          permissions: {
            create: input.permissionKeys.map((permissionKey) => ({
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

  async updateRole(input: { id: string; name: string; description?: string | null; isActive: boolean; permissionKeys: string[] }) {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: input.id } });
      await tx.role.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description ?? null,
          isActive: input.isActive,
          permissions: {
            create: input.permissionKeys.map((permissionKey) => ({
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

  async assignRolesToUser(input: { userId: string; roleIds: string[]; actorUserId: string }) {
    return prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.deleteMany({ where: { userId: input.userId } });
      if (input.roleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
            assignedByUserId: input.actorUserId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  async softDeleteRole(input: { id: string; deletedUserId: string }) {
    return prisma.role.update({
      where: { id: input.id },
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
