import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AdminAnswerProductQuestionInput,
  AdminCreateProductAttributeDefinitionInput,
  AdminCreateBrandInput,
  AdminCreateSupplierInput,
  AdminCategoryListQuery,
  AdminProductQuestionListQuery,
  AdminProductListQuery,
  AdminUpdateBrandInput,
  AdminUpdateCategoryInput,
  AdminUpdateProductAttributeDefinitionInput,
  AdminUpsertProductAttributeValueMarketplaceMappingInput,
  AdminUpdateSupplierInput,
} from "@/modules/catalog/contracts/catalog-admin.contract";

type AdminCreateProductRecordInput = {
  slug: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType?: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price: number;
  purchasePrice?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  vatRate?: number;
  stockTrackingEnabled?: boolean;
  salesEnabled?: boolean;
  purchaseEnabled?: boolean;
  internalNote?: string | null;
  searchKeywords?: string[];
  brandId?: string | null;
  primarySupplierId?: string | null;
  preferredSalesWarehouseId?: string | null;
  preferredPurchaseWarehouseId?: string | null;
  imageUrl: string;
  imageUrls?: string[];
  categoryId?: string | null;
  attributeLinks?: Array<{
    attributeDefinitionId: string;
    isVariantAxis: boolean;
    sortOrder?: number;
  }>;
  variants?: Array<{
    id?: string;
    slug: string;
    sku: string;
    barcode?: string | null;
    title: string;
    optionSummary: string;
    priceOverride?: number | null;
    purchasePriceOverride?: number | null;
    compareAtPriceOverride?: number | null;
    imageUrl?: string | null;
    imageUrls?: string[];
    stockOverride?: number | null;
    salesEnabled?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    attributes: Array<{
      attributeDefinitionId: string;
      value: string;
    }>;
  }>;
};

type AdminUpdateProductRecordInput = {
  id: string;
  slug?: string;
  sku?: string;
  barcode?: string | null;
  name?: string;
  description?: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType?: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price?: number;
  purchasePrice?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  vatRate?: number;
  stockTrackingEnabled?: boolean;
  salesEnabled?: boolean;
  purchaseEnabled?: boolean;
  internalNote?: string | null;
  searchKeywords?: string[];
  brandId?: string | null;
  primarySupplierId?: string | null;
  preferredSalesWarehouseId?: string | null;
  preferredPurchaseWarehouseId?: string | null;
  imageUrl?: string;
  imageUrls?: string[];
  categoryId?: string | null;
  attributeLinks?: Array<{
    attributeDefinitionId: string;
    isVariantAxis: boolean;
    sortOrder?: number;
  }>;
  variants?: Array<{
    id?: string;
    slug: string;
    sku: string;
    barcode?: string | null;
    title: string;
    optionSummary: string;
    priceOverride?: number | null;
    purchasePriceOverride?: number | null;
    compareAtPriceOverride?: number | null;
    imageUrl?: string | null;
    imageUrls?: string[];
    stockOverride?: number | null;
    salesEnabled?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    attributes: Array<{
      attributeDefinitionId: string;
      value: string;
    }>;
  }>;
};

