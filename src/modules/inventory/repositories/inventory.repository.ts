import { Prisma } from "@prisma/client";

import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type {
  AdminInventoryExportHistoryItem,
  AdminInventoryListPreferences,
  AdminCreateStockCountInput,
  AdminCreateWarehouseInput,
  AdminUpdateStockCountLineInput,
  AdminUpdateWarehouseInput,
  BulkAssignPreferredWarehouseRowInput,
  BulkStockCountLineRowInput,
} from "@/modules/inventory/contracts/inventory.contract";

type SyncInventoryStateArgs = {
  productId: string;
  variantId?: string;
  sku: string;
  warehouseCode?: string;
  targetOnHandStock?: number;
  reorderPoint?: number;
  safetyStock?: number;
  note?: string;
};

type TransferInventoryArgs = {
  productId: string;
  variantId?: string;
  sku: string;
  fromWarehouseCode: string;
  toWarehouseCode: string;
  quantity: number;
  note?: string;
};

type RecordInventoryMovementArgs = {
  productId: string;
  variantId?: string;
  sku: string;
  warehouseCode: string;
  quantity: number;
  type: "PURCHASE_RECEIPT" | "DAMAGE_WRITE_OFF";
  note?: string;
  documentType?: "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";
  sourceDocumentNumber?: string;
  sourceDocumentDate?: Date;
  sourceDocumentSupplier?: string;
  sourceDocumentReference?: string;
  externalSystemStatus?: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
  unitCost?: number | null;
};

type UpsertInventoryIntegrationMappingArgs = {
  channel: "TRENDYOL" | "N11" | "HEPSIBURADA";
  externalProductId?: string | null;
  externalSku?: string | null;
  externalWarehouseCode?: string | null;
  productId: string;
  warehouseCode?: string | null;
  allowInboundUpdates: boolean;
};

type CreateExternalStockEventArgs = {
  channel: "TRENDYOL" | "N11" | "HEPSIBURADA";
  eventKey: string;
  eventType: "SNAPSHOT_ON_HAND" | "SNAPSHOT_AVAILABLE";
  externalProductId?: string | null;
  externalSku?: string | null;
  externalWarehouseCode?: string | null;
  quantity: number;
  reference?: string | null;
  note?: string | null;
  payload?: Prisma.InputJsonValue;
};

export class InventoryRepository {
  private readonly serializableRetryCount = 3;

