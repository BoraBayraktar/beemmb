import { z } from "zod";

import type {
  AdminBackofficeUserOption,
  AdminExpenseApprovalChainStepItem,
  AdminExpenseCategoryItem,
  AdminUpsertExpenseApprovalChainInput,
  AdminUpsertExpenseCategoryInput,
} from "@/modules/expense-reports/contracts/expense-settings.contract";
import {
  ExpenseApprovalChainRepository,
  ExpenseCategoryRepository,
  expenseApprovalChainRepository,
  expenseCategoryRepository,
} from "@/modules/expense-reports/repositories/expense-settings.repository";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { requireTenantId } from "@/lib/tenant-context";
import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";

const upsertCategorySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const chainStepSchema = z
  .object({
    stepOrder: z.coerce.number().int().min(1),
    approverUserId: z.string().trim().min(1),
    notifyEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
    description: z.string().trim().max(200).optional().nullable().or(z.literal("")).transform((value) => value || null),
    canApprove: z.boolean().default(true),
    canReject: z.boolean().default(true),
    canReturn: z.boolean().default(true),
  })
  .refine((step) => step.canApprove || step.canReject || step.canReturn, {
    message: "Her onaycı için en az bir işlem yetkisi (Onayla/Reddet/Geri Gönder) seçilmelidir.",
  });

const upsertChainSchema = z.object({
  steps: z.array(chainStepSchema).min(1, "En az bir onaycı tanımlamalısınız.").max(10, "En fazla 10 onaycı tanımlanabilir."),
});

export class ExpenseSettingsAdminError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ExpenseSettingsAdminError";
  }
}

function mapCategory(item: { id: string; slug: string; name: string; isActive: boolean; sortOrder: number }): AdminExpenseCategoryItem {
  return { id: item.id, slug: item.slug, name: item.name, isActive: item.isActive, sortOrder: item.sortOrder };
}

function mapChainStep(row: {
  id: string;
  stepOrder: number;
  approverUserId: string;
  notifyEmail: string | null;
  description: string | null;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  approver: { name: string; email: string };
}): AdminExpenseApprovalChainStepItem {
  return {
    id: row.id,
    stepOrder: row.stepOrder,
    approverUserId: row.approverUserId,
    approverName: row.approver.name,
    approverEmail: row.approver.email,
    notifyEmail: row.notifyEmail,
    description: row.description,
    canApprove: row.canApprove,
    canReject: row.canReject,
    canReturn: row.canReturn,
  };
}

function categoriesCacheKey() {
  return buildTenantCacheKey(requireTenantId(), "expenseReports", "categories", "active");
}

async function invalidateCategoriesCache() {
  await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "expenseReports", "categories"));
}

export class ExpenseSettingsService {
  constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly chainRepository: ExpenseApprovalChainRepository,
  ) {}

  async listActiveCategories(): Promise<AdminExpenseCategoryItem[]> {
    const cacheKey = categoriesCacheKey();
    const cached = await redisCache.get<AdminExpenseCategoryItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.categoryRepository.listActive();
    const result = rows.map(mapCategory);
    await redisCache.set(cacheKey, result, 300);
    return result;
  }

  async listAllCategories(): Promise<AdminExpenseCategoryItem[]> {
    const rows = await this.categoryRepository.listAll();
    return rows.map(mapCategory);
  }

  async upsertCategory(input: AdminUpsertExpenseCategoryInput): Promise<AdminExpenseCategoryItem> {
    const parsed = upsertCategorySchema.parse(input);

    if (parsed.id) {
      const existing = await this.categoryRepository.findById(parsed.id);
      if (!existing) {
        throw new ExpenseSettingsAdminError("Kategori bulunamadı.", 404);
      }

      const updated = await this.categoryRepository.update({
        id: parsed.id,
        name: parsed.name,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder,
      });
      await invalidateCategoriesCache();
      return mapCategory(updated);
    }

    const created = await this.categoryRepository.create({
      name: parsed.name,
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
    });
    await invalidateCategoriesCache();
    return mapCategory(created);
  }

  async listApprovalChain(): Promise<AdminExpenseApprovalChainStepItem[]> {
    const rows = await this.chainRepository.list();
    return rows.map(mapChainStep);
  }

  async replaceApprovalChain(input: AdminUpsertExpenseApprovalChainInput): Promise<AdminExpenseApprovalChainStepItem[]> {
    const parsed = upsertChainSchema.parse(input);

    const approverIds = parsed.steps.map((step) => step.approverUserId);
    if (new Set(approverIds).size !== approverIds.length) {
      throw new ExpenseSettingsAdminError("Aynı onaycı zincirde birden fazla kez yer alamaz.", 400);
    }

    const orderedSteps = [...parsed.steps]
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((step, index) => ({
        stepOrder: index + 1,
        approverUserId: step.approverUserId,
        notifyEmail: step.notifyEmail ?? null,
        description: step.description ?? null,
        canApprove: step.canApprove,
        canReject: step.canReject,
        canReturn: step.canReturn,
      }));

    const rows = await this.chainRepository.replace(orderedSteps);
    return rows.map(mapChainStep);
  }

  async listApproverCandidates(): Promise<AdminBackofficeUserOption[]> {
    const users = await identityAdminService.listBackofficeUsers(requireTenantId());
    return users.map((user) => ({ id: user.id, name: user.name, email: user.email }));
  }
}

export const expenseSettingsService = new ExpenseSettingsService(expenseCategoryRepository, expenseApprovalChainRepository);
