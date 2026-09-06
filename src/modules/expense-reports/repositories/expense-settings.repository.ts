import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

const DEFAULT_CATEGORIES = [
  { slug: "yemek", name: "Yemek", sortOrder: 1 },
  { slug: "ulasim", name: "Ulaşım", sortOrder: 2 },
  { slug: "konaklama", name: "Konaklama", sortOrder: 3 },
  { slug: "ofis-malzemesi", name: "Ofis Malzemesi", sortOrder: 4 },
  { slug: "diger", name: "Diğer", sortOrder: 5 },
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export class ExpenseCategoryRepository {
  async listActive() {
    await this.ensureDefaultSeed();

    return prisma.expenseCategory.findMany({
      where: { deleted: false, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async listAll() {
    await this.ensureDefaultSeed();

    return prisma.expenseCategory.findMany({
      where: { deleted: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.expenseCategory.findFirst({ where: { id, deleted: false } });
  }

  private async ensureDefaultSeed() {
    const tenantId = requireTenantId();
    const count = await prisma.expenseCategory.count({ where: { deleted: false } });
    if (count > 0) {
      return;
    }

    await prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, tenantId })),
      skipDuplicates: true,
    });
  }

  async create(args: { name: string; isActive: boolean; sortOrder: number }) {
    const tenantId = requireTenantId();

    return prisma.expenseCategory.create({
      data: {
        tenantId,
        slug: toSlug(args.name),
        name: args.name,
        isActive: args.isActive,
        sortOrder: args.sortOrder,
      },
    });
  }

  async update(args: { id: string; name?: string; isActive?: boolean; sortOrder?: number }) {
    return prisma.expenseCategory.update({
      where: { id: args.id },
      data: {
        ...(args.name !== undefined ? { name: args.name, slug: toSlug(args.name) } : {}),
        ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
      },
    });
  }
}

const chainStepInclude = {
  approver: { select: { id: true, name: true, email: true } },
} as const;

export class ExpenseApprovalChainRepository {
  async list() {
    return prisma.expenseApprovalChainStep.findMany({
      orderBy: { stepOrder: "asc" },
      include: chainStepInclude,
    });
  }

  async replace(steps: Array<{ stepOrder: number; approverUserId: string; notifyEmail: string | null; description: string | null }>) {
    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      await tx.expenseApprovalChainStep.deleteMany({ where: { tenantId } });

      if (steps.length > 0) {
        await tx.expenseApprovalChainStep.createMany({
          data: steps.map((step) => ({
            tenantId,
            stepOrder: step.stepOrder,
            approverUserId: step.approverUserId,
            notifyEmail: step.notifyEmail,
            description: step.description,
          })),
        });
      }

      return tx.expenseApprovalChainStep.findMany({
        orderBy: { stepOrder: "asc" },
        include: chainStepInclude,
      });
    });
  }
}

export const expenseCategoryRepository = new ExpenseCategoryRepository();
export const expenseApprovalChainRepository = new ExpenseApprovalChainRepository();
