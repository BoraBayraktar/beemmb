import { z } from "zod";

import type {
  AdminBackofficeUserOption,
  AdminExpenseApproverSettingItem,
  AdminExpenseCategoryItem,
  AdminUpsertExpenseApproverSettingInput,
  AdminUpsertExpenseCategoryInput,
} from "@/modules/expense-reports/contracts/expense-settings.contract";
import {
  ExpenseApproverSettingRepository,
  ExpenseCategoryRepository,
  expenseApproverSettingRepository,
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

const upsertApproverSchema = z.object({
  approverUserId: z.string().trim().min(1),
  notifyEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
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

function categoriesCacheKey() {
  return buildTenantCacheKey(requireTenantId(), "expenseReports", "categories", "active");
}

async function invalidateCategoriesCache() {
  await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "expenseReports", "categories"));
}

export class ExpenseSettingsService {
  constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly approverRepository: ExpenseApproverSettingRepository,
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

  async getApproverSetting(): Promise<AdminExpenseApproverSettingItem | null> {
    const row = await this.approverRepository.get();
    if (!row) {
      return null;
    }

    return {
      approverUserId: row.approverUserId,
      approverName: row.approver.name,
      approverEmail: row.approver.email,
      notifyEmail: row.notifyEmail,
    };
  }

  async upsertApproverSetting(input: AdminUpsertExpenseApproverSettingInput): Promise<AdminExpenseApproverSettingItem> {
    const parsed = upsertApproverSchema.parse(input);
    const updated = await this.approverRepository.upsert({
      approverUserId: parsed.approverUserId,
      notifyEmail: parsed.notifyEmail,
    });

    return {
      approverUserId: updated.approverUserId,
      approverName: updated.approver.name,
      approverEmail: updated.approver.email,
      notifyEmail: updated.notifyEmail,
    };
  }

  async listApproverCandidates(): Promise<AdminBackofficeUserOption[]> {
    const users = await identityAdminService.listBackofficeUsers(requireTenantId());
    return users.map((user) => ({ id: user.id, name: user.name, email: user.email }));
  }
}

export const expenseSettingsService = new ExpenseSettingsService(expenseCategoryRepository, expenseApproverSettingRepository);
