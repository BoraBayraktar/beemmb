import { prisma } from "@/lib/prisma";

export class IdentityRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        passwordHash: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
      },
    });
  }

  async findByIdWithPassword(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });
  }

  async listUsersByRoles(roles: Array<"ADMIN" | "EDITOR" | "CUSTOMER">) {
    return prisma.user.findMany({
      where: {
        deleted: false,
        isSuperAdmin: false,
        role: {
          in: roles,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async listUsers(args: {
    search?: string;
    role?: "ADMIN" | "EDITOR" | "CUSTOMER";
    page: number;
    pageSize: number;
  }) {
    return prisma.user.findMany({
      where: {
        deleted: false,
        isSuperAdmin: false,
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: "insensitive" as const } },
                { email: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(args.role ? { role: args.role } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        roleAssignments: {
          where: { role: { deleted: false } },
          select: {
            roleId: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async countUsers(args: { search?: string; role?: "ADMIN" | "EDITOR" | "CUSTOMER" }) {
    return prisma.user.count({
      where: {
        deleted: false,
        isSuperAdmin: false,
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: "insensitive" as const } },
                { email: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(args.role ? { role: args.role } : {}),
      },
    });
  }

  async createUser(input: {
    email: string;
    name: string;
    role: "ADMIN" | "EDITOR" | "CUSTOMER";
    passwordHash: string;
  }) {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: input.passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        roleAssignments: {
          where: { role: { deleted: false } },
          select: {
            roleId: true,
            role: { select: { name: true } },
          },
        },
      },
    });
  }

  async updateUser(input: {
    id: string;
    email?: string;
    name?: string;
    role?: "ADMIN" | "EDITOR" | "CUSTOMER";
    passwordHash?: string;
  }) {
    return prisma.user.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        roleAssignments: {
          where: { role: { deleted: false } },
          select: {
            roleId: true,
            role: { select: { name: true } },
          },
        },
      },
    });
  }

  async softDeleteUser(id: string, deletedUserId: string) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async createCustomer(input: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: "CUSTOMER",
        passwordHash: input.passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
      },
    });
  }

  async updatePasswordById(id: string, passwordHash: string) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        passwordHash,
      },
      select: {
        id: true,
      },
    });
  }

  async findSocialAccount(provider: string, providerAccountId: string) {
    return prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isSuperAdmin: true,
          },
        },
      },
    });
  }

  async createCustomerWithSocialAccount(input: {
    email: string;
    name: string;
    passwordHash: string;
    provider: string;
    providerAccountId: string;
    providerEmail?: string | null;
  }) {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: "CUSTOMER",
        passwordHash: input.passwordHash,
        socialAccounts: {
          create: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
            providerEmail: input.providerEmail ?? null,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
      },
    });
  }

  async attachSocialAccountToUser(input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    providerEmail?: string | null;
  }) {
    return prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
      update: {
        providerEmail: input.providerEmail ?? null,
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        providerEmail: input.providerEmail ?? null,
      },
      select: {
        id: true,
      },
    });
  }
}
