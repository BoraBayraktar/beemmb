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

export class ExpenseApproverSettingRepository {
  async get() {
    return prisma.expenseApproverSetting.findFirst({
      include: { approver: { select: { id: true, name: true, email: true } } },
    });
  }

  async upsert(args: { approverUserId: string; notifyEmail: string | null }) {
    const tenantId = requireTenantId();

    return prisma.expenseApproverSetting.upsert({
      where: { tenantId },
      update: { approverUserId: args.approverUserId, notifyEmail: args.notifyEmail },
      create: { tenantId, approverUserId: args.approverUserId, notifyEmail: args.notifyEmail },
      include: { approver: { select: { id: true, name: true, email: true } } },
    });
  }
}

export const expenseCategoryRepository = new ExpenseCategoryRepository();
export const expenseApproverSettingRepository = new ExpenseApproverSettingRepository();