  private async resolveInventoryTarget(
    tx: PrismaTransactionClient,
    args: { productId: string; variantId?: string },
  ) {
    const product = await tx.product.findFirst({
      where: {
        id: args.productId,
        deleted: false,
      },
      select: {
        id: true,
        sku: true,
        stock: true,
        purchasePrice: true,
        inventoryItem: {
          select: {
            id: true,
            skuSnapshot: true,
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                },
              },
              select: {
                id: true,
                onHand: true,
                reserved: true,
                reorderPoint: true,
                safetyStock: true,
                warehouseId: true,
                warehouse: {
                  select: {
                    id: true,
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new Error(`PRODUCT_NOT_FOUND:${args.productId}`);
    }

    const variant = args.variantId
      ? await tx.productVariant.findFirst({
          where: {
            id: args.variantId,
            productId: product.id,
            deleted: false,
          },
          select: {
            id: true,
            sku: true,
            purchasePriceOverride: true,
            inventoryItem: {
              select: {
                id: true,
                skuSnapshot: true,
                inventoryLevels: {
                  where: {
                    warehouse: {
                      isActive: true,
                    },
                  },
                  select: {
                    id: true,
                    onHand: true,
                    reserved: true,
                    reorderPoint: true,
                    safetyStock: true,
                    warehouseId: true,
                    warehouse: {
                      select: {
                        id: true,
                        isDefault: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : null;

    if (args.variantId && !variant) {
      throw new Error(`PRODUCT_VARIANT_NOT_FOUND:${args.variantId}`);
    }

    return {
      product,
      variant,
      inventoryItem: variant?.inventoryItem ?? product.inventoryItem ?? null,
      inventoryOwner: variant ? "VARIANT" as const : "PRODUCT" as const,
    };
  }

  private toAvailableStock(onHand: number, reserved: number) {
    return Math.max(0, onHand - reserved);
  }

  private async runSerializableTransaction<T>(
    operation: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.serializableRetryCount; attempt += 1) {
      try {
        return await prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === "P2034"
          && attempt < this.serializableRetryCount
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("SERIALIZABLE_TRANSACTION_FAILED");
  }

  private async createInventoryTransaction(
    tx: PrismaTransactionClient,
    args: {
      type: "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
      reference?: string | null;
      sourceDocumentType?: string | null;
      sourceDocumentId?: string | null;
      sourceDocumentNumber?: string | null;
      sourceDocumentUrl?: string | null;
      sourceDocumentDate?: Date | null;
      externalReference?: string | null;
      externalSystemStatus?: string | null;
      counterpartyName?: string | null;
      note?: string | null;
    },
  ) {
    const transactionNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return tx.inventoryTransaction.create({
      data: {
        tenantId: requireTenantId(),
        transactionNumber,
        type: args.type,
        reference: args.reference ?? null,
        sourceDocumentType: args.sourceDocumentType ?? null,
        sourceDocumentId: args.sourceDocumentId ?? null,
        sourceDocumentNumber: args.sourceDocumentNumber ?? null,
        sourceDocumentUrl: args.sourceDocumentUrl ?? null,
        sourceDocumentDate: args.sourceDocumentDate ?? null,
        externalReference: args.externalReference ?? null,
        externalSystemStatus: args.externalSystemStatus ?? null,
        counterpartyName: args.counterpartyName ?? null,
        note: args.note ?? null,
      },
      select: {
        id: true,
        transactionNumber: true,
      },
    });
  }

  // Product.stock is a legacy summary. Aggregate truth always comes from active inventory levels.
  private async recalculateProductStock(tx: PrismaTransactionClient, productId: string) {
    const activeLevels = await tx.inventoryLevel.findMany({
      where: {
        inventoryItem: {
          OR: [
            { productId },
            { productVariant: { productId } },
          ],
        },
        warehouse: {
          isActive: true,
        },
      },
      select: {
        onHand: true,
        reserved: true,
      },
    });

    const availableStock = activeLevels.reduce((sum, level) => sum + this.toAvailableStock(level.onHand, level.reserved), 0);

    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: availableStock,
      },
    });
  }

  async listInventoryOverview(args: { search?: string; warehouseCode?: string }) {
    return prisma.product.findMany({
      where: {
        deleted: false,
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: "insensitive" as const } },
                { slug: { contains: args.search, mode: "insensitive" as const } },
                { sku: { contains: args.search, mode: "insensitive" as const } },
                { barcode: { contains: args.search, mode: "insensitive" as const } },
                {
                  variants: {
                    some: {
                      deleted: false,
                      OR: [
                        { title: { contains: args.search, mode: "insensitive" as const } },
                        { sku: { contains: args.search, mode: "insensitive" as const } },
                        { barcode: { contains: args.search, mode: "insensitive" as const } },
                        { optionSummary: { contains: args.search, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        imageUrl: true,
        currency: true,
        barcode: true,
        unitType: true,
        productType: true,
        price: true,
        purchasePrice: true,
        compareAtPrice: true,
        stock: true,
        preferredSalesWarehouse: {
          select: {
            code: true,
          },
        },
        preferredPurchaseWarehouse: {
          select: {
            code: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            skuSnapshot: true,
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                  ...(args.warehouseCode
                    ? {
                        code: args.warehouseCode,
                      }
                    : {}),
                },
              },
              select: {
                onHand: true,
                reserved: true,
                reorderPoint: true,
                safetyStock: true,
                warehouse: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
        variants: {
          where: {
            deleted: false,
          },
          orderBy: [
            { isDefault: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            id: true,
            sku: true,
            title: true,
            optionSummary: true,
            barcode: true,
            imageUrl: true,
            priceOverride: true,
            purchasePriceOverride: true,
            compareAtPriceOverride: true,
            inventoryItem: {
              select: {
                id: true,
                skuSnapshot: true,
                inventoryLevels: {
                  where: {
                    warehouse: {
                      isActive: true,
                      ...(args.warehouseCode
                        ? {
                            code: args.warehouseCode,
                          }
                        : {}),
                    },
                  },
                  select: {
                    onHand: true,
                    reserved: true,
                    reorderPoint: true,
                    safetyStock: true,
                    warehouse: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        isDefault: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async listInventoryOverviewMovements(inventoryItemIds: string[], movementTake: number) {
    if (inventoryItemIds.length === 0) {
      return [];
    }

    return prisma.inventoryMovement.findMany({
      where: {
        inventoryItemId: {
          in: inventoryItemIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        inventoryItemId: true,
        warehouseId: true,
        createdAt: true,
        type: true,
        quantity: true,
        note: true,
        metadata: true,
      },
      take: Math.max(inventoryItemIds.length * movementTake, movementTake),
    });
  }

  async findInventoryTarget(args: { productId: string; variantId?: string }) {
    const product = await prisma.product.findFirst({
      where: {
        id: args.productId,
        deleted: false,
      },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        imageUrl: true,
        currency: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        inventoryItem: {
          select: {
            id: true,
            skuSnapshot: true,
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                },
              },
              select: {
                onHand: true,
                reserved: true,
                warehouse: {
                  select: {
                    id: true,
                    code: true,
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    const variant = args.variantId
      ? await prisma.productVariant.findFirst({
          where: {
            id: args.variantId,
            productId: product.id,
            deleted: false,
          },
          select: {
            id: true,
            sku: true,
            title: true,
            priceOverride: true,
            compareAtPriceOverride: true,
            imageUrl: true,
            inventoryItem: {
              select: {
                id: true,
                skuSnapshot: true,
                inventoryLevels: {
                  where: {
                    warehouse: {
                      isActive: true,
                    },
                  },
                  select: {
                    onHand: true,
                    reserved: true,
                    warehouse: {
                      select: {
                        id: true,
                        code: true,
                        isDefault: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : null;

    return {
      ...product,
      variants: variant ? [variant] : [],
    };
  }

  async createInventoryExportHistory(input: {
    actorUserId?: string | null;
    total: number;
    filters: AdminInventoryExportHistoryItem["filters"];
  }) {
    const exportHistoryDelegate = (prisma as typeof prisma & {
      inventoryExportHistory: {
        create: typeof prisma.auditLog.create;
      };
    }).inventoryExportHistory;

    if (typeof exportHistoryDelegate === "undefined") {
      return null;
    }

    return exportHistoryDelegate.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        total: input.total,
        search: input.filters.search ?? null,
        stockStatusFilter: input.filters.stockStatusFilter ?? null,
        reservationFilter: input.filters.reservationFilter ?? null,
        warehouseFilter: input.filters.warehouseFilter ?? null,
        movementTypeFilter: input.filters.movementTypeFilter ?? null,
      },
    });
  }

  async listInventoryExportHistories(limit: number) {
    const exportHistoryDelegate = (prisma as typeof prisma & {
      inventoryExportHistory: {
        findMany: typeof prisma.auditLog.findMany;
      };
    }).inventoryExportHistory;

    if (typeof exportHistoryDelegate === "undefined") {
      return [];
    }

    return exportHistoryDelegate.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async listActiveProductInventoryByIds(productIds: string[]) {
    return prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        deleted: false,
      },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        imageUrl: true,
        currency: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        inventoryItem: {
          select: {
            id: true,
            inventoryLevels: {
              where: {
                warehouse: {
                  isActive: true,
                },
              },
              select: {
                onHand: true,
                reserved: true,
                reorderPoint: true,
                safetyStock: true,
                warehouse: {
                  select: {
                    code: true,
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async listInventoryTransactions(args: {
    search?: string;
    type?: "all" | "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
    warehouseCode?: string;
    sku?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    return prisma.inventoryTransaction.findMany({
      where: {
        ...(args.type && args.type !== "all" ? { type: args.type } : {}),
        ...(args.startDate || args.endDate
          ? {
              createdAt: {
                ...(args.startDate ? { gte: args.startDate } : {}),
                ...(args.endDate ? { lte: args.endDate } : {}),
              },
            }
          : {}),
        ...((args.warehouseCode || args.sku)
          ? {
              lines: {
                some: {
                  ...(args.warehouseCode
                    ? {
                        OR: [
                          { fromWarehouse: { code: args.warehouseCode } },
                          { toWarehouse: { code: args.warehouseCode } },
                        ],
                      }
                    : {}),
                  ...(args.sku
                    ? {
                        inventoryItem: {
                          skuSnapshot: {
                            contains: args.sku,
                            mode: "insensitive" as const,
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
        ...(args.search
          ? {
              OR: [
                { transactionNumber: { contains: args.search, mode: "insensitive" as const } },
                { reference: { contains: args.search, mode: "insensitive" as const } },
                { note: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 10),
      take: args.pageSize ?? 10,
      include: {
        purchaseReceipt: {
          select: {
            id: true,
            receiptNumber: true,
            receiptDate: true,
            externalReference: true,
            supplierName: true,
            lines: {
              select: {
                productId: true,
                productVariantId: true,
                unitCost: true,
                lineTotal: true,
              },
            },
          },
        },
        lines: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            inventoryItem: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                productVariant: {
                  select: {
                    id: true,
                    sku: true,
                    title: true,
                  },
                },
              },
            },
            fromWarehouse: {
              select: {
                code: true,
              },
            },
            toWarehouse: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async countInventoryTransactions(args?: {
    search?: string;
    type?: "all" | "MANUAL_ADJUSTMENT" | "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "STOCK_COUNT";
    warehouseCode?: string;
    sku?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return prisma.inventoryTransaction.count({
      where: {
        ...(args?.type && args.type !== "all" ? { type: args.type } : {}),
        ...(args?.startDate || args?.endDate
          ? {
              createdAt: {
                ...(args?.startDate ? { gte: args.startDate } : {}),
                ...(args?.endDate ? { lte: args.endDate } : {}),
              },
            }
          : {}),
        ...((args?.warehouseCode || args?.sku)
          ? {
              lines: {
                some: {
                  ...(args?.warehouseCode
                    ? {
                        OR: [
                          { fromWarehouse: { code: args.warehouseCode } },
                          { toWarehouse: { code: args.warehouseCode } },
                        ],
                      }
                    : {}),
                  ...(args?.sku
                    ? {
                        inventoryItem: {
                          skuSnapshot: {
                            contains: args.sku,
                            mode: "insensitive" as const,
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
        ...(args?.search
          ? {
              OR: [
                { transactionNumber: { contains: args.search, mode: "insensitive" as const } },
                { reference: { contains: args.search, mode: "insensitive" as const } },
                { note: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    });
  }

  async listWarehouses() {
    return prisma.warehouse.findMany({
      where: { deleted: false },
      orderBy: [
        { isDefault: "desc" },
        { priority: "asc" },
        { code: "asc" },
      ],
      include: {
        _count: {
          select: {
            inventoryLevels: true,
          },
        },
      },
    });
  }

  async findWarehouseById(id: string) {
    return prisma.warehouse.findFirst({
      where: {
        id,
        isActive: true,
        deleted: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isDefault: true,
      },
    });
  }

  async softDeleteWarehouse(input: { id: string; deletedUserId: string }) {
    return prisma.warehouse.update({
      where: { id: input.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
        isActive: false,
      },
    });
  }

  async softDeleteInventoryItem(input: { id: string; deletedUserId: string }) {
    return prisma.inventoryItem.update({
      where: { id: input.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
      },
    });
  }

  async softDeletePurchaseReceipt(input: { id: string; deletedUserId: string }) {
    return prisma.purchaseReceipt.update({
      where: { id: input.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.deletedUserId,
      },
    });
  }

  async findProductsBySkus(skus: string[]) {
    return prisma.product.findMany({
      where: {
        sku: {
          in: skus,
        },
        deleted: false,
      },
      select: {
        id: true,
        sku: true,
      },
    });
  }

  async listInventoryIntegrationMappings() {
    return prisma.inventoryIntegrationMapping.findMany({
      where: {
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async upsertInventoryIntegrationMapping(args: UpsertInventoryIntegrationMappingArgs) {
    const warehouse = args.warehouseCode
      ? await prisma.warehouse.findFirst({
          where: {
            code: args.warehouseCode,
            isActive: true,
          },
          select: {
            id: true,
          },
        })
      : null;

    const existing = await prisma.inventoryIntegrationMapping.findFirst({
      where: {
        deleted: false,
        channel: args.channel,
        externalProductId: args.externalProductId ?? null,
        externalSku: args.externalSku ?? null,
        externalWarehouseCode: args.externalWarehouseCode ?? null,
      },
      select: {
        id: true,
      },
    });

    const data = {
      channel: args.channel,
      externalProductId: args.externalProductId ?? null,
      externalSku: args.externalSku ?? null,
      externalWarehouseCode: args.externalWarehouseCode ?? null,
      productId: args.productId,
      warehouseId: warehouse?.id ?? null,
      allowInboundUpdates: args.allowInboundUpdates,
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    };

    return existing
      ? prisma.inventoryIntegrationMapping.update({
          where: {
            id: existing.id,
          },
          data,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        })
      : prisma.inventoryIntegrationMapping.create({
          data,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        });
  }

  async createExternalStockEvent(args: CreateExternalStockEventArgs) {
    const existing = await prisma.externalStockEvent.findFirst({
      where: {
        eventKey: args.eventKey,
      },
      include: {
        product: {
          select: {
            id: true,
          },
        },
        warehouse: {
          select: {
            id: true,
          },
        },
      },
    });

    if (existing) {
      return {
        event: existing,
        duplicate: true,
      };
    }

    const event = await prisma.externalStockEvent.create({
      data: {
        tenantId: requireTenantId(),
        channel: args.channel,
        eventKey: args.eventKey,
        eventType: args.eventType,
        externalProductId: args.externalProductId ?? null,
        externalSku: args.externalSku ?? null,
        externalWarehouseCode: args.externalWarehouseCode ?? null,
        quantity: args.quantity,
        reference: args.reference ?? null,
        note: args.note ?? null,
        payload: args.payload ?? Prisma.JsonNull,
      },
      include: {
        product: {
          select: {
            id: true,
          },
        },
        warehouse: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      event,
      duplicate: false,
    };
  }

  async findInventoryIntegrationMapping(args: {
    channel: "TRENDYOL" | "N11" | "HEPSIBURADA";
    externalProductId?: string | null;
    externalSku?: string | null;
    externalWarehouseCode?: string | null;
  }) {
    return prisma.inventoryIntegrationMapping.findFirst({
      where: {
        deleted: false,
        channel: args.channel,
        OR: [
          ...(args.externalProductId
            ? [{
                externalProductId: args.externalProductId,
                externalWarehouseCode: args.externalWarehouseCode ?? null,
              }]
            : []),
          ...(args.externalSku
            ? [{
                externalSku: args.externalSku,
                externalWarehouseCode: args.externalWarehouseCode ?? null,
              }]
            : []),
          ...(args.externalProductId && args.externalWarehouseCode
            ? [{
                externalProductId: args.externalProductId,
              }]
            : []),
          ...(args.externalSku && args.externalWarehouseCode
            ? [{
                externalSku: args.externalSku,
              }]
            : []),
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            inventoryItem: {
              select: {
                id: true,
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
                    warehouse: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        isDefault: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async markExternalStockEventApplied(args: {
    eventId: string;
    mappingId: string;
    productId: string;
    warehouseId: string;
    appliedOnHand: number;
    appliedAvailable: number;
  }) {
    return prisma.externalStockEvent.update({
      where: {
        id: args.eventId,
      },
      data: {
        status: "APPLIED",
        mappingId: args.mappingId,
        productId: args.productId,
        warehouseId: args.warehouseId,
        appliedOnHand: args.appliedOnHand,
        appliedAvailable: args.appliedAvailable,
        errorMessage: null,
        processedAt: new Date(),
      },
    });
  }

  async markExternalStockEventFailed(args: {
    eventId: string;
    mappingId?: string | null;
    productId?: string | null;
    warehouseId?: string | null;
    errorMessage: string;
  }) {
    return prisma.externalStockEvent.update({
      where: {
        id: args.eventId,
      },
      data: {
        status: "FAILED",
        mappingId: args.mappingId ?? null,
        productId: args.productId ?? null,
        warehouseId: args.warehouseId ?? null,
        errorMessage: args.errorMessage,
        processedAt: new Date(),
      },
    });
  }

  async listRecentExternalStockEvents(limit: number) {
    return prisma.externalStockEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async assignPreferredSalesWarehouses(rows: BulkAssignPreferredWarehouseRowInput[]) {
    return prisma.$transaction(async (tx) => {
      const skuList = rows.map((row) => row.sku);
      const warehouseCodes = Array.from(new Set(rows.map((row) => row.preferredSalesWarehouseCode)));
      const [products, warehouses] = await Promise.all([
        tx.product.findMany({
          where: {
            sku: {
              in: skuList,
            },
            deleted: false,
          },
          select: {
            id: true,
            sku: true,
          },
        }),
        tx.warehouse.findMany({
          where: {
            code: {
              in: warehouseCodes,
            },
            isActive: true,
          },
          select: {
            id: true,
            code: true,
          },
        }),
      ]);

      const productMap = new Map(products.map((product) => [product.sku, product]));
      const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.code, warehouse]));

      for (const row of rows) {
        const product = productMap.get(row.sku);
        const warehouse = warehouseMap.get(row.preferredSalesWarehouseCode);

        if (!product || !warehouse) {
          continue;
        }

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            preferredSalesWarehouseId: warehouse.id,
          },
        });
      }
    });
  }

  async createWarehouse(input: AdminCreateWarehouseInput) {
    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.warehouse.updateMany({
          where: {
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.warehouse.create({
        data: {
          tenantId: requireTenantId(),
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          address: input.address ?? null,
          contactName: input.contactName ?? null,
          contactPhone: input.contactPhone ?? null,
          priority: input.priority ?? 100,
          isActive: input.isActive ?? true,
          isDefault: input.isDefault ?? false,
        },
        include: {
          _count: {
            select: {
              inventoryLevels: true,
            },
          },
        },
      });
    });
  }

  async updateWarehouse(input: AdminUpdateWarehouseInput) {
    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.warehouse.updateMany({
          where: {
            isDefault: true,
            NOT: {
              id: input.id,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.warehouse.update({
        where: {
          id: input.id,
        },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
        include: {
          _count: {
            select: {
              inventoryLevels: true,
            },
          },
        },
      });
    });
  }

  async syncProductInventoryState(args: SyncInventoryStateArgs) {
    return this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      const target = await this.resolveInventoryTarget(tx, args);
      const { product, variant, inventoryItem, inventoryOwner } = target;

      let warehouse = args.warehouseCode
        ? await tx.warehouse.findFirst({
            where: {
              code: args.warehouseCode,
              isActive: true,
            },
            select: {
              id: true,
            },
          })
        : await tx.warehouse.findFirst({
            where: {
              isActive: true,
              isDefault: true,
            },
            select: {
              id: true,
            },
          });

      if (!warehouse && args.warehouseCode) {
        throw new Error(`WAREHOUSE_NOT_FOUND:${args.warehouseCode}`);
      }

      if (!warehouse) {
        warehouse = await tx.warehouse.upsert({
          where: {
            tenantId_code: { tenantId, code: "MAIN" },
          },
          update: {
            isActive: true,
            isDefault: true,
          },
          create: {
            tenantId,
            code: "MAIN",
            name: "Main Warehouse",
            isActive: true,
            isDefault: true,
          },
          select: {
            id: true,
          },
        });
      }

      let inventoryItemId = inventoryItem?.id;
      if (!inventoryItemId) {
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            tenantId,
            productId: inventoryOwner === "PRODUCT" ? product.id : null,
            productVariantId: variant?.id ?? null,
            skuSnapshot: args.sku,
          },
          select: {
            id: true,
          },
        });
        inventoryItemId = inventoryItem.id;
      } else if (inventoryItem?.skuSnapshot !== args.sku) {
        await tx.inventoryItem.update({
          where: {
            id: inventoryItemId,
          },
          data: {
            skuSnapshot: args.sku,
          },
        });
      }

      const existingLevel = inventoryItem?.inventoryLevels.find((level) => level.warehouse.id === warehouse.id);
      let onHandStock = existingLevel?.onHand ?? product.stock;
      const reservedStock = existingLevel?.reserved ?? 0;

      if (!existingLevel) {
        await tx.inventoryLevel.create({
          data: {
            tenantId,
            inventoryItemId,
            warehouseId: warehouse.id,
            onHand: onHandStock,
            reserved: reservedStock,
            reorderPoint: args.reorderPoint ?? 0,
            safetyStock: args.safetyStock ?? 0,
          },
        });

        if (onHandStock > 0) {
          await tx.inventoryMovement.create({
            data: {
              tenantId,
              inventoryItemId,
              warehouseId: warehouse.id,
              type: "INITIAL_LOAD",
              quantity: onHandStock,
              note: "Envanter temeli Product.stock özetinden başlatıldı",
            },
          });
        }
      }

      const shouldUpdateLevel = (
        (args.targetOnHandStock !== undefined && args.targetOnHandStock !== onHandStock)
        || (args.reorderPoint !== undefined && args.reorderPoint !== (existingLevel?.reorderPoint ?? 0))
        || (args.safetyStock !== undefined && args.safetyStock !== (existingLevel?.safetyStock ?? 0))
      );

      if (shouldUpdateLevel) {
        const delta = args.targetOnHandStock !== undefined
          ? args.targetOnHandStock - onHandStock
          : 0;
        if (args.targetOnHandStock !== undefined) {
          onHandStock = args.targetOnHandStock;
        }

        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId,
              warehouseId: warehouse.id,
            },
          },
          data: {
            onHand: onHandStock,
            ...(args.reorderPoint !== undefined ? { reorderPoint: args.reorderPoint } : {}),
            ...(args.safetyStock !== undefined ? { safetyStock: args.safetyStock } : {}),
          },
        });

        if (args.targetOnHandStock !== undefined && delta !== 0) {
          const inventoryTransaction = await this.createInventoryTransaction(tx, {
            type: "MANUAL_ADJUSTMENT",
            reference: args.sku,
            sourceDocumentType: "INVENTORY_ADJUSTMENT",
            sourceDocumentId: variant?.id ?? product.id,
            sourceDocumentNumber: args.sku,
            note: args.note ?? "Katalog yönetimi stok eşitlemesi",
          });

          await tx.inventoryTransactionLine.create({
            data: {
              tenantId,
              transactionId: inventoryTransaction.id,
              inventoryItemId,
              toWarehouseId: warehouse.id,
              quantity: Math.abs(delta),
              note: args.note ?? "Katalog yönetimi stok eşitlemesi",
            },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              inventoryItemId,
              warehouseId: warehouse.id,
              transactionId: inventoryTransaction.id,
              type: "MANUAL_ADJUSTMENT",
              quantity: delta,
              note: args.note ?? "Katalog yönetimi stok eşitlemesi",
              metadata: {
                transactionNumber: inventoryTransaction.transactionNumber,
                sourceDocumentType: "INVENTORY_ADJUSTMENT",
                sourceDocumentId: variant?.id ?? product.id,
                sourceDocumentNumber: args.sku,
              },
            },
          });
        }
      }

      await this.recalculateProductStock(tx, product.id);
    });
  }

  async transferProductInventory(args: TransferInventoryArgs) {
    return this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      if (args.fromWarehouseCode === args.toWarehouseCode) {
        throw new Error("WAREHOUSE_TRANSFER_SAME_SOURCE_TARGET");
      }

      const target = await this.resolveInventoryTarget(tx, args);
      const { product, variant, inventoryItem, inventoryOwner } = target;

      const [fromWarehouse, toWarehouse] = await Promise.all([
        tx.warehouse.findFirst({
          where: {
            code: args.fromWarehouseCode,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
          },
        }),
        tx.warehouse.findFirst({
          where: {
            code: args.toWarehouseCode,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
          },
        }),
      ]);

      if (!fromWarehouse) {
        throw new Error(`WAREHOUSE_NOT_FOUND:${args.fromWarehouseCode}`);
      }

      if (!toWarehouse) {
        throw new Error(`WAREHOUSE_NOT_FOUND:${args.toWarehouseCode}`);
      }

      let inventoryItemId = inventoryItem?.id;
      if (!inventoryItemId) {
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            tenantId,
            productId: inventoryOwner === "PRODUCT" ? product.id : null,
            productVariantId: variant?.id ?? null,
            skuSnapshot: args.sku,
          },
          select: {
            id: true,
          },
        });
        inventoryItemId = inventoryItem.id;
      } else if (inventoryItem?.skuSnapshot !== args.sku) {
        await tx.inventoryItem.update({
          where: {
            id: inventoryItemId,
          },
          data: {
            skuSnapshot: args.sku,
          },
        });
      }

      const levels = await tx.inventoryLevel.findMany({
        where: {
          inventoryItemId,
          warehouseId: {
            in: [fromWarehouse.id, toWarehouse.id],
          },
        },
        select: {
          id: true,
          warehouseId: true,
          onHand: true,
          reserved: true,
          reorderPoint: true,
          safetyStock: true,
        },
      });

      const fromLevel = levels.find((level) => level.warehouseId === fromWarehouse.id);
      if (!fromLevel) {
        throw new Error(`WAREHOUSE_LEVEL_NOT_FOUND:${args.fromWarehouseCode}`);
      }

      const transferableStock = this.toAvailableStock(fromLevel.onHand, fromLevel.reserved);
      if (transferableStock < args.quantity) {
        throw new Error(`INSUFFICIENT_TRANSFER_STOCK:${transferableStock}`);
      }

      const toLevel = levels.find((level) => level.warehouseId === toWarehouse.id);

      await tx.inventoryLevel.update({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId,
            warehouseId: fromWarehouse.id,
          },
        },
        data: {
          onHand: fromLevel.onHand - args.quantity,
        },
      });

      if (toLevel) {
        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId,
              warehouseId: toWarehouse.id,
            },
          },
          data: {
            onHand: toLevel.onHand + args.quantity,
          },
        });
      } else {
        await tx.inventoryLevel.create({
          data: {
            tenantId,
            inventoryItemId,
            warehouseId: toWarehouse.id,
            onHand: args.quantity,
            reserved: 0,
            reorderPoint: 0,
            safetyStock: 0,
          },
        });
      }

      const transferReference = `TRANSFER:${product.id}:${fromWarehouse.code}:${toWarehouse.code}:${Date.now()}`;
      const inventoryTransaction = await this.createInventoryTransaction(tx, {
        type: "TRANSFER",
        reference: transferReference,
        sourceDocumentType: "WAREHOUSE_TRANSFER",
        sourceDocumentId: variant?.id ?? product.id,
        sourceDocumentNumber: transferReference,
        sourceDocumentUrl: "/admin/inventory/transactions",
        note: args.note ?? `Transfer ${fromWarehouse.code} -> ${toWarehouse.code}`,
      });

      await tx.inventoryTransactionLine.create({
        data: {
          tenantId,
          transactionId: inventoryTransaction.id,
          inventoryItemId,
          fromWarehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          quantity: args.quantity,
          note: args.note ?? `Transfer ${fromWarehouse.code} -> ${toWarehouse.code}`,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          inventoryItemId,
          warehouseId: fromWarehouse.id,
          transactionId: inventoryTransaction.id,
          type: "TRANSFER_OUT",
          quantity: -args.quantity,
          note: args.note ?? `Transfer to ${toWarehouse.code}`,
          metadata: {
            transferReference,
            transactionNumber: inventoryTransaction.transactionNumber,
            sourceDocumentType: "WAREHOUSE_TRANSFER",
            sourceDocumentId: variant?.id ?? product.id,
            sourceDocumentNumber: transferReference,
            fromWarehouseCode: fromWarehouse.code,
            toWarehouseCode: toWarehouse.code,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          inventoryItemId,
          warehouseId: toWarehouse.id,
          transactionId: inventoryTransaction.id,
          type: "TRANSFER_IN",
          quantity: args.quantity,
          note: args.note ?? `Transfer from ${fromWarehouse.code}`,
          metadata: {
            transferReference,
            transactionNumber: inventoryTransaction.transactionNumber,
            sourceDocumentType: "WAREHOUSE_TRANSFER",
            sourceDocumentId: variant?.id ?? product.id,
            sourceDocumentNumber: transferReference,
            fromWarehouseCode: fromWarehouse.code,
            toWarehouseCode: toWarehouse.code,
          },
        },
      });

      await this.recalculateProductStock(tx, product.id);
    });
  }

  async recordProductInventoryMovement(args: RecordInventoryMovementArgs) {
    return this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      const target = await this.resolveInventoryTarget(tx, args);
      const { product, variant, inventoryItem, inventoryOwner } = target;

      const warehouse = await tx.warehouse.findFirst({
        where: {
          code: args.warehouseCode,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!warehouse) {
        throw new Error(`WAREHOUSE_NOT_FOUND:${args.warehouseCode}`);
      }

      let inventoryItemId = inventoryItem?.id;
      if (!inventoryItemId) {
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            tenantId,
            productId: inventoryOwner === "PRODUCT" ? product.id : null,
            productVariantId: variant?.id ?? null,
            skuSnapshot: args.sku,
          },
          select: {
            id: true,
          },
        });
        inventoryItemId = inventoryItem.id;
      } else if (inventoryItem?.skuSnapshot !== args.sku) {
        await tx.inventoryItem.update({
          where: {
            id: inventoryItemId,
          },
          data: {
            skuSnapshot: args.sku,
          },
        });
      }

      const existingLevel = await tx.inventoryLevel.findUnique({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId,
            warehouseId: warehouse.id,
          },
        },
        select: {
          onHand: true,
          reserved: true,
        },
      });

      const previousOnHand = existingLevel?.onHand ?? 0;

      if (args.type === "DAMAGE_WRITE_OFF") {
        const availableStock = this.toAvailableStock(existingLevel?.onHand ?? 0, existingLevel?.reserved ?? 0);
        if (availableStock < args.quantity) {
          throw new Error(`INSUFFICIENT_MOVEMENT_STOCK:${availableStock}`);
        }
      }

      if (existingLevel) {
        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId,
              warehouseId: warehouse.id,
            },
          },
          data: {
            onHand: existingLevel.onHand + (args.type === "PURCHASE_RECEIPT" ? args.quantity : -args.quantity),
          },
        });
      } else {
        if (args.type !== "PURCHASE_RECEIPT") {
          throw new Error(`WAREHOUSE_LEVEL_NOT_FOUND:${args.warehouseCode}`);
        }

        await tx.inventoryLevel.create({
          data: {
            tenantId,
            inventoryItemId,
            warehouseId: warehouse.id,
            onHand: args.quantity,
            reserved: 0,
            reorderPoint: 0,
            safetyStock: 0,
          },
        });
      }

      const inventoryTransaction = await this.createInventoryTransaction(tx, {
        type: args.type === "PURCHASE_RECEIPT" ? "STOCK_IN" : "STOCK_OUT",
        reference: args.type === "PURCHASE_RECEIPT" ? (args.sourceDocumentNumber ?? args.sku) : args.sku,
        sourceDocumentType: args.documentType ?? (args.type === "PURCHASE_RECEIPT" ? "PURCHASE_RECEIPT" : "STOCK_WRITE_OFF"),
        sourceDocumentId: args.type === "PURCHASE_RECEIPT" ? null : (variant?.id ?? product.id),
        sourceDocumentNumber: args.type === "PURCHASE_RECEIPT" ? (args.sourceDocumentNumber ?? args.sku) : args.sku,
        sourceDocumentDate: args.type === "PURCHASE_RECEIPT" ? (args.sourceDocumentDate ?? null) : null,
        externalReference: args.sourceDocumentReference ?? null,
        externalSystemStatus: args.externalSystemStatus ?? null,
        counterpartyName: args.sourceDocumentSupplier ?? null,
        note: args.note ?? (args.type === "PURCHASE_RECEIPT" ? "Manuel stok girişi" : "Manuel stok çıkışı"),
      });

      let purchaseReceiptId: string | null = null;

      if (
        args.type === "PURCHASE_RECEIPT"
        && (args.documentType === undefined || args.documentType === "PURCHASE_DOCUMENT")
        && args.sourceDocumentNumber
        && args.sourceDocumentSupplier
        && args.sourceDocumentDate
      ) {
        const createdReceipt = await tx.purchaseReceipt.create({
          data: {
            receiptNumber: args.sourceDocumentNumber,
            supplierName: args.sourceDocumentSupplier,
            receiptDate: args.sourceDocumentDate,
            externalReference: args.sourceDocumentReference ?? null,
        note: args.note ?? null,
            warehouseId: warehouse.id,
            transactionId: inventoryTransaction.id,
          },
          select: {
            id: true,
          },
        });

        purchaseReceiptId = createdReceipt.id;

        await tx.inventoryTransaction.update({
          where: {
            id: inventoryTransaction.id,
          },
          data: {
            sourceDocumentId: createdReceipt.id,
          },
        });

        await tx.purchaseReceiptLine.create({
          data: {
            purchaseReceiptId: createdReceipt.id,
            productId: product.id,
            productVariantId: variant?.id ?? null,
            quantity: args.quantity,
            unitCost: args.unitCost ?? null,
            lineTotal: args.unitCost !== undefined && args.unitCost !== null ? new Prisma.Decimal(args.unitCost).mul(args.quantity) : null,
            note: args.note ?? null,
          },
        });

        if (args.unitCost !== undefined && args.unitCost !== null) {
          const nextOnHand = previousOnHand + args.quantity;
          const previousAverage = await tx.inventoryItem.findUnique({
            where: {
              id: inventoryItemId,
            },
            select: {
              averageUnitCost: true,
            },
          });

          const previousAverageValue = previousAverage?.averageUnitCost?.toNumber() ?? product.purchasePrice?.toNumber() ?? 0;
          const weightedAverage = nextOnHand <= 0
            ? args.unitCost
            : ((previousOnHand * previousAverageValue) + (args.quantity * args.unitCost)) / Math.max(nextOnHand, 1);

          await tx.inventoryItem.update({
            where: {
              id: inventoryItemId,
            },
            data: {
              lastPurchaseUnitCost: new Prisma.Decimal(args.unitCost),
              averageUnitCost: new Prisma.Decimal(Number(weightedAverage.toFixed(2))),
              costingMethod: "AVERAGE_COST",
            },
          });

          await tx.product.update({
            where: {
              id: product.id,
            },
            data: {
              purchasePrice: new Prisma.Decimal(args.unitCost),
            },
          });
        }
      }

      await tx.inventoryTransactionLine.create({
        data: {
          tenantId,
          transactionId: inventoryTransaction.id,
          inventoryItemId,
          toWarehouseId: args.type === "PURCHASE_RECEIPT" ? warehouse.id : null,
          fromWarehouseId: args.type === "DAMAGE_WRITE_OFF" ? warehouse.id : null,
          quantity: args.quantity,
        note: args.note ?? (args.type === "PURCHASE_RECEIPT" ? "Manuel stok girişi" : "Manuel stok çıkışı"),
        },
      });

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          inventoryItemId,
          warehouseId: warehouse.id,
          transactionId: inventoryTransaction.id,
          type: args.type,
          quantity: args.type === "PURCHASE_RECEIPT" ? args.quantity : -args.quantity,
          note: args.note ?? (args.type === "PURCHASE_RECEIPT" ? "Manuel stok girişi" : "Manuel stok çıkışı"),
          metadata: {
            transactionNumber: inventoryTransaction.transactionNumber,
            sourceDocumentType: args.documentType ?? (args.type === "PURCHASE_RECEIPT" ? "PURCHASE_RECEIPT" : "STOCK_WRITE_OFF"),
            sourceDocumentId: purchaseReceiptId ?? variant?.id ?? product.id,
            sourceDocumentNumber: args.type === "PURCHASE_RECEIPT" ? (args.sourceDocumentNumber ?? args.sku) : args.sku,
            sourceDocumentUrl: args.type === "PURCHASE_RECEIPT" && purchaseReceiptId ? null : null,
            supplierName: args.sourceDocumentSupplier ?? null,
            externalReference: args.sourceDocumentReference ?? null,
            externalSystemStatus: args.externalSystemStatus ?? null,
            unitCost: args.unitCost ?? null,
            productVariantId: variant?.id ?? null,
            productVariantSku: variant?.sku ?? null,
          },
        },
      });

      await this.recalculateProductStock(tx, product.id);
    });
  }

  async listInventoryAlerts() {
    return prisma.inventoryAlert.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        { type: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
        inventoryItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            inventoryLevels: {
              select: {
                warehouseId: true,
                onHand: true,
                reserved: true,
                reorderPoint: true,
                safetyStock: true,
              },
            },
          },
        },
      },
    });
  }

  async listStockCounts() {
    return prisma.stockCount.findMany({
      orderBy: [
        { countedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
        lines: {
          orderBy: [
            { warehouse: { code: "asc" } },
            { inventoryItem: { skuSnapshot: "asc" } },
          ],
          include: {
            warehouse: {
              select: {
                code: true,
                name: true,
              },
            },
            inventoryItem: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createStockCount(input: AdminCreateStockCountInput) {
    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      const warehouse = input.warehouseCode
        ? await tx.warehouse.findFirst({
            where: {
              code: input.warehouseCode,
              isActive: true,
            },
            select: {
              id: true,
              code: true,
              name: true,
            },
          })
        : null;

      if (input.warehouseCode && !warehouse) {
        throw new Error(`WAREHOUSE_NOT_FOUND:${input.warehouseCode}`);
      }

      const levels = await tx.inventoryLevel.findMany({
        where: {
          warehouse: {
            isActive: true,
            ...(warehouse ? { id: warehouse.id } : {}),
          },
          inventoryItem: {
            product: {
              deleted: false,
              ...(input.search
                ? {
                    OR: [
                      { name: { contains: input.search, mode: "insensitive" } },
                      { sku: { contains: input.search, mode: "insensitive" } },
                      { barcode: { contains: input.search, mode: "insensitive" } },
                    ],
                  }
                : {}),
            },
          },
        },
        orderBy: [
          { warehouse: { code: "asc" } },
          { inventoryItem: { skuSnapshot: "asc" } },
        ],
        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          inventoryItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (levels.length === 0) {
        throw new Error("STOCK_COUNT_EMPTY_SCOPE");
      }

      const countNumber = `SC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const stockCount = await tx.stockCount.create({
        data: {
          tenantId,
          countNumber,
          warehouseId: warehouse?.id ?? null,
          countedAt: new Date(input.countedAt),
          note: input.note ?? null,
        },
        select: {
          id: true,
        },
      });

      await tx.stockCountLine.createMany({
        data: levels.map((level) => ({
          tenantId,
          stockCountId: stockCount.id,
          inventoryItemId: level.inventoryItemId,
          warehouseId: level.warehouseId,
          systemOnHand: level.onHand,
          countedOnHand: null,
          note: null,
        })),
      });

      return tx.stockCount.findUniqueOrThrow({
        where: {
          id: stockCount.id,
        },
        include: {
          warehouse: {
            select: {
              code: true,
              name: true,
            },
          },
          lines: {
            orderBy: [
              { warehouse: { code: "asc" } },
              { inventoryItem: { skuSnapshot: "asc" } },
            ],
            include: {
              warehouse: {
                select: {
                  code: true,
                  name: true,
                },
              },
              inventoryItem: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  async updateStockCountLine(input: AdminUpdateStockCountLineInput) {
    return prisma.$transaction(async (tx) => {
      const line = await tx.stockCountLine.findFirst({
        where: {
          id: input.lineId,
          stockCountId: input.stockCountId,
        },
        include: {
          stockCount: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!line) {
        throw new Error(`STOCK_COUNT_LINE_NOT_FOUND:${input.lineId}`);
      }

      if (line.stockCount.status === "APPLIED") {
        throw new Error("STOCK_COUNT_ALREADY_APPLIED");
      }

      await tx.stockCountLine.update({
        where: {
          id: input.lineId,
        },
        data: {
          countedOnHand: input.countedOnHand,
          note: input.note ?? null,
        },
      });

      await tx.stockCount.update({
        where: {
          id: input.stockCountId,
        },
        data: {
          status: "COUNTED",
        },
      });
    });
  }

  async updateStockCountLinesBulk(stockCountId: string, rows: BulkStockCountLineRowInput[]) {
    return prisma.$transaction(async (tx) => {
      const stockCount = await tx.stockCount.findUnique({
        where: {
          id: stockCountId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!stockCount) {
        throw new Error(`STOCK_COUNT_NOT_FOUND:${stockCountId}`);
      }

      if (stockCount.status === "APPLIED") {
        throw new Error("STOCK_COUNT_ALREADY_APPLIED");
      }

      const skuList = Array.from(new Set(rows.map((row) => row.sku)));
      const warehouseCodes = Array.from(new Set(rows.map((row) => row.warehouseCode)));

      const lines = await tx.stockCountLine.findMany({
        where: {
          stockCountId,
          inventoryItem: {
            skuSnapshot: {
              in: skuList,
            },
          },
          warehouse: {
            code: {
              in: warehouseCodes,
            },
          },
        },
        include: {
          inventoryItem: {
            select: {
              skuSnapshot: true,
            },
          },
          warehouse: {
            select: {
              code: true,
            },
          },
        },
      });

      const lineMap = new Map(lines.map((line) => [`${line.inventoryItem.skuSnapshot}:${line.warehouse.code}`, line]));

      for (const row of rows) {
        const line = lineMap.get(`${row.sku}:${row.warehouseCode}`);
        if (!line) {
          continue;
        }

        await tx.stockCountLine.update({
          where: {
            id: line.id,
          },
          data: {
            countedOnHand: row.countedOnHand,
            note: row.note ?? null,
          },
        });
      }

      await tx.stockCount.update({
        where: {
          id: stockCountId,
        },
        data: {
          status: "COUNTED",
        },
      });
    });
  }

  async findStockCountLineTargets(stockCountId: string, rows: Array<{ sku: string; warehouseCode: string }>) {
    const skuList = Array.from(new Set(rows.map((row) => row.sku)));
    const warehouseCodes = Array.from(new Set(rows.map((row) => row.warehouseCode)));

    return prisma.stockCountLine.findMany({
      where: {
        stockCountId,
        inventoryItem: {
          skuSnapshot: {
            in: skuList,
          },
        },
        warehouse: {
          code: {
            in: warehouseCodes,
          },
        },
      },
      include: {
        inventoryItem: {
          select: {
            skuSnapshot: true,
          },
        },
        warehouse: {
          select: {
            code: true,
          },
        },
      },
    });
  }

  async applyStockCount(stockCountId: string) {
    return this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      const stockCount = await tx.stockCount.findUnique({
        where: {
          id: stockCountId,
        },
        include: {
          lines: {
            include: {
              inventoryItem: {
                include: {
                  product: {
                    select: {
                      id: true,
                      sku: true,
                      name: true,
                    },
                  },
                },
              },
              warehouse: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!stockCount) {
        throw new Error(`STOCK_COUNT_NOT_FOUND:${stockCountId}`);
      }

      if (stockCount.status === "APPLIED") {
        throw new Error("STOCK_COUNT_ALREADY_APPLIED");
      }

      const linesToApply = stockCount.lines.filter((line) => line.countedOnHand !== null);
      if (linesToApply.length === 0) {
        throw new Error("STOCK_COUNT_NOT_READY");
      }

      const transaction = await this.createInventoryTransaction(tx, {
        type: "STOCK_COUNT",
        reference: stockCount.countNumber,
        sourceDocumentType: "STOCK_COUNT",
        sourceDocumentId: stockCount.id,
        sourceDocumentNumber: stockCount.countNumber,
        sourceDocumentUrl: "/admin/inventory/counts",
        sourceDocumentDate: stockCount.countedAt,
        note: stockCount.note ?? `Stock count ${stockCount.countNumber}`,
      });

      const touchedInventoryItemIds = new Set<string>();

      for (const line of linesToApply) {
        const currentLevel = await tx.inventoryLevel.findUnique({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: line.inventoryItemId,
              warehouseId: line.warehouseId,
            },
          },
          select: {
            onHand: true,
            reserved: true,
          },
        });

        if (!currentLevel) {
          throw new Error(`INVENTORY_LEVEL_NOT_FOUND:${line.inventoryItemId}:${line.warehouseId}`);
        }

        if (currentLevel.onHand !== line.systemOnHand) {
          throw new Error(
            `STOCK_COUNT_STALE_LEVEL:${line.inventoryItem.product?.sku ?? line.inventoryItem.skuSnapshot}:${line.warehouse.code}:${line.systemOnHand}:${currentLevel.onHand}`,
          );
        }

        if (currentLevel.reserved > 0) {
          throw new Error(
            `STOCK_COUNT_HAS_ACTIVE_RESERVATIONS:${line.inventoryItem.product?.sku ?? line.inventoryItem.skuSnapshot}:${line.warehouse.code}:${currentLevel.reserved}`,
          );
        }

        const countedOnHand = line.countedOnHand ?? line.systemOnHand;
        const delta = countedOnHand - line.systemOnHand;
        touchedInventoryItemIds.add(line.inventoryItemId);

        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: line.inventoryItemId,
              warehouseId: line.warehouseId,
            },
          },
          data: {
            onHand: countedOnHand,
          },
        });

        if (delta !== 0) {
          await tx.inventoryTransactionLine.create({
            data: {
              tenantId,
              transactionId: transaction.id,
              inventoryItemId: line.inventoryItemId,
              toWarehouseId: line.warehouseId,
              quantity: Math.abs(delta),
              note: line.note ?? `Stock count variance for ${stockCount.countNumber}`,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              inventoryItemId: line.inventoryItemId,
              warehouseId: line.warehouseId,
              transactionId: transaction.id,
              type: "COUNT_ADJUSTMENT",
              quantity: delta,
              note: line.note ?? `Stock count variance for ${stockCount.countNumber}`,
              metadata: {
                transactionNumber: transaction.transactionNumber,
                stockCountNumber: stockCount.countNumber,
                sourceDocumentType: "STOCK_COUNT",
                sourceDocumentId: stockCount.id,
                sourceDocumentNumber: stockCount.countNumber,
                sourceDocumentUrl: "/admin/inventory/counts",
                systemOnHand: line.systemOnHand,
                countedOnHand,
              },
            },
          });
        }
      }

      for (const inventoryItemId of touchedInventoryItemIds) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: {
            id: inventoryItemId,
          },
          select: {
            id: true,
            productId: true,
            productVariant: {
              select: {
                productId: true,
              },
            },
          },
        });

        const productId = inventoryItem?.productId ?? inventoryItem?.productVariant?.productId ?? null;
        if (productId) {
          await this.recalculateProductStock(tx, productId);
        }
      }

      await tx.stockCount.update({
        where: {
          id: stockCount.id,
        },
        data: {
          status: "APPLIED",
        },
      });

      return {
        transactionNumber: transaction.transactionNumber,
        countNumber: stockCount.countNumber,
        productIds: Array.from(new Set(linesToApply.flatMap((line) => line.inventoryItem.product?.id ? [line.inventoryItem.product.id] : []))),
        touchedTargets: linesToApply.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          warehouseId: line.warehouseId,
        })),
      };
    });
  }

  async refreshInventoryAlerts(targets: Array<{ inventoryItemId: string; warehouseId: string }>) {
    if (targets.length === 0) {
      return [];
    }

    const uniqueTargets = Array.from(
      new Map(targets.map((target) => [`${target.inventoryItemId}:${target.warehouseId}`, target])).values(),
    );

    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      const levels = await tx.inventoryLevel.findMany({
        where: {
          OR: uniqueTargets.map((target) => ({
            inventoryItemId: target.inventoryItemId,
            warehouseId: target.warehouseId,
          })),
        },
        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          inventoryItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const activeAlerts = await tx.inventoryAlert.findMany({
        where: {
          status: "ACTIVE",
          OR: uniqueTargets.map((target) => ({
            inventoryItemId: target.inventoryItemId,
            warehouseId: target.warehouseId,
          })),
        },
      });

      const createdAlerts: Array<{
        id: string;
        type: "LOW_STOCK" | "OUT_OF_STOCK";
        message: string;
        warehouseCode: string;
        productName: string;
      }> = [];

      for (const level of levels) {
        const keyMatches = activeAlerts.filter((alert) => (
          alert.inventoryItemId === level.inventoryItemId && alert.warehouseId === level.warehouseId
        ));
        const availableStock = this.toAvailableStock(level.onHand, level.reserved);
        const threshold = Math.max(level.reorderPoint, level.safetyStock);
        const nextType = availableStock <= 0
          ? "OUT_OF_STOCK"
          : threshold > 0 && availableStock <= threshold
            ? "LOW_STOCK"
            : null;
        const message = nextType === "OUT_OF_STOCK"
          ? `${level.inventoryItem.product?.name ?? level.inventoryItem.skuSnapshot} ürünü ${level.warehouse.code} deposunda tükendi`
          : nextType === "LOW_STOCK"
            ? `${level.inventoryItem.product?.name ?? level.inventoryItem.skuSnapshot} ürünü ${level.warehouse.code} deposunda kritik stok seviyesinin altında`
            : null;

        if (!nextType || !message) {
          if (keyMatches.length > 0) {
            await tx.inventoryAlert.updateMany({
              where: {
                id: {
                  in: keyMatches.map((alert) => alert.id),
                },
              },
              data: {
                status: "RESOLVED",
              },
            });
          }
          continue;
        }

        const existingMatch = keyMatches.find((alert) => alert.type === nextType);
        const staleAlerts = keyMatches.filter((alert) => alert.type !== nextType);

        if (staleAlerts.length > 0) {
          await tx.inventoryAlert.updateMany({
            where: {
              id: {
                in: staleAlerts.map((alert) => alert.id),
              },
            },
            data: {
              status: "RESOLVED",
            },
          });
        }

        if (existingMatch) {
          await tx.inventoryAlert.update({
            where: {
              id: existingMatch.id,
            },
            data: {
              message,
            },
          });
          continue;
        }

        const created = await tx.inventoryAlert.create({
          data: {
            tenantId,
            inventoryItemId: level.inventoryItemId,
            warehouseId: level.warehouseId,
            type: nextType,
            status: "ACTIVE",
            message,
          },
          select: {
            id: true,
            type: true,
            message: true,
          },
        });

        createdAlerts.push({
          id: created.id,
          type: created.type,
          message: created.message,
          warehouseCode: level.warehouse.code,
          productName: level.inventoryItem.product?.name ?? level.inventoryItem.skuSnapshot,
        });
      }

      return createdAlerts;
    });
  }

  async listInventoryReportLevels() {
    return prisma.inventoryLevel.findMany({
      where: {
        warehouse: {
          isActive: true,
        },
        inventoryItem: {
          product: {
            deleted: false,
          },
        },
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        inventoryItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                categoryId: true,
                productType: true,
                price: true,
                purchasePrice: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { warehouse: { code: "asc" } },
        { inventoryItem: { skuSnapshot: "asc" } },
      ],
    });
  }

  async listInventoryConsistencyRows() {
    return prisma.product.findMany({
      where: {
        deleted: false,
        stockTrackingEnabled: true,
        productType: {
          not: "SERVICE",
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        categoryId: true,
        productType: true,
        stock: true,
        category: {
          select: {
            id: true,
            name: true,
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
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async listInventoryReportMovements(args: {
    startDate: Date;
    endDate?: Date;
  }) {
    return prisma.inventoryMovement.findMany({
      where: {
        createdAt: {
          gte: args.startDate,
          ...(args.endDate ? { lte: args.endDate } : {}),
        },
      },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
        inventoryItemId: true,
        inventoryItem: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                categoryId: true,
                productType: true,
                price: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async createInventoryHistoryEvent(input: {
    eventType:
      | "STOCK_ADJUSTMENT"
      | "STOCK_TRANSFER"
      | "STOCK_IN"
      | "STOCK_OUT"
      | "STOCK_COUNT"
      | "WAREHOUSE_CREATED"
      | "WAREHOUSE_UPDATED"
      | "BULK_OPERATION";
    entityType: "PRODUCT" | "WAREHOUSE" | "STOCK_COUNT" | "TRANSACTION" | "PURCHASE_RECEIPT" | "BULK_OPERATION";
    entityId?: string | null;
    productId?: string | null;
    warehouseId?: string | null;
    transactionId?: string | null;
    stockCountId?: string | null;
    purchaseReceiptId?: string | null;
    actorUserId?: string | null;
    title: string;
    summary: string;
    metadata?: Record<string, unknown> | null;
  }) {
    if (typeof prisma.inventoryHistoryEvent === "undefined") {
      return null;
    }

    return prisma.inventoryHistoryEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        productId: input.productId ?? null,
        warehouseId: input.warehouseId ?? null,
        transactionId: input.transactionId ?? null,
        stockCountId: input.stockCountId ?? null,
        purchaseReceiptId: input.purchaseReceiptId ?? null,
        actorUserId: input.actorUserId ?? null,
        title: input.title,
        summary: input.summary,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }

  async listInventoryHistoryEvents(limit: number) {
    if (typeof prisma.inventoryHistoryEvent === "undefined") {
      return [];
    }

    return prisma.inventoryHistoryEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async findUsersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async getUserInventoryPreferences(userId: string) {
    return prisma.userInventoryPreference.findUnique({
      where: {
        userId,
      },
      select: {
        compactInventoryList: true,
        visibleColumns: true,
      },
    });
  }

  async upsertUserInventoryPreferences(userId: string, input: AdminInventoryListPreferences) {
    return prisma.userInventoryPreference.upsert({
      where: {
        userId,
      },
      update: {
        compactInventoryList: input.compactInventoryList,
        visibleColumns: input.visibleColumns as Prisma.InputJsonValue,
      },
      create: {
        userId,
        compactInventoryList: input.compactInventoryList,
        visibleColumns: input.visibleColumns as Prisma.InputJsonValue,
      },
      select: {
        compactInventoryList: true,
        visibleColumns: true,
      },
    });
  }

  async findInventoryTransactionSummariesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.inventoryTransaction.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        transactionNumber: true,
        type: true,
        createdAt: true,
      },
    });
  }
}
