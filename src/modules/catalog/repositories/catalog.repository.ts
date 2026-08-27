import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { ProductSort } from "@/modules/catalog/contracts/catalog.contract";

type FindManyArgs = {
  search?: string;
  categoryIds?: string[];
  inStockOnly?: boolean;
  outOfStockOnly?: boolean;
  lowStockOnly?: boolean;
  newOnly?: boolean;
  discountedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSort;
  skip: number;
  take: number;
};

type CountArgs = {
  search?: string;
  categoryIds?: string[];
  inStockOnly?: boolean;
  outOfStockOnly?: boolean;
  lowStockOnly?: boolean;
  newOnly?: boolean;
  discountedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

function buildWhere(args: {
  search?: string;
  categoryIds?: string[];
  inStockOnly?: boolean;
  outOfStockOnly?: boolean;
  lowStockOnly?: boolean;
  newOnly?: boolean;
  discountedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
}) {
  const { search, categoryIds, inStockOnly, outOfStockOnly, lowStockOnly, newOnly, discountedOnly, minPrice, maxPrice } = args;
  const createdAtGte = newOnly ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : undefined;

  return {
    deleted: false,
    status: "ACTIVE" as const,
    salesEnabled: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoryIds
      ? {
          categoryId: {
            in: categoryIds,
          },
        }
      : {}),
    ...(inStockOnly
      ? {
          stock: {
            gt: 0,
          },
        }
      : {}),
    ...(outOfStockOnly
      ? {
          stock: {
            lte: 0,
          },
        }
      : {}),
    ...(lowStockOnly
      ? {
          stock: {
            gt: 0,
            lte: 5,
          },
        }
      : {}),
    ...(createdAtGte
      ? {
          createdAt: {
            gte: createdAtGte,
          },
        }
      : {}),
    ...(discountedOnly
      ? {
          compareAtPrice: {
            not: null,
          },
        }
      : {}),
    ...((typeof minPrice === "number" || typeof maxPrice === "number")
      ? {
          price: {
            ...(typeof minPrice === "number" ? { gte: minPrice } : {}),
            ...(typeof maxPrice === "number" ? { lte: maxPrice } : {}),
          },
        }
      : {}),
  };
}

function resolveOrderBy(sort: ProductSort) {
  if (sort === "price-asc") {
    return { price: "asc" as const };
  }

  if (sort === "price-desc") {
    return { price: "desc" as const };
  }

  return { createdAt: "desc" as const };
}

export class CatalogRepository {
  async findMany(args: FindManyArgs) {
    return prisma.product.findMany({
      where: buildWhere(args),
      include: {
        category: true,
        inventoryItem: {
          select: {
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                },
              },
              select: {
                onHand: true,
                reserved: true,
              },
            },
          },
        },
      },
      orderBy: resolveOrderBy(args.sort),
      skip: args.skip,
      take: args.take,
    });
  }

  async count(args: CountArgs) {
    return prisma.product.count({
      where: buildWhere(args),
    });
  }

  async findBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        deleted: false,
        status: "ACTIVE",
        salesEnabled: true,
      },
      include: {
        attributeLinks: {
          where: {
            isVariantAxis: true,
          },
          include: {
            attributeDefinition: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        category: true,
        inventoryItem: {
          select: {
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                },
              },
              select: {
                onHand: true,
                reserved: true,
              },
            },
          },
        },
        variants: {
          where: {
            deleted: false,
            salesEnabled: true,
          },
          include: {
            attributeValues: {
              include: {
                attributeDefinition: true,
              },
            },
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });
  }

  async findActiveProductIdBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        deleted: false,
        status: "ACTIVE",
        salesEnabled: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async listCategories() {
    return prisma.category.findMany({
      where: {
        deleted: false,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
      },
    });
  }

  async trackProductView(productId: string) {
    await prisma.productInteraction.upsert({
      where: {
        productId,
      },
      update: {
        viewCount: {
          increment: 1,
        },
        lastViewedAt: new Date(),
      },
      create: {
        tenantId: requireTenantId(),
        productId,
        viewCount: 1,
        lastViewedAt: new Date(),
      },
    });
  }

  async findReviewsByProductId(productId: string, take = 12) {
    return prisma.productReview.findMany({
      where: {
        productId,
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });
  }

  async getReviewRatingDistribution(productId: string) {
    return prisma.productReview.groupBy({
      by: ["rating"],
      where: {
        productId,
        deleted: false,
      },
      _count: {
        _all: true,
      },
    });
  }

  async findQuestionsByProductId(productId: string, take = 10) {
    return prisma.productQuestion.findMany({
      where: {
        productId,
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });
  }

  async createProductReview(input: {
    productId: string;
    authorUserId?: string;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
    verifiedPurchase: boolean;
  }) {
    return prisma.productReview.create({
      data: {
        tenantId: requireTenantId(),
        productId: input.productId,
        authorUserId: input.authorUserId ?? null,
        authorName: input.authorName,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        verifiedPurchase: input.verifiedPurchase,
      },
    });
  }

  async findOwnReviewByProductSlug(slug: string, authorUserId: string) {
    return prisma.productReview.findFirst({
      where: {
        product: {
          slug,
          deleted: false,
        },
        authorUserId,
        deleted: false,
      },
      include: {
        product: {
          select: {
            slug: true,
          },
        },
      },
    });
  }

  async updateOwnReview(reviewId: string, input: {
    rating: number;
    title: string;
    comment: string;
  }) {
    return prisma.productReview.update({
      where: {
        id: reviewId,
      },
      data: {
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      },
    });
  }

  async softDeleteOwnReview(reviewId: string, authorUserId: string) {
    return prisma.productReview.update({
      where: {
        id: reviewId,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: authorUserId,
      },
    });
  }

  async createProductQuestion(input: {
    productId: string;
    question: string;
    askedBy: string;
  }) {
    return prisma.productQuestion.create({
      data: {
        tenantId: requireTenantId(),
        productId: input.productId,
        question: input.question,
        askedBy: input.askedBy,
      },
    });
  }
}
