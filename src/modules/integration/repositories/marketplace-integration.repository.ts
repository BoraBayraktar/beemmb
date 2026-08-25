import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function toJsonInput(value: Prisma.JsonValue | Record<string, unknown> | null | undefined) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export type MarketplacePackageLineInput = {
  externalLineId: string;
  merchantSku: string | null;
  barcode: string | null;
  productName: string;
  quantity: number;
  unitPrice: number | null;
  currency: string;
  rawPayload: Record<string, unknown>;
};

export type MarketplacePackageInput = {
  channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";
  configId: string;
  externalPackageId: string;
  externalOrderNumber: string;
  packageStatus: string;
  orderDate: Date | null;
  lastModifiedDate: Date | null;
  customerName: string | null;
  customerEmail: string | null;
  shipmentAddress: Record<string, unknown> | null;
  invoiceAddress: Record<string, unknown> | null;
  cargoProviderName: string | null;
  cargoTrackingNumber: string | null;
  externalCargoCompanyId?: string | null;
  cargoSenderNumber?: string | null;
  cargoTrackingLink?: string | null;
  shipmentMethod?: string | null;
  rawPayload: Record<string, unknown>;
  lines: MarketplacePackageLineInput[];
};

export class MarketplaceIntegrationRepository {
  async listConfigs(channel?: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA") {
    return prisma.marketplaceIntegrationConfig.findMany({
      where: {
        ...(channel ? { channel } : {}),
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async listActiveConfigsByChannel(channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA") {
    return prisma.marketplaceIntegrationConfig.findMany({
      where: {
        channel,
        deleted: false,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async listRecentPackages(limit: number, channel?: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA") {
    return prisma.marketplaceOrderPackage.findMany({
      where: {
        ...(channel ? { channel } : {}),
        deleted: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      include: {
        config: {
          select: {
            id: true,
            displayName: true,
            sellerId: true,
            storeFrontCode: true,
          },
        },
        lines: {
          where: {
            deleted: false,
          },
          select: {
            id: true,
            matchStatus: true,
          },
        },
      },
    });
  }

  async findPackageById(id: string) {
    return prisma.marketplaceOrderPackage.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        config: {
          select: {
            id: true,
            displayName: true,
            sellerId: true,
            storeFrontCode: true,
          },
        },
        lines: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                title: true,
                sku: true,
                barcode: true,
                productId: true,
              },
            },
          },
        },
      },
    });
  }

  async findPackageForOutbound(id: string) {
    return prisma.marketplaceOrderPackage.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        config: true,
        lines: {
          where: {
            deleted: false,
          },
          select: {
            externalLineId: true,
            quantity: true,
          },
        },
      },
    });
  }

  async findPackageForSplit(id: string) {
    return prisma.marketplaceOrderPackage.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        config: true,
        lines: {
          where: {
            deleted: false,
          },
          select: {
            id: true,
            externalLineId: true,
            quantity: true,
            productName: true,
          },
        },
      },
    });
  }

  async listPackageStatusJobs(packageId: string) {
    const targetPackage = await prisma.marketplaceOrderPackage.findFirst({
      where: {
        id: packageId,
        deleted: false,
      },
      select: {
        channel: true,
      },
    });

    if (!targetPackage) {
      return [];
    }

    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        channel: targetPackage.channel,
        jobType: "ORDER_STATUS_SYNC",
        entityType: "MARKETPLACE_PACKAGE",
        entityId: packageId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        deadLetter: {
          select: {
            id: true,
            resolved: true,
            resolvedAt: true,
          },
        },
      },
    });
  }

  async listLatestPackageStatusJobs(packageIds: string[]) {
    if (packageIds.length === 0) {
      return [];
    }

    return prisma.integrationSyncJob.findMany({
      where: {
        deleted: false,
        jobType: "ORDER_STATUS_SYNC",
        entityType: "MARKETPLACE_PACKAGE",
        entityId: {
          in: packageIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        deadLetter: {
          select: {
            id: true,
            resolved: true,
            resolvedAt: true,
          },
        },
      },
    });
  }

  async findPackageStatusJob(args: { packageId: string; jobId: string }) {
    const targetPackage = await prisma.marketplaceOrderPackage.findFirst({
      where: {
        id: args.packageId,
        deleted: false,
      },
      select: {
        channel: true,
      },
    });

    if (!targetPackage) {
      return null;
    }

    return prisma.integrationSyncJob.findFirst({
      where: {
        id: args.jobId,
        deleted: false,
        channel: targetPackage.channel,
        jobType: "ORDER_STATUS_SYNC",
        entityType: "MARKETPLACE_PACKAGE",
        entityId: args.packageId,
      },
      select: {
        id: true,
      },
    });
  }

  async upsertConfig(args: {
    id?: string;
    channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";
    displayName: string;
    sellerId: string;
    apiKeyEncrypted?: string;
    apiSecretEncrypted?: string;
    serviceTokenEncrypted?: string | null;
    userAgent: string;
    storeFrontCode?: string | null;
    endpointUrl?: string | null;
    trendyolCargoCompanyId?: number | null;
    trendyolShipmentAddressId?: number | null;
    trendyolReturningAddressId?: number | null;
    trendyolOrigin?: string | null;
    trendyolDimensionalWeight?: number | null;
    environment?: "PRODUCTION" | "STAGE";
    syncWindowMinutes?: number;
    isActive?: boolean;
  }) {
    const data = {
      channel: args.channel,
      displayName: args.displayName,
      sellerId: args.sellerId,
      ...(args.apiKeyEncrypted !== undefined ? { apiKeyEncrypted: args.apiKeyEncrypted } : {}),
      ...(args.apiSecretEncrypted !== undefined ? { apiSecretEncrypted: args.apiSecretEncrypted } : {}),
      ...(args.serviceTokenEncrypted !== undefined ? { serviceTokenEncrypted: args.serviceTokenEncrypted } : {}),
      userAgent: args.userAgent,
      storeFrontCode: args.storeFrontCode ?? null,
      endpointUrl: args.endpointUrl ?? null,
      trendyolCargoCompanyId: args.trendyolCargoCompanyId ?? null,
      trendyolShipmentAddressId: args.trendyolShipmentAddressId ?? null,
      trendyolReturningAddressId: args.trendyolReturningAddressId ?? null,
      trendyolOrigin: args.trendyolOrigin ?? null,
      trendyolDimensionalWeight: args.trendyolDimensionalWeight ?? null,
      environment: args.environment ?? "PRODUCTION",
      syncWindowMinutes: args.syncWindowMinutes ?? 60,
      isActive: args.isActive ?? true,
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    };

    if (args.id) {
      return prisma.marketplaceIntegrationConfig.update({
        where: {
          id: args.id,
        },
        data,
      });
    }

    if (!args.apiKeyEncrypted || !args.apiSecretEncrypted) {
      throw new Error("MARKETPLACE_CONFIG_SECRET_REQUIRED");
    }

    return prisma.marketplaceIntegrationConfig.create({
      data: {
        ...data,
        apiKeyEncrypted: args.apiKeyEncrypted,
        apiSecretEncrypted: args.apiSecretEncrypted,
      },
    });
  }

  async findActiveConfigById(id: string) {
    return prisma.marketplaceIntegrationConfig.findFirst({
      where: {
        id,
        deleted: false,
        isActive: true,
      },
    });
  }

  async findProductMatches(args: { merchantSku: string | null; barcode: string | null }) {
    const terms = [args.merchantSku, args.barcode]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item));

    if (terms.length === 0) {
      return {
        products: [],
        variants: [],
      };
    }

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: {
          deleted: false,
          OR: [
            { sku: { in: terms } },
            { barcode: { in: terms } },
          ],
        },
        select: {
          id: true,
          sku: true,
          barcode: true,
        },
      }),
      prisma.productVariant.findMany({
        where: {
          deleted: false,
          OR: [
            { sku: { in: terms } },
            { barcode: { in: terms } },
          ],
        },
        select: {
          id: true,
          productId: true,
          sku: true,
          barcode: true,
        },
      }),
    ]);

    return {
      products,
      variants,
    };
  }

  async findProductTarget(args: { productId: string; productVariantId?: string | null }) {
    if (args.productVariantId) {
      const variant = await prisma.productVariant.findFirst({
        where: {
          id: args.productVariantId,
          deleted: false,
          productId: args.productId,
          product: {
            deleted: false,
          },
        },
        select: {
          id: true,
          productId: true,
        },
      });

      return variant ? { productId: variant.productId, productVariantId: variant.id } : null;
    }

    const product = await prisma.product.findFirst({
      where: {
        id: args.productId,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    return product ? { productId: product.id, productVariantId: null } : null;
  }

  async findProductStockSyncTarget(args: { channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA"; productId: string; warehouseCode?: string | null }) {
    const product = await prisma.product.findFirst({
      where: {
        id: args.productId,
        deleted: false,
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        status: true,
        salesEnabled: true,
        inventoryIntegrationMappings: {
          where: {
            channel: args.channel,
            deleted: false,
            ...(args.warehouseCode
              ? { externalWarehouseCode: args.warehouseCode }
              : {}),
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            externalProductId: true,
            externalSku: true,
            externalWarehouseCode: true,
            warehouseId: true,
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
                warehouseId: true,
                onHand: true,
                reserved: true,
              },
            },
          },
        },
      },
    });

    return product;
  }

  async findProductSyncPreflightTarget(productId: string) {
    return prisma.product.findFirst({
      where: {
        id: productId,
        deleted: false,
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        description: true,
        imageUrl: true,
        imageUrls: true,
        status: true,
        salesEnabled: true,
        productType: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        currency: true,
        vatRate: true,
        category: {
          select: {
            id: true,
            name: true,
            trendyolCategoryId: true,
            pazaramaCategoryId: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            trendyolBrandId: true,
            pazaramaBrandId: true,
          },
        },
        variants: {
          where: {
            deleted: false,
          },
          select: {
            id: true,
            sku: true,
            barcode: true,
            title: true,
            priceOverride: true,
            compareAtPriceOverride: true,
            stockOverride: true,
            imageUrl: true,
            imageUrls: true,
            salesEnabled: true,
            attributeValues: {
              select: {
                value: true,
                attributeDefinition: {
                  select: {
                    id: true,
                    name: true,
                    trendyolAttributeId: true,
                    marketplaceValueMappings: {
                      where: {
                        channel: {
                          in: ["TRENDYOL", "PAZARAMA"],
                        },
                        deleted: false,
                        isActive: true,
                      },
                      select: {
                        channel: true,
                        localValue: true,
                        externalAttributeValueId: true,
                        externalAttributeValueName: true,
                        customAttributeValue: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateLineMatch(args: { lineId: string; productId: string; productVariantId: string | null }) {
    const line = await prisma.marketplaceOrderLine.update({
      where: {
        id: args.lineId,
      },
      data: {
        productId: args.productId,
        productVariantId: args.productVariantId,
        matchStatus: "MATCHED",
      },
      select: {
        packageId: true,
      },
    });

    const remaining = await prisma.marketplaceOrderLine.count({
      where: {
        packageId: line.packageId,
        deleted: false,
        matchStatus: { in: ["UNMATCHED", "AMBIGUOUS"] },
      },
    });

    await prisma.marketplaceOrderPackage.update({
      where: {
        id: line.packageId,
      },
      data: {
        importStatus: remaining === 0 ? "READY_FOR_ORDER" : "NEEDS_REVIEW",
      },
    });

    return this.findPackageById(line.packageId);
  }

  async ignoreLine(args: { lineId: string }) {
    const line = await prisma.marketplaceOrderLine.update({
      where: {
        id: args.lineId,
      },
      data: {
        productId: null,
        productVariantId: null,
        matchStatus: "IGNORED",
      },
      select: {
        packageId: true,
      },
    });

    const remaining = await prisma.marketplaceOrderLine.count({
      where: {
        packageId: line.packageId,
        deleted: false,
        matchStatus: { in: ["UNMATCHED", "AMBIGUOUS"] },
      },
    });

    await prisma.marketplaceOrderPackage.update({
      where: {
        id: line.packageId,
      },
      data: {
        importStatus: remaining === 0 ? "READY_FOR_ORDER" : "NEEDS_REVIEW",
      },
    });

    return this.findPackageById(line.packageId);
  }

  async markPackageOrderCreated(args: { packageId: string; orderNumber: string }) {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: args.orderNumber,
      },
      select: {
        id: true,
      },
    });

    return prisma.marketplaceOrderPackage.update({
      where: {
        id: args.packageId,
      },
      data: {
        importStatus: "ORDER_CREATED",
        matchedOrderId: order?.id ?? null,
      },
    });
  }

  async updatePackageExternalStatus(args: { packageId: string; packageStatus: string }) {
    return prisma.marketplaceOrderPackage.update({
      where: {
        id: args.packageId,
      },
      data: {
        packageStatus: args.packageStatus,
      },
    });
  }

  async upsertPackage(input: MarketplacePackageInput) {
    const lineMatches = await Promise.all(input.lines.map(async (line) => {
      const matches = await this.findProductMatches({
        merchantSku: line.merchantSku,
        barcode: line.barcode,
      });
      const matchCount = matches.products.length + matches.variants.length;
      const variant = matches.variants[0];
      const product = matches.products[0];

      return {
        line,
        productId: variant?.productId ?? product?.id ?? null,
        productVariantId: variant?.id ?? null,
        matchStatus: matchCount === 1 ? "MATCHED" as const : matchCount > 1 ? "AMBIGUOUS" as const : "UNMATCHED" as const,
      };
    }));

    const importStatus = lineMatches.every((item) => item.matchStatus === "MATCHED")
      ? "READY_FOR_ORDER"
      : "NEEDS_REVIEW";

    const createdPackage = await prisma.marketplaceOrderPackage.upsert({
      where: {
        channel_configId_externalPackageId: {
          channel: input.channel,
          configId: input.configId,
          externalPackageId: input.externalPackageId,
        },
      },
      update: {
        externalOrderNumber: input.externalOrderNumber,
        packageStatus: input.packageStatus,
        importStatus,
        orderDate: input.orderDate,
        lastModifiedDate: input.lastModifiedDate,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        shipmentAddress: toJsonInput(input.shipmentAddress),
        invoiceAddress: toJsonInput(input.invoiceAddress),
        cargoProviderName: input.cargoProviderName,
        cargoTrackingNumber: input.cargoTrackingNumber,
        externalCargoCompanyId: input.externalCargoCompanyId ?? null,
        cargoSenderNumber: input.cargoSenderNumber ?? null,
        cargoTrackingLink: input.cargoTrackingLink ?? null,
        shipmentMethod: input.shipmentMethod ?? null,
        rawPayload: toJsonInput(input.rawPayload),
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: {
        channel: input.channel,
        configId: input.configId,
        externalPackageId: input.externalPackageId,
        externalOrderNumber: input.externalOrderNumber,
        packageStatus: input.packageStatus,
        importStatus,
        orderDate: input.orderDate,
        lastModifiedDate: input.lastModifiedDate,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        shipmentAddress: toJsonInput(input.shipmentAddress),
        invoiceAddress: toJsonInput(input.invoiceAddress),
        cargoProviderName: input.cargoProviderName,
        cargoTrackingNumber: input.cargoTrackingNumber,
        externalCargoCompanyId: input.externalCargoCompanyId ?? null,
        cargoSenderNumber: input.cargoSenderNumber ?? null,
        cargoTrackingLink: input.cargoTrackingLink ?? null,
        shipmentMethod: input.shipmentMethod ?? null,
        rawPayload: toJsonInput(input.rawPayload),
      },
      select: {
        id: true,
        importStatus: true,
      },
    });

    await Promise.all(lineMatches.map((item) => prisma.marketplaceOrderLine.upsert({
      where: {
        packageId_externalLineId: {
          packageId: createdPackage.id,
          externalLineId: item.line.externalLineId,
        },
      },
      update: {
        merchantSku: item.line.merchantSku,
        barcode: item.line.barcode,
        productName: item.line.productName,
        quantity: item.line.quantity,
        unitPrice: item.line.unitPrice === null ? null : new Prisma.Decimal(item.line.unitPrice),
        currency: item.line.currency,
        matchStatus: item.matchStatus,
        productId: item.productId,
        productVariantId: item.productVariantId,
        rawPayload: toJsonInput(item.line.rawPayload),
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: {
        packageId: createdPackage.id,
        externalLineId: item.line.externalLineId,
        merchantSku: item.line.merchantSku,
        barcode: item.line.barcode,
        productName: item.line.productName,
        quantity: item.line.quantity,
        unitPrice: item.line.unitPrice === null ? null : new Prisma.Decimal(item.line.unitPrice),
        currency: item.line.currency,
        matchStatus: item.matchStatus,
        productId: item.productId,
        productVariantId: item.productVariantId,
        rawPayload: toJsonInput(item.line.rawPayload),
      },
    })));

    return createdPackage;
  }

  async markConfigSynced(args: { id: string; cursorAt: Date | null; syncedAt: Date }) {
    return prisma.marketplaceIntegrationConfig.update({
      where: {
        id: args.id,
      },
      data: {
        lastSuccessfulSyncAt: args.syncedAt,
        lastCursorAt: args.cursorAt ?? args.syncedAt,
      },
    });
  }
}
