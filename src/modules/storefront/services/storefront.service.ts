import { z } from "zod";

import { redisCache } from "@/lib/redis";
import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import type {
  AdminStorefrontItem,
  LocalizedStorefrontResolver,
  StorefrontItem,
  StorefrontSectionResult,
  UpsertStorefrontItemInput,
} from "@/modules/storefront/contracts/storefront.contract";
import { StorefrontRepository } from "@/modules/storefront/repositories/storefront.repository";

const upsertSchema = z.object({
  id: z.string().trim().optional(),
  section: z.enum(["HOME_CAMPAIGN", "HOME_FEATURE"]),
  variant: z.enum(["accent", "soft", "dark", "default"]),
  targetType: z.enum(["PRODUCT", "CATEGORY"]).nullable().optional(),
  productId: z.string().trim().min(1).nullable().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  titleTr: z.string().trim().min(2),
  titleEn: z.string().trim().min(2),
  descriptionTr: z.string().trim().min(3),
  descriptionEn: z.string().trim().min(3),
  sortOrder: z.coerce.number().int().min(1).max(99),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
}).superRefine((value, context) => {
  if (value.targetType === "PRODUCT" && !value.productId) {
    context.addIssue({ code: "custom", path: ["productId"], message: "Product target is required" });
  }

  if (value.targetType === "CATEGORY" && !value.categoryId) {
    context.addIssue({ code: "custom", path: ["categoryId"], message: "Category target is required" });
  }

  if (value.startsAt && value.endsAt && value.endsAt < value.startsAt) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be later than start date" });
  }
});

const storefrontVariantSchema = z.enum(["accent", "soft", "dark", "default"]);

function getCacheKey(locale: string) {
  return `storefront:home:${locale}`;
}

function mapLocalized(
  item: {
    id: string;
    section: "HOME_CAMPAIGN" | "HOME_FEATURE";
    variant: string;
    targetType: "PRODUCT" | "CATEGORY" | null;
    productId: string | null;
    categoryId: string | null;
    product: {
      slug: string;
      name: string;
      imageUrl: string;
      price: { toNumber: () => number };
      currency: string;
    } | null;
    category: {
      slug: string;
      name: string;
      products: { imageUrl: string }[];
    } | null;
    titleTr: string;
    titleEn: string;
    descriptionTr: string;
    descriptionEn: string;
    sortOrder: number;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  locale: LocalizedStorefrontResolver["locale"],
): StorefrontItem {
  return {
    id: item.id,
    section: item.section,
    variant: storefrontVariantSchema.parse(item.variant),
    targetType: item.targetType,
    productId: item.productId,
    categoryId: item.categoryId,
    target: item.targetType === "PRODUCT" && item.product
      ? {
          type: "PRODUCT",
          slug: item.product.slug,
          title: item.product.name,
          imageUrl: item.product.imageUrl,
          price: item.product.price.toNumber(),
          currency: item.product.currency,
        }
      : item.targetType === "CATEGORY" && item.category
        ? {
            type: "CATEGORY",
            slug: item.category.slug,
            title: item.category.name,
            imageUrl: item.category.products[0]?.imageUrl ?? null,
          }
        : null,
    title: locale === "tr" ? item.titleTr : item.titleEn,
    description: locale === "tr" ? item.descriptionTr : item.descriptionEn,
    sortOrder: item.sortOrder,
  };
}

function mapAdmin(item: {
  id: string;
  section: "HOME_CAMPAIGN" | "HOME_FEATURE";
  variant: string;
  targetType: "PRODUCT" | "CATEGORY" | null;
  productId: string | null;
  categoryId: string | null;
  product: { name: string } | null;
  category: { name: string } | null;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
}): AdminStorefrontItem {
  return {
    id: item.id,
    section: item.section,
    variant: storefrontVariantSchema.parse(item.variant),
    targetType: item.targetType,
    productId: item.productId,
    categoryId: item.categoryId,
    productName: item.product?.name ?? null,
    categoryName: item.category?.name ?? null,
    titleTr: item.titleTr,
    titleEn: item.titleEn,
    descriptionTr: item.descriptionTr,
    descriptionEn: item.descriptionEn,
    sortOrder: item.sortOrder,
    startsAt: item.startsAt ? item.startsAt.toISOString() : null,
    endsAt: item.endsAt ? item.endsAt.toISOString() : null,
  };
}

async function invalidateStorefrontCache() {
  await Promise.all([redisCache.del(getCacheKey("tr")), redisCache.del(getCacheKey("en"))]);
}

export class StorefrontService {
  constructor(private readonly repository: StorefrontRepository) {}

  async getHomeSections(locale: LocalizedStorefrontResolver["locale"]): Promise<StorefrontSectionResult> {
    const cacheKey = getCacheKey(locale);
    const cached = await redisCache.get<StorefrontSectionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => this.repository.listHomeActiveItems(),
    );
    const localized = items.map((item) => mapLocalized(item, locale));
    const result: StorefrontSectionResult = {
      campaigns: localized.filter((item) => item.section === "HOME_CAMPAIGN"),
      features: localized.filter((item) => item.section === "HOME_FEATURE"),
    };

    await redisCache.set(cacheKey, result, 300);
    return result;
  }

  async listAdminItems(): Promise<AdminStorefrontItem[]> {
    const items = await this.repository.listAdminItems();
    return items.map(mapAdmin);
  }

  async upsertItem(input: UpsertStorefrontItemInput): Promise<AdminStorefrontItem> {
    const parsed = upsertSchema.parse(input);
    const item = await this.repository.upsertItem(parsed);
    await invalidateStorefrontCache();
    return mapAdmin(item);
  }

  async softDeleteItem(id: string, deletedUserId: string) {
    await this.repository.softDeleteItem(id, deletedUserId);
    await invalidateStorefrontCache();
  }
}

export const storefrontService = new StorefrontService(new StorefrontRepository());
