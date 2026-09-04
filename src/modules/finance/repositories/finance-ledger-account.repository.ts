import type { FinanceLedgerAccountCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

export class FinanceLedgerAccountRepository {
  async findByCode(code: string) {
    return prisma.financeLedgerAccount.findFirst({
      where: {
        code,
        isActive: true,
        deleted: false,
      },
    });
  }

  async listActive() {
    return prisma.financeLedgerAccount.findMany({
      where: { isActive: true, deleted: false },
      orderBy: { code: "asc" },
    });
  }

  async listAll() {
    return prisma.financeLedgerAccount.findMany({
      where: { deleted: false },
      orderBy: { code: "asc" },
    });
  }

  async createMany(rows: Array<{ code: string; name: string; category: FinanceLedgerAccountCategory }>) {
    const tenantId = requireTenantId();

    return prisma.financeLedgerAccount.createMany({
      data: rows.map((row) => ({
        tenantId,
        code: row.code,
        name: row.name,
        category: row.category,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  async softDelete(input: { id: string; deletedUserId: string }) {
    return prisma.financeLedgerAccount.update({
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
