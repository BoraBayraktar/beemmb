import { z } from "zod";

import tr from "@/i18n/tr.json";
import { redisCache } from "@/lib/redis";
import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import type {
  CategoryOption,
  ProductAttributeAxis,
  ProductCard,
  ProductDetail,
  ProductVariantOption,
  ProductQuestionAnswer,
  ProductRatingDistributionItem,
  ProductRatingSummary,
  ProductListQuery,
  ProductListResult,
  ProductReview,
} from "@/modules/catalog/contracts/catalog.contract";
import { CatalogRepository } from "@/modules/catalog/repositories/catalog.repository";
import {
  buildFeatureFacets,
  decodeProductDescriptionWithFeatures,
  formatFeatureFiltersForUrl,
  productMatchesFeatureFilters,
} from "@/modules/catalog/services/product-features.codec";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { notificationService } from "@/modules/system/services/notification.service";

const adminDictionary = tr.admin;

function formatNotificationMessage(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

const productListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categorySlug: z.string().trim().optional(),
  sort: z.enum(["latest", "price-asc", "price-desc"]).default("latest"),
  inStockOnly: z.boolean().default(false),
  outOfStockOnly: z.boolean().default(false),
  lowStockOnly: z.boolean().default(false),
  newOnly: z.boolean().default(false),
  discountedOnly: z.boolean().default(false),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  featureFilters: z.array(z.string().trim().min(1)).default([]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  includeFacets: z.boolean().default(true),
  includeTotal: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (typeof value.minPrice === "number" && typeof value.maxPrice === "number" && value.minPrice > value.maxPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"],
    });
  }
});

const createReviewSchema = z.object({
  slug: z.string().trim().min(1),
  authorName: z.string().trim().min(2).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(160),
  comment: z.string().trim().min(6).max(2000),
});

const updateOwnReviewSchema = z.object({
  slug: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(160),
  comment: z.string().trim().min(6).max(2000),
});

const createQuestionSchema = z.object({
  slug: z.string().trim().min(1),
  askedBy: z.string().trim().min(2).max(120),
  question: z.string().trim().min(6).max(1000),
});

async function invalidateProductDetailCache(slug: string) {
  await redisCache.del(`catalog:detail:${slug}`);
}

function resolveAggregateAvailableStock(
  inventoryLevels: Array<{
    onHand: number;
    reserved: number;
  }>,
  legacySummaryStock: number,
) {
  if (inventoryLevels.length === 0) {
    // Sprint 1 kuralı: Product.stock yalnızca legacy summary fallback olarak okunabilir.
    return legacySummaryStock;
  }

  return inventoryLevels.reduce((sum, level) => sum + Math.max(0, level.onHand - level.reserved), 0);
}

function mapProduct(product: {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  barcode?: string | null;
  price: { toNumber: () => number };
  compareAtPrice: { toNumber: () => number } | null;
  stock: number;
  currency: string;
  imageUrl: string;
  imageUrls: string[];
  category: { slug: string; name: string } | null;
  inventoryItem?: {
    inventoryLevels: Array<{
      onHand: number;
      reserved: number;
    }>;
  } | null;
}): ProductCard {
  const { cleanDescription, features } = decodeProductDescriptionWithFeatures(product.description);
  const price = product.price.toNumber();
  const compareAtPrice = product.compareAtPrice?.toNumber() ?? null;
  const discountRate = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;
  const inventoryLevels = product.inventoryItem?.inventoryLevels ?? [];
  const aggregateStock = resolveAggregateAvailableStock(inventoryLevels, product.stock);

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode ?? null,
    name: product.name,
    description: cleanDescription,
    price,
    compareAtPrice,
    discountRate,
    stock: aggregateStock,
    inStock: aggregateStock > 0,
    currency: product.currency,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls ?? [],
    features,
    category: product.category
      ? {
          slug: product.category.slug,
          name: product.category.name,
        }
      : null,
  };
}