function buildWhere(args: {
  search?: string;
  categoryId?: string;
  status?: "all" | "DRAFT" | "ACTIVE" | "ARCHIVED";
  brandId?: string;
  supplierId?: string;
}) {
  return {
    deleted: false,
    ...(args.search
      ? {
          OR: [
            { name: { contains: args.search, mode: "insensitive" as const } },
            { slug: { contains: args.search, mode: "insensitive" as const } },
            { description: { contains: args.search, mode: "insensitive" as const } },
            { sku: { contains: args.search, mode: "insensitive" as const } },
            { barcode: { contains: args.search, mode: "insensitive" as const } },
            { brand: { name: { contains: args.search, mode: "insensitive" as const } } },
            { primarySupplier: { name: { contains: args.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(args.categoryId ? { categoryId: args.categoryId } : {}),
    ...(args.status && args.status !== "all" ? { status: args.status } : {}),
    ...(args.brandId ? { brandId: args.brandId } : {}),
    ...(args.supplierId ? { primarySupplierId: args.supplierId } : {}),
  };
}

function buildQuestionWhere(args: AdminProductQuestionListQuery) {
  return {
    deleted: false,
    ...(args.questionId ? { id: args.questionId } : {}),
    ...(args.status === "pending" ? { answer: null } : {}),
    ...(args.status === "answered" ? { answer: { not: null } } : {}),
    ...(args.search
      ? {
          OR: [
            { question: { contains: args.search, mode: "insensitive" as const } },
            { askedBy: { contains: args.search, mode: "insensitive" as const } },
            { product: { name: { contains: args.search, mode: "insensitive" as const } } },
            { product: { slug: { contains: args.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}

function buildQuestionOrderBy(args: AdminProductQuestionListQuery) {
  switch (args.sort ?? "priority") {
    case "latest":
      return [{ createdAt: "desc" as const }];
    case "oldest":
      return [{ createdAt: "asc" as const }];
    case "priority":
    default:
      return [{ answeredAt: "asc" as const }, { createdAt: "desc" as const }];
  }
}

export class CatalogAdminRepository {
  async findSkuOwners(skus: string[]) {
    const normalizedSkus = Array.from(new Set(skus.map((sku) => sku.trim()).filter(Boolean)));

    if (normalizedSkus.length === 0) {
      return {
        products: [],
        variants: [],
      };
    }

    const skuFilters = normalizedSkus.map((sku) => ({
      sku: {
        equals: sku,
        mode: "insensitive" as const,
      },
    }));

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: skuFilters,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          deleted: true,
        },
      }),
      prisma.productVariant.findMany({
        where: {
          OR: skuFilters,
        },
        select: {
          id: true,
          sku: true,
          title: true,
          productId: true,
          deleted: true,
        },
      }),
    ]);

    return {
      products,
      variants,
    };
  }

  async findSlugOwners(slugs: string[]) {
    const normalizedSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));

    if (normalizedSlugs.length === 0) {
      return {
        products: [],
        variants: [],
      };
    }

    const slugFilters = normalizedSlugs.map((slug) => ({
      slug: {
        equals: slug,
        mode: "insensitive" as const,
      },
    }));

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: slugFilters,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          deleted: true,
        },
      }),
      prisma.productVariant.findMany({
        where: {
          OR: slugFilters,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          productId: true,
          deleted: true,
        },
      }),
    ]);

    return {
      products,
      variants,
    };
  }

  async listProducts(args: AdminProductListQuery) {
    return prisma.product.findMany({
      where: buildWhere(args),
      include: {
        brand: true,
        category: true,
        attributeLinks: {
          include: {
            attributeDefinition: true,
          },
        },
        inventoryItem: {
          select: {
            averageUnitCost: true,
            lastPurchaseUnitCost: true,
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
        primarySupplier: true,
        variants: {
          where: {
            deleted: false,
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            attributeValues: {
              include: {
                attributeDefinition: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 10),
      take: args.pageSize,
    });
  }

  async countProducts(args: Pick<AdminProductListQuery, "search" | "categoryId" | "status" | "brandId" | "supplierId">) {
    return prisma.product.count({
      where: buildWhere(args),
    });
  }

  async summarizeProductSales(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<string, {
        orderCount: number;
        soldQuantity: number;
        grossRevenue: number;
        averageUnitCost: number | null;
        lastPurchaseUnitCost: number | null;
        stockValue: number;
        grossProfit: number;
        grossMarginRate: number | null;
        lastOrderedAt: string | null;
      }>();
    }

    const rows = await prisma.orderItem.findMany({
      where: {
        deleted: false,
        productId: {
          in: productIds,
        },
        order: {
          deleted: false,
        },
      },
      select: {
        productId: true,
        orderId: true,
        quantity: true,
        lineTotal: true,
        createdAt: true,
      },
    });

    const summary = new Map<string, {
      orderIds: Set<string>;
      soldQuantity: number;
      grossRevenue: number;
      lastOrderedAt: string | null;
    }>();

    for (const row of rows) {
      if (!row.productId) {
        continue;
      }

      const existing = summary.get(row.productId) ?? {
        orderIds: new Set<string>(),
        soldQuantity: 0,
        grossRevenue: 0,
        lastOrderedAt: null,
      };

      existing.orderIds.add(row.orderId);
      existing.soldQuantity += row.quantity;
      existing.grossRevenue += row.lineTotal.toNumber();
      if (!existing.lastOrderedAt || row.createdAt.toISOString() > existing.lastOrderedAt) {
        existing.lastOrderedAt = row.createdAt.toISOString();
      }

      summary.set(row.productId, existing);
    }

    return new Map(
      [...summary.entries()].map(([productId, item]) => [productId, {
        orderCount: item.orderIds.size,
        soldQuantity: item.soldQuantity,
        grossRevenue: item.grossRevenue,
        averageUnitCost: null,
        lastPurchaseUnitCost: null,
        stockValue: 0,
        grossProfit: 0,
        grossMarginRate: null,
        lastOrderedAt: item.lastOrderedAt,
      }]),
    );
  }

  async createProduct(input: AdminCreateProductRecordInput) {
    return prisma.product.create({
      data: {
        slug: input.slug,
        sku: input.sku,
        barcode: input.barcode ?? null,
        name: input.name,
        description: input.description,
        productType: input.productType ?? "PHYSICAL",
        status: input.status ?? "ACTIVE",
        unitType: input.unitType ?? "PIECE",
        price: input.price,
        purchasePrice: input.purchasePrice ?? null,
        compareAtPrice: input.compareAtPrice ?? null,
        stock: 0,
        currency: input.currency ?? "TRY",
        vatRate: input.vatRate ?? 20,
        stockTrackingEnabled: input.stockTrackingEnabled ?? true,
        salesEnabled: input.salesEnabled ?? true,
        purchaseEnabled: input.purchaseEnabled ?? true,
        internalNote: input.internalNote ?? null,
        searchKeywords: input.searchKeywords ?? [],
        brandId: input.brandId ?? null,
        primarySupplierId: input.primarySupplierId ?? null,
        preferredSalesWarehouseId: input.preferredSalesWarehouseId ?? null,
        preferredPurchaseWarehouseId: input.preferredPurchaseWarehouseId ?? null,
        imageUrl: input.imageUrl,
        imageUrls: input.imageUrls ?? [],
        categoryId: input.categoryId ?? null,
        attributeLinks: input.attributeLinks?.length
          ? {
              create: input.attributeLinks.map((link, index) => ({
                attributeDefinitionId: link.attributeDefinitionId,
                isVariantAxis: link.isVariantAxis,
                sortOrder: link.sortOrder ?? index,
              })),
            }
          : undefined,
        variants: input.variants?.length
          ? {
              create: input.variants.map((variant, index) => ({
                slug: variant.slug,
                sku: variant.sku,
                barcode: variant.barcode ?? null,
                title: variant.title,
                optionSummary: variant.optionSummary,
                priceOverride: variant.priceOverride ?? null,
                purchasePriceOverride: variant.purchasePriceOverride ?? null,
                compareAtPriceOverride: variant.compareAtPriceOverride ?? null,
                imageUrl: variant.imageUrl ?? null,
                imageUrls: variant.imageUrls ?? [],
                stockOverride: variant.stockOverride ?? null,
                salesEnabled: variant.salesEnabled ?? true,
                isDefault: variant.isDefault ?? index === 0,
                sortOrder: variant.sortOrder ?? index,
                attributeValues: {
                  create: variant.attributes.map((attribute) => ({
                    attributeDefinitionId: attribute.attributeDefinitionId,
                    value: attribute.value,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        brand: true,
        category: true,
        attributeLinks: {
          include: {
            attributeDefinition: true,
          },
        },
        inventoryItem: {
          select: {
            averageUnitCost: true,
            lastPurchaseUnitCost: true,
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
        primarySupplier: true,
        variants: {
          where: {
            deleted: false,
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            attributeValues: {
              include: {
                attributeDefinition: true,
              },
            },
          },
        },
      },
    });
  }

  async updateProduct(input: AdminUpdateProductRecordInput) {
    return prisma.product.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.productType !== undefined ? { productType: input.productType } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.unitType !== undefined ? { unitType: input.unitType } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {}),
        ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.vatRate !== undefined ? { vatRate: input.vatRate } : {}),
        ...(input.stockTrackingEnabled !== undefined ? { stockTrackingEnabled: input.stockTrackingEnabled } : {}),
        ...(input.salesEnabled !== undefined ? { salesEnabled: input.salesEnabled } : {}),
        ...(input.purchaseEnabled !== undefined ? { purchaseEnabled: input.purchaseEnabled } : {}),
        ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
        ...(input.searchKeywords !== undefined ? { searchKeywords: input.searchKeywords } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.primarySupplierId !== undefined ? { primarySupplierId: input.primarySupplierId } : {}),
        ...(input.preferredSalesWarehouseId !== undefined ? { preferredSalesWarehouseId: input.preferredSalesWarehouseId } : {}),
        ...(input.preferredPurchaseWarehouseId !== undefined ? { preferredPurchaseWarehouseId: input.preferredPurchaseWarehouseId } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.attributeLinks !== undefined
          ? {
              attributeLinks: {
                deleteMany: {},
                create: input.attributeLinks.map((link, index) => ({
                  attributeDefinitionId: link.attributeDefinitionId,
                  isVariantAxis: link.isVariantAxis,
                  sortOrder: link.sortOrder ?? index,
                })),
              },
            }
          : {}),
        ...(input.variants !== undefined
          ? {
              variants: {
                deleteMany: {},
                create: input.variants.map((variant, index) => ({
                  slug: variant.slug,
                  sku: variant.sku,
                  barcode: variant.barcode ?? null,
                  title: variant.title,
                  optionSummary: variant.optionSummary,
                  priceOverride: variant.priceOverride ?? null,
                  purchasePriceOverride: variant.purchasePriceOverride ?? null,
                  compareAtPriceOverride: variant.compareAtPriceOverride ?? null,
                  imageUrl: variant.imageUrl ?? null,
                  imageUrls: variant.imageUrls ?? [],
                  stockOverride: variant.stockOverride ?? null,
                  salesEnabled: variant.salesEnabled ?? true,
                  isDefault: variant.isDefault ?? index === 0,
                  sortOrder: variant.sortOrder ?? index,
                  attributeValues: {
                    create: variant.attributes.map((attribute) => ({
                      attributeDefinitionId: attribute.attributeDefinitionId,
                      value: attribute.value,
                    })),
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        brand: true,
        category: true,
        attributeLinks: {
          include: {
            attributeDefinition: true,
          },
        },
        inventoryItem: {
          select: {
            averageUnitCost: true,
            lastPurchaseUnitCost: true,
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
        primarySupplier: true,
        variants: {
          where: {
            deleted: false,
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            attributeValues: {
              include: {
                attributeDefinition: true,
              },
            },
          },
        },
      },
    });
  }

  async updateProductVariantDefinitions(input: Pick<AdminUpdateProductRecordInput, "id" | "attributeLinks" | "variants">) {
    await prisma.$transaction(async (tx) => {
      if (input.attributeLinks !== undefined) {
        await tx.productAttributeLink.deleteMany({
          where: {
            productId: input.id,
          },
        });

        if (input.attributeLinks.length > 0) {
          await tx.productAttributeLink.createMany({
            data: input.attributeLinks.map((link, index) => ({
              productId: input.id,
              attributeDefinitionId: link.attributeDefinitionId,
              isVariantAxis: link.isVariantAxis,
              sortOrder: link.sortOrder ?? index,
            })),
          });
        }
      }

      if (input.variants !== undefined) {
        const existingVariants = await tx.productVariant.findMany({
          where: {
            productId: input.id,
            deleted: false,
          },
          select: {
            id: true,
          },
        });
        const submittedExistingIds = new Set(input.variants.map((variant) => variant.id).filter((id): id is string => Boolean(id)));
        const removedIds = existingVariants
          .map((variant) => variant.id)
          .filter((id) => !submittedExistingIds.has(id));

        if (removedIds.length > 0) {
          await tx.productVariant.updateMany({
            where: {
              id: {
                in: removedIds,
              },
            },
            data: {
              deleted: true,
              deletedDate: new Date(),
            },
          });
        }

        for (const [index, variant] of input.variants.entries()) {
          if (variant.id) {
            await tx.productVariant.update({
              where: {
                id: variant.id,
              },
              data: {
                slug: variant.slug,
                sku: variant.sku,
                barcode: variant.barcode ?? null,
                title: variant.title,
                optionSummary: variant.optionSummary,
                priceOverride: variant.priceOverride ?? null,
                purchasePriceOverride: variant.purchasePriceOverride ?? null,
                compareAtPriceOverride: variant.compareAtPriceOverride ?? null,
                imageUrl: variant.imageUrl ?? null,
                imageUrls: variant.imageUrls ?? [],
                stockOverride: variant.stockOverride ?? null,
                salesEnabled: variant.salesEnabled ?? true,
                isDefault: variant.isDefault ?? index === 0,
                sortOrder: variant.sortOrder ?? index,
                deleted: false,
                deletedDate: null,
              },
            });
            await tx.productVariantAttributeValue.deleteMany({
              where: {
                productVariantId: variant.id,
              },
            });
            if (variant.attributes.length > 0) {
              await tx.productVariantAttributeValue.createMany({
                data: variant.attributes.map((attribute) => ({
                  productVariantId: variant.id!,
                  attributeDefinitionId: attribute.attributeDefinitionId,
                  value: attribute.value,
                })),
              });
            }
            continue;
          }

          await tx.productVariant.create({
            data: {
              productId: input.id,
              slug: variant.slug,
              sku: variant.sku,
              barcode: variant.barcode ?? null,
              title: variant.title,
              optionSummary: variant.optionSummary,
              priceOverride: variant.priceOverride ?? null,
              purchasePriceOverride: variant.purchasePriceOverride ?? null,
              compareAtPriceOverride: variant.compareAtPriceOverride ?? null,
              imageUrl: variant.imageUrl ?? null,
              imageUrls: variant.imageUrls ?? [],
              stockOverride: variant.stockOverride ?? null,
              salesEnabled: variant.salesEnabled ?? true,
              isDefault: variant.isDefault ?? index === 0,
              sortOrder: variant.sortOrder ?? index,
              attributeValues: {
                create: variant.attributes.map((attribute) => ({
                  attributeDefinitionId: attribute.attributeDefinitionId,
                  value: attribute.value,
                })),
              },
            },
          });
        }
      }
    });

    const product = await this.findActiveProductForAdminById(input.id);
    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  }

  async findActiveProductForAdminById(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        brand: true,
        category: true,
        attributeLinks: {
          include: {
            attributeDefinition: true,
          },
        },
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
        primarySupplier: true,
        variants: {
          where: {
            deleted: false,
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            attributeValues: {
              include: {
                attributeDefinition: true,
              },
            },
          },
        },
      },
    });
  }

  async softDeleteProduct(id: string, deletedUserId: string) {
    return prisma.product.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async findActiveProductById(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        description: true,
        price: true,
        compareAtPrice: true,
        productType: true,
        preferredSalesWarehouseId: true,
        preferredPurchaseWarehouseId: true,
      },
    });
  }

  async listBrands() {
    return prisma.brand.findMany({
      where: {
        deleted: false,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async listSuppliers() {
    return prisma.supplier.findMany({
      where: {
        deleted: false,
      },
      include: {
        _count: {
          select: {
            primaryProducts: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async createBrand(input: AdminCreateBrandInput) {
    return prisma.brand.create({
      data: {
        slug: input.slug,
        name: input.name,
        trendyolBrandId: input.trendyolBrandId ?? null,
        pazaramaBrandId: input.pazaramaBrandId ?? null,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async updateBrand(input: AdminUpdateBrandInput) {
    return prisma.brand.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.trendyolBrandId !== undefined ? { trendyolBrandId: input.trendyolBrandId } : {}),
        ...(input.pazaramaBrandId !== undefined ? { pazaramaBrandId: input.pazaramaBrandId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async createSupplier(input: AdminCreateSupplierInput) {
    return prisma.supplier.create({
      data: {
        slug: input.slug,
        name: input.name,
        taxNumber: input.taxNumber ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        defaultPaymentTermDays: input.defaultPaymentTermDays ?? null,
        creditLimit: input.creditLimit != null ? new Prisma.Decimal(input.creditLimit) : null,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            primaryProducts: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async updateSupplier(input: AdminUpdateSupplierInput) {
    return prisma.supplier.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.taxNumber !== undefined ? { taxNumber: input.taxNumber ?? null } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.defaultPaymentTermDays !== undefined ? { defaultPaymentTermDays: input.defaultPaymentTermDays ?? null } : {}),
        ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit != null ? new Prisma.Decimal(input.creditLimit) : null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        _count: {
          select: {
            primaryProducts: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async listAttributeDefinitions() {
    return prisma.productAttributeDefinition.findMany({
      where: {
        deleted: false,
      },
      include: {
        _count: {
          select: {
            productLinks: true,
          },
        },
      },
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });
  }

  async createAttributeDefinition(input: AdminCreateProductAttributeDefinitionInput) {
    return prisma.productAttributeDefinition.create({
      data: {
        slug: input.slug,
        name: input.name,
        displayType: input.displayType ?? "TEXT",
        trendyolAttributeId: input.trendyolAttributeId ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            productLinks: true,
          },
        },
      },
    });
  }

  async updateAttributeDefinition(input: AdminUpdateProductAttributeDefinitionInput) {
    return prisma.productAttributeDefinition.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.displayType !== undefined ? { displayType: input.displayType } : {}),
        ...(input.trendyolAttributeId !== undefined ? { trendyolAttributeId: input.trendyolAttributeId } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        _count: {
          select: {
            productLinks: true,
          },
        },
      },
    });
  }

  async findAttributeDefinitionById(id: string) {
    return prisma.productAttributeDefinition.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        _count: {
          select: {
            productLinks: true,
          },
        },
      },
    });
  }

  async deleteAttributeDefinition(id: string) {
    return prisma.productAttributeDefinition.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        isActive: false,
      },
      include: {
        _count: {
          select: {
            productLinks: true,
          },
        },
      },
    });
  }

  async findActiveAttributeDefinitionsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.productAttributeDefinition.findMany({
      where: {
        id: {
          in: ids,
        },
        deleted: false,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  async listAttributeValueMarketplaceMappings(channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK") {
    return prisma.productAttributeValueMarketplaceMapping.findMany({
      where: {
        channel,
        deleted: false,
      },
      orderBy: [
        { attributeDefinition: { name: "asc" } },
        { localValue: "asc" },
      ],
      include: {
        attributeDefinition: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async listDistinctVariantAttributeValues() {
    const rows = await prisma.productVariantAttributeValue.findMany({
      where: {
        productVariant: {
          deleted: false,
          product: {
            deleted: false,
          },
        },
        attributeDefinition: {
          deleted: false,
          isActive: true,
        },
      },
      select: {
        attributeDefinitionId: true,
        value: true,
        attributeDefinition: {
          select: {
            id: true,
            name: true,
            trendyolAttributeId: true,
          },
        },
      },
      orderBy: [
        { attributeDefinition: { name: "asc" } },
        { value: "asc" },
      ],
    });

    return rows;
  }

  async upsertAttributeValueMarketplaceMapping(input: AdminUpsertProductAttributeValueMarketplaceMappingInput) {
    return prisma.productAttributeValueMarketplaceMapping.upsert({
      where: {
        attributeDefinitionId_channel_localValue: {
          attributeDefinitionId: input.attributeDefinitionId,
          channel: input.channel ?? "TRENDYOL",
          localValue: input.localValue,
        },
      },
      update: {
        externalAttributeValueId: input.externalAttributeValueId ?? null,
        externalAttributeValueName: input.externalAttributeValueName ?? null,
        customAttributeValue: input.customAttributeValue ?? null,
        isActive: input.isActive ?? true,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: {
        attributeDefinitionId: input.attributeDefinitionId,
        channel: input.channel ?? "TRENDYOL",
        localValue: input.localValue,
        externalAttributeValueId: input.externalAttributeValueId ?? null,
        externalAttributeValueName: input.externalAttributeValueName ?? null,
        customAttributeValue: input.customAttributeValue ?? null,
        isActive: input.isActive ?? true,
      },
      include: {
        attributeDefinition: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findActiveBrandById(id: string) {
    return prisma.brand.findFirst({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        trendyolBrandId: true,
        pazaramaBrandId: true,
        isActive: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async findActiveSupplierById(id: string) {
    return prisma.supplier.findFirst({
      where: {
        id,
        deleted: false,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        taxNumber: true,
        email: true,
        phone: true,
        defaultPaymentTermDays: true,
        creditLimit: true,
        isActive: true,
        _count: {
          select: {
            primaryProducts: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async softDeleteSupplier(id: string, deletedUserId: string) {
    return prisma.supplier.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async findActiveCategoryBySlug(slug: string) {
    return prisma.category.findFirst({
      where: {
        slug,
        deleted: false,
      },
      select: {
        id: true,
      },
    });
  }

  async findActiveBrandBySlug(slug: string) {
    return prisma.brand.findFirst({
      where: {
        slug,
        deleted: false,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  async softDeleteBrand(id: string, deletedUserId: string) {
    return prisma.brand.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async findActiveSupplierBySlug(slug: string) {
    return prisma.supplier.findFirst({
      where: {
        slug,
        deleted: false,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  async findWarehouseIdsByCodes(codes: string[]) {
    if (codes.length === 0) {
      return [];
    }

    return prisma.warehouse.findMany({
      where: {
        code: {
          in: codes,
        },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  async listCategories(args: AdminCategoryListQuery) {
    const where = {
      deleted: false,
      ...(args.search
        ? {
            OR: [
              { name: { contains: args.search, mode: "insensitive" as const } },
              { slug: { contains: args.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(args.rootOnly
        ? { parentId: null }
        : args.parentId
          ? { parentId: args.parentId }
          : {}),
      ...(args.hasProducts === "with_products"
        ? {
            products: {
              some: {
                deleted: false,
              },
            },
          }
        : {}),
      ...(args.hasProducts === "without_products"
        ? {
            products: {
              none: {
                deleted: false,
              },
            },
          }
        : {}),
    };

    return prisma.category.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        trendyolCategoryId: true,
        pazaramaCategoryId: true,
        parentId: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
      orderBy:
        args.sort === "name_asc"
          ? { name: "asc" }
          : args.sort === "name_desc"
            ? { name: "desc" }
            : args.sort === "product_count_desc"
              ? { products: { _count: "desc" } }
              : { updatedAt: "desc" },
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 10),
      take: args.pageSize,
    });
  }

  async countCategories(args: Pick<AdminCategoryListQuery, "search" | "parentId" | "rootOnly" | "hasProducts">) {
    return prisma.category.count({
      where: {
        deleted: false,
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: "insensitive" as const } },
                { slug: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(args.rootOnly
          ? { parentId: null }
          : args.parentId
            ? { parentId: args.parentId }
            : {}),
        ...(args.hasProducts === "with_products"
          ? {
              products: {
                some: {
                  deleted: false,
                },
              },
            }
          : {}),
        ...(args.hasProducts === "without_products"
          ? {
              products: {
                none: {
                  deleted: false,
                },
              },
            }
          : {}),
      },
    });
  }

  async createCategory(input: { slug: string; name: string; trendyolCategoryId?: number | null; pazaramaCategoryId?: string | null; parentId?: string | null }) {
    return prisma.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        trendyolCategoryId: input.trendyolCategoryId ?? null,
        pazaramaCategoryId: input.pazaramaCategoryId ?? null,
        parentId: input.parentId ?? null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        trendyolCategoryId: true,
        pazaramaCategoryId: true,
        parentId: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async updateCategory(input: AdminUpdateCategoryInput) {
    return prisma.category.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.trendyolCategoryId !== undefined ? { trendyolCategoryId: input.trendyolCategoryId } : {}),
        ...(input.pazaramaCategoryId !== undefined ? { pazaramaCategoryId: input.pazaramaCategoryId } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        trendyolCategoryId: true,
        pazaramaCategoryId: true,
        parentId: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async softDeleteCategory(id: string, deletedUserId: string) {
    return prisma.category.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async countActiveProductsByCategoryId(categoryId: string) {
    return prisma.product.count({
      where: {
        categoryId,
        deleted: false,
      },
    });
  }

  async findActiveCategoryById(id: string) {
    return prisma.category.findFirst({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        trendyolCategoryId: true,
        pazaramaCategoryId: true,
        parentId: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async listActiveCategoriesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.category.findMany({
      where: {
        id: {
          in: ids,
        },
        deleted: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        trendyolCategoryId: true,
        pazaramaCategoryId: true,
        parentId: true,
        _count: {
          select: {
            products: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
  }

  async listTopProductInteractions(limit: number) {
    return prisma.productInteraction.findMany({
      where: {
        product: {
          deleted: false,
        },
      },
      include: {
        product: true,
      },
      orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });
  }

  async listProductQuestions(args: AdminProductQuestionListQuery) {
    return prisma.productQuestion.findMany({
      where: buildQuestionWhere(args),
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: buildQuestionOrderBy(args),
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 10),
      take: args.pageSize,
    });
  }

  async countProductQuestions(args: AdminProductQuestionListQuery) {
    return prisma.productQuestion.count({
      where: buildQuestionWhere(args),
    });
  }

  async countProductQuestionsByStatus(status: "pending" | "answered") {
    return prisma.productQuestion.count({
      where: {
        deleted: false,
        ...(status === "pending" ? { answer: null } : { answer: { not: null } }),
      },
    });
  }

  async countOverdueProductQuestions(slaHours: number) {
    const threshold = new Date(Date.now() - Math.max(1, slaHours) * 60 * 60 * 1000);

    return prisma.productQuestion.count({
      where: {
        deleted: false,
        answer: null,
        createdAt: {
          lt: threshold,
        },
      },
    });
  }

  async listProductSlugsByQuestionIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const rows = await prisma.productQuestion.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        product: {
          select: {
            slug: true,
          },
        },
      },
    });

    return rows.map((item) => item.product.slug);
  }

  async answerProductQuestion(input: AdminAnswerProductQuestionInput) {
    return prisma.productQuestion.update({
      where: {
        id: input.id,
      },
      data: {
        answer: input.answer,
        answeredBy: input.answeredBy,
        answeredAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async softDeleteProductQuestion(id: string, deletedUserId: string) {
    return prisma.productQuestion.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
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

  async bulkAnswerProductQuestions(ids: string[], answer: string, answeredBy: string) {
    if (ids.length === 0) {
      return { count: 0 };
    }

    return prisma.productQuestion.updateMany({
      where: {
        id: {
          in: ids,
        },
        deleted: false,
      },
      data: {
        answer,
        answeredBy,
        answeredAt: new Date(),
      },
    });
  }

  async bulkSoftDeleteProductQuestions(ids: string[], deletedUserId: string) {
    if (ids.length === 0) {
      return { count: 0 };
    }

    return prisma.productQuestion.updateMany({
      where: {
        id: {
          in: ids,
        },
        deleted: false,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }
}
