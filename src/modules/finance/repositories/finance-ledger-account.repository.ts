import { prisma } from "@/lib/prisma";

export class FinanceLedgerAccountRepository {
  async findByCode(code: string) {
    return (prisma as any).financeLedgerAccount.findFirst({
      where: {
        code,
        isActive: true,
        deleted: false,
      },
    });
  }

  async listActive() {
    return (prisma as any).financeLedgerAccount.findMany({
      where: { isActive: true, deleted: false },
      orderBy: { code: "asc" },
    });
  }

  async softDelete(input: { id: string; deletedUserId: string }) {
    return (prisma as any).financeLedgerAccount.update({
      where: { id: input.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
        isActive: false,
      },
    });
  }
}

export const financeLedgerAccountRepository = new FinanceLedgerAccountRepository();