function mapVariant(item: {
  id: string;
  slug: string;
  sku: string;
  barcode: string | null;
  title: string;
  optionSummary: string;
  priceOverride: { toNumber: () => number } | null;
  purchasePriceOverride: { toNumber: () => number } | null;
  compareAtPriceOverride: { toNumber: () => number } | null;
  imageUrl: string | null;
  imageUrls: string[];
  stockOverride: number | null;
  salesEnabled: boolean;
  isDefault: boolean;
  attributeValues: Array<{
    value: string;
    attributeDefinition: {
      id: string;
      slug: string;
      name: string;
      displayType: "TEXT" | "COLOR" | "NUMBER";
    };
  }>;
}, base: ProductCard): ProductVariantOption {
  const price = item.priceOverride?.toNumber() ?? base.price;
  const compareAtPrice = item.compareAtPriceOverride?.toNumber() ?? base.compareAtPrice;
  const stock = item.stockOverride ?? base.stock;
  const discountRate = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;

  return {
    id: item.id,
    slug: item.slug,
    sku: item.sku,
    barcode: item.barcode,
    title: item.title,
    optionSummary: item.optionSummary,
    price,
    purchasePrice: item.purchasePriceOverride?.toNumber() ?? null,
    compareAtPrice,
    discountRate,
    stock,
    inStock: stock > 0,
    imageUrl: item.imageUrl ?? base.imageUrl,
    imageUrls: item.imageUrls.length > 0 ? item.imageUrls : base.imageUrls,
    isDefault: item.isDefault,
    salesEnabled: item.salesEnabled,
    attributes: item.attributeValues.map((attribute) => ({
      attributeDefinitionId: attribute.attributeDefinition.id,
      slug: attribute.attributeDefinition.slug,
      name: attribute.attributeDefinition.name,
      displayType: attribute.attributeDefinition.displayType,
      value: attribute.value,
    })),
  };
}

function buildVariantAxes(product: {
  attributeLinks: Array<{
    attributeDefinition: {
      id: string;
      slug: string;
      name: string;
      displayType: "TEXT" | "COLOR" | "NUMBER";
    };
  }>;
  variants: Array<{
    attributeValues: Array<{
      value: string;
      attributeDefinition: {
        id: string;
      };
    }>;
  }>;
}): ProductAttributeAxis[] {
  return product.attributeLinks.map((link) => {
    const values = Array.from(new Set(product.variants.flatMap((variant) => (
      variant.attributeValues
        .filter((item) => item.attributeDefinition.id === link.attributeDefinition.id)
        .map((item) => item.value)
    ))));

    return {
      attributeDefinitionId: link.attributeDefinition.id,
      slug: link.attributeDefinition.slug,
      name: link.attributeDefinition.name,
      displayType: link.attributeDefinition.displayType,
      values,
    };
  });
}

function toRatingValue(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value <= 1) {
    return 1;
  }

  if (value === 2) {
    return 2;
  }

  if (value === 3) {
    return 3;
  }

  if (value === 4) {
    return 4;
  }

  return 5;
}

function buildRatingSummary(rows: Array<{ rating: number; _count: { _all: number } }>): ProductRatingSummary {
  const distributionMap = new Map<number, number>();

  for (const row of rows) {
    distributionMap.set(toRatingValue(row.rating), row._count._all);
  }

  const distribution: ProductRatingDistributionItem[] = [5, 4, 3, 2, 1]
    .slice()
    .reverse()
    .map((stars) => ({
      stars: stars as 1 | 2 | 3 | 4 | 5,
      count: distributionMap.get(stars) ?? 0,
    }));

  const count = distribution.reduce((sum, item) => sum + item.count, 0);
  const score = distribution.reduce((sum, item) => sum + item.stars * item.count, 0);

  return {
    average: count > 0 ? Number((score / count).toFixed(1)) : 0,
    count,
    distribution,
  };
}

function mapReview(review: {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: Date;
  verifiedPurchase: boolean;
}): ProductReview {
  return {
    id: review.id,
    authorName: review.authorName,
    rating: toRatingValue(review.rating),
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    verifiedPurchase: review.verifiedPurchase,
  };
}

