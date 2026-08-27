import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { UpsertStorefrontItemInput } from "@/modules/storefront/contracts/storefront.contract";

const storefrontItemInclude = {
  product: {
    include: {
      category: true,
    },
  },
  category: {
    include: {
      products: {
        where: {
          deleted: false,
        },
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 1,
      },
    },
  },
};

export class StorefrontRepository {
  async listHomeActiveItems(now = new Date()) {
    return prisma.storefrontItem.findMany({
      where: {
        deleted: false,
        OR: [
          {
            startsAt: null,
          },
          {
            startsAt: {
              lte: now,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gte: now,
                },
              },
            ],
          },
        ],
      },
      include: storefrontItemInclude,
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async listAdminItems() {
    return prisma.storefrontItem.findMany({
      where: {
        deleted: false,
      },
      include: storefrontItemInclude,
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async upsertItem(input: UpsertStorefrontItemInput) {
    if (input.id) {
      return prisma.storefrontItem.update({
        where: { id: input.id },
        data: {
          section: input.section,
          variant: input.variant,
          targetType: input.targetType ?? null,
          productId: input.targetType === "PRODUCT" ? input.productId ?? null : null,
          categoryId: input.targetType === "CATEGORY" ? input.categoryId ?? null : null,
          titleTr: input.titleTr,
          titleEn: input.titleEn,
          descriptionTr: input.descriptionTr,
          descriptionEn: input.descriptionEn,
          sortOrder: input.sortOrder,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
        include: storefrontItemInclude,
      });
    }

    return prisma.storefrontItem.create({
      data: {
        tenantId: requireTenantId(),
        section: input.section,
        variant: input.variant,
        targetType: input.targetType ?? null,
        productId: input.targetType === "PRODUCT" ? input.productId ?? null : null,
        categoryId: input.targetType === "CATEGORY" ? input.categoryId ?? null : null,
        titleTr: input.titleTr,
        titleEn: input.titleEn,
        descriptionTr: input.descriptionTr,
        descriptionEn: input.descriptionEn,
        sortOrder: input.sortOrder,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
      include: storefrontItemInclude,
    });
  }

  async softDeleteItem(id: string, deletedUserId: string) {
    return prisma.storefrontItem.update({
      where: { id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }
}
