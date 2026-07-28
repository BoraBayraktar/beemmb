import { prisma } from "@/lib/prisma";

export class FinanceLedgerAccountRepository {
  async findByCode(code: string) {
    return (prisma as any).financeLedgerAccount.findFirst({
      where: {
        code,
        isActive: true,
      },
    });
  }

  async listActive() {
    return (prisma as any).financeLedgerAccount.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
  }
}

export const financeLedgerAccountRepository = new FinanceLedgerAccountRepository();