function mapQuestion(question: {
  id: string;
  question: string;
  askedBy: string;
  createdAt: Date;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
}): ProductQuestionAnswer {
  return {
    id: question.id,
    question: question.question,
    askedBy: question.askedBy,
    askedAt: question.createdAt.toISOString(),
    answer: question.answer,
    answeredBy: question.answeredBy,
    answeredAt: question.answeredAt ? question.answeredAt.toISOString() : null,
  };
}

function productMatchesStockFilters(item: ProductCard, filters: {
  inStockOnly: boolean;
  outOfStockOnly: boolean;
  lowStockOnly: boolean;
}) {
  if (filters.inStockOnly && item.stock <= 0) {
    return false;
  }

  if (filters.outOfStockOnly && item.stock > 0) {
    return false;
  }

  if (filters.lowStockOnly && !(item.stock > 0 && item.stock <= 5)) {
    return false;
  }

  return true;
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  private async resolveCategoryIds(categorySlug?: string) {
    if (!categorySlug) {
      return undefined;
    }

    const categories = await this.listCategories();
    const root = categories.find((item) => item.slug === categorySlug);
    if (!root) {
      return [];
    }

    const ids: string[] = [];
    const queue = [root.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        continue;
      }

      ids.push(currentId);

      const children = categories.filter((item) => item.parentId === currentId);
      for (const child of children) {
        queue.push(child.id);
      }
    }

    return ids;
  }

  async listProducts(query: ProductListQuery): Promise<ProductListResult> {
    const parsed = productListQuerySchema.parse(query);
    const featureFilters = formatFeatureFiltersForUrl(parsed.featureFilters);
    const hasFeatureFilters = featureFilters.length > 0;
    const hasAggregateStockFilters = parsed.inStockOnly || parsed.outOfStockOnly || parsed.lowStockOnly;
    const categoryIds = await this.resolveCategoryIds(parsed.categorySlug);
    const cacheKey = [
      "catalog:list",
      parsed.search ?? "",
      parsed.categorySlug ?? "",
      parsed.sort,
      parsed.inStockOnly ? "in-stock" : "all-stock",
      parsed.outOfStockOnly ? "out-of-stock" : "all-availability",
      parsed.lowStockOnly ? "low-stock" : "all-levels",
      parsed.newOnly ? "new-only" : "all-ages",
      parsed.discountedOnly ? "discounted" : "all-discount",
      typeof parsed.minPrice === "number" ? parsed.minPrice : "min-any",
      typeof parsed.maxPrice === "number" ? parsed.maxPrice : "max-any",
      featureFilters.length > 0 ? featureFilters.slice().sort().join("|") : "all-features",
      parsed.page,
      parsed.pageSize,
    ].join(":");

    const cached = await redisCache.get<ProductListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (parsed.page - 1) * parsed.pageSize;

    const repositoryBaseArgs = {
      search: parsed.search,
      categoryIds,
      inStockOnly: hasAggregateStockFilters ? false : parsed.inStockOnly,
      outOfStockOnly: hasAggregateStockFilters ? false : parsed.outOfStockOnly,
      lowStockOnly: hasAggregateStockFilters ? false : parsed.lowStockOnly,
      newOnly: parsed.newOnly,
      discountedOnly: parsed.discountedOnly,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      sort: parsed.sort,
    };

    if (hasFeatureFilters || hasAggregateStockFilters) {
      const poolSize = Math.max(parsed.pageSize * 20, 240);
      const pool = await runWithTenantContext(
        { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
        () => this.repository.findMany({
          ...repositoryBaseArgs,
          skip: 0,
          take: poolSize,
        }),
      );

      const mappedPool = pool.map(mapProduct);
      const filteredItems = mappedPool.filter((item) => (
        productMatchesStockFilters(item, {
          inStockOnly: parsed.inStockOnly,
          outOfStockOnly: parsed.outOfStockOnly,
          lowStockOnly: parsed.lowStockOnly,
        })
        && (
          !hasFeatureFilters
          || productMatchesFeatureFilters(item.features, featureFilters)
        )
      ));
      const pagedItems = filteredItems.slice(skip, skip + parsed.pageSize);
      const total = filteredItems.length;

      const result: ProductListResult = {
        items: pagedItems,
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
        featureFacets: parsed.includeFacets ? buildFeatureFacets(filteredItems) : [],
      };

      await redisCache.set(cacheKey, result, 120);
      return result;
    }

    const [items, total, facetRows] = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => Promise.all([
        this.repository.findMany({
          ...repositoryBaseArgs,
          skip,
          take: parsed.pageSize,
        }),
        parsed.includeTotal
          ? this.repository.count({
              search: repositoryBaseArgs.search,
              categoryIds: repositoryBaseArgs.categoryIds,
              inStockOnly: repositoryBaseArgs.inStockOnly,
              outOfStockOnly: repositoryBaseArgs.outOfStockOnly,
              lowStockOnly: repositoryBaseArgs.lowStockOnly,
              newOnly: repositoryBaseArgs.newOnly,
              discountedOnly: repositoryBaseArgs.discountedOnly,
              minPrice: repositoryBaseArgs.minPrice,
              maxPrice: repositoryBaseArgs.maxPrice,
            })
          : Promise.resolve(skip + parsed.pageSize + 1),
        parsed.includeFacets
          ? this.repository.findMany({
              ...repositoryBaseArgs,
              skip: 0,
              take: 240,
            })
          : Promise.resolve([]),
      ]),
    );

    const resolvedTotal = parsed.includeTotal ? total : items.length === parsed.pageSize ? skip + items.length + 1 : skip + items.length;
    const resolvedTotalPages = parsed.includeTotal
      ? Math.max(1, Math.ceil(resolvedTotal / parsed.pageSize))
      : Math.max(parsed.page, items.length === parsed.pageSize ? parsed.page + 1 : parsed.page);

    const result: ProductListResult = {
      items: items.map(mapProduct),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total: resolvedTotal,
      totalPages: resolvedTotalPages,
      featureFacets: parsed.includeFacets ? buildFeatureFacets(facetRows.map(mapProduct)) : [],
    };

    await redisCache.set(cacheKey, result, 120);

    return result;
  }

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const cacheKey = `catalog:detail:${slug}`;
    const cached = await redisCache.get<ProductDetail>(cacheKey);
    if (
      cached
      && Array.isArray(cached.variants)
      && Array.isArray(cached.variantAxes)
      && "defaultVariantId" in cached
    ) {
      return cached;
    }

    if (cached) {
      await redisCache.del(cacheKey);
    }

    const { product, reviews, ratingRows, questions } = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      async () => {
        const product = await this.repository.findBySlug(slug);
        if (!product) {
          return { product: null, reviews: [], ratingRows: [], questions: [] };
        }

        const [reviews, ratingRows, questions] = await Promise.all([
          this.repository.findReviewsByProductId(product.id, 12),
          this.repository.getReviewRatingDistribution(product.id),
          this.repository.findQuestionsByProductId(product.id, 10),
        ]);

        return { product, reviews, ratingRows, questions };
      },
    );
    if (!product) {
      return null;
    }

    const mappedCard = mapProduct(product);
    const variants = product.variants.map((variant) => mapVariant(variant, mappedCard));
    const defaultVariantId = variants.find((variant) => variant.isDefault)?.id ?? variants[0]?.id ?? null;
    const mapped: ProductDetail = {
      ...mappedCard,
      ratingSummary: buildRatingSummary(ratingRows),
      reviews: reviews.map(mapReview),
      questions: questions.map(mapQuestion),
      variantAxes: buildVariantAxes(product),
      variants,
      defaultVariantId,
    };

    await redisCache.set(cacheKey, mapped, 120);
    return mapped;
  }

  /**
   * Public magaza tek-tenant'lidir (bkz. DEVELOPMENT_RULES.md madde 7) --
   * bu servis anonim ziyaretcilerden de cagrildigi icin tenant context'i
   * her zaman platform tenant'ina (Beemmb'nin kendi magazasi) sabitlenir.
   */
  async listCategories(): Promise<CategoryOption[]> {
    const cacheKey = "catalog:categories";
    const cached = await redisCache.get<CategoryOption[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => this.repository.listCategories(),
    );
    await redisCache.set(cacheKey, categories, 600);
    return categories;
  }

  async trackProductView(productId: string): Promise<void> {
    await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => this.repository.trackProductView(productId),
    );
  }

  async createReview(input: {
    slug: string;
    userId: string;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
  }) {
    const parsed = createReviewSchema.parse(input);
    const review = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      async () => {
        const existingOwn = await this.repository.findOwnReviewByProductSlug(parsed.slug, input.userId);
        if (existingOwn) {
          throw new Error("Review already exists");
        }

        const product = await this.repository.findActiveProductIdBySlug(parsed.slug);
        if (!product) {
          throw new Error("Product not found");
        }

        return this.repository.createProductReview({
          productId: product.id,
          authorUserId: input.userId,
          authorName: parsed.authorName,
          rating: parsed.rating,
          title: parsed.title,
          comment: parsed.comment,
          verifiedPurchase: false,
        });
      },
    );

    await invalidateProductDetailCache(parsed.slug);
    return mapReview(review);
  }

  async getOwnReview(input: {
    slug: string;
    userId: string;
  }) {
    const own = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => this.repository.findOwnReviewByProductSlug(input.slug, input.userId),
    );
    if (!own) {
      return null;
    }

    return mapReview(own);
  }

  async updateOwnReview(input: {
    slug: string;
    userId: string;
    rating: number;
    title: string;
    comment: string;
  }) {
    const parsed = updateOwnReviewSchema.parse(input);
    const updated = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      async () => {
        const own = await this.repository.findOwnReviewByProductSlug(parsed.slug, input.userId);
        if (!own) {
          throw new Error("Review not found");
        }

        return this.repository.updateOwnReview(own.id, {
          rating: parsed.rating,
          title: parsed.title,
          comment: parsed.comment,
        });
      },
    );

    await invalidateProductDetailCache(parsed.slug);
    return mapReview(updated);
  }

  async deleteOwnReview(input: {
    slug: string;
    userId: string;
  }) {
    await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      async () => {
        const own = await this.repository.findOwnReviewByProductSlug(input.slug, input.userId);
        if (!own) {
          throw new Error("Review not found");
        }

        await this.repository.softDeleteOwnReview(own.id, input.userId);
      },
    );

    await invalidateProductDetailCache(input.slug);
  }

  async createQuestion(input: {
    slug: string;
    askedBy: string;
    question: string;
  }) {
    const parsed = createQuestionSchema.parse(input);
    const { product, question } = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      async () => {
        const product = await this.repository.findActiveProductIdBySlug(parsed.slug);
        if (!product) {
          throw new Error("Product not found");
        }

        const question = await this.repository.createProductQuestion({
          productId: product.id,
          askedBy: parsed.askedBy,
          question: parsed.question,
        });

        return { product, question };
      },
    );

    try {
      const recipients = await identityAdminService.listBackofficeUsers();
      if (recipients.length > 0) {
        await notificationService.createForRecipients({
          recipients: recipients.map((item) => ({ id: item.id })),
          channels: ["IN_APP", "EMAIL"],
          type: "PRODUCT_QUESTION_CREATED",
          title: `${adminDictionary.notificationProductQuestionCreatedTitle}: ${product.name}`,
          message: formatNotificationMessage(adminDictionary.notificationProductQuestionCreatedMessage, {
            askedBy: parsed.askedBy,
            question: parsed.question,
          }),
          linkUrl: `/admin/product-questions?questionId=${question.id}`,
        });
      }
    } catch {
      // Do not block customer flow if notification fan-out fails.
    }

    await invalidateProductDetailCache(parsed.slug);
    return mapQuestion(question);
  }
}

export const catalogService = new CatalogService(new CatalogRepository());
