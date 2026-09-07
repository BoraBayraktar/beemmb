import { prisma } from "@/lib/prisma";

const summaryInclude = {
  grantor: { select: { id: true, name: true } },
  grantee: { select: { id: true, name: true } },
};

export class DelegationRepository {
  async create(input: {
    tenantId: string;
    grantorUserId: string;
    granteeUserId: string;
    startAt: Date;
    endAt: Date;
  }) {
    return prisma.delegation.create({
      data: {
        tenantId: input.tenantId,
        grantorUserId: input.grantorUserId,
        granteeUserId: input.granteeUserId,
        startAt: input.startAt,
        endAt: input.endAt,
      },
      include: summaryInclude,
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.delegation.findFirst({
      where: { id, tenantId },
      include: summaryInclude,
    });
  }

  async revoke(tenantId: string, id: string, revokedByUserId: string) {
    return prisma.delegation.updateMany({
      where: { id, tenantId, revokedAt: null },
      data: { revokedAt: new Date(), revokedByUserId },
    });
  }

  async listByGrantor(tenantId: string, grantorUserId: string) {
    return prisma.delegation.findMany({
      where: { tenantId, grantorUserId },
      orderBy: { createdAt: "desc" },
      include: summaryInclude,
    });
  }

  async listByGrantee(tenantId: string, granteeUserId: string) {
    return prisma.delegation.findMany({
      where: { tenantId, granteeUserId },
      orderBy: { createdAt: "desc" },
      include: summaryInclude,
    });
  }

  async listOverlapping(tenantId: string, grantorUserId: string, granteeUserId: string, startAt: Date, endAt: Date) {
    return prisma.delegation.findMany({
      where: {
        tenantId,
        grantorUserId,
        granteeUserId,
        revokedAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
  }

  async findUserInTenant(tenantId: string, userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, tenantId, deleted: false },
      select: { id: true, name: true, email: true },
    });
  }

  async getActiveGrantorsFor(tenantId: string, granteeUserId: string, at: Date) {
    const rows = await prisma.delegation.findMany({
      where: {
        tenantId,
        granteeUserId,
        revokedAt: null,
        startAt: { lte: at },
        endAt: { gte: at },
      },
      select: { grantorUserId: true },
    });

    return rows.map((row) => row.grantorUserId);
  }
}
