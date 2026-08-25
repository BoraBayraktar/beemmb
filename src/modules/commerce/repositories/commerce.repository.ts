import { Prisma } from "@prisma/client";

import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { AdminOrderListQuery, CommerceLineQuote } from "@/modules/commerce/contracts/commerce.contract";

export class CommerceRepository {
  private readonly serializableRetryCount = 3;

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

  private sumAvailableStock(levels: Array<{ onHand: number; reserved: number }>, fallbackStock: number) {
    if (levels.length === 0) {
      // Sprint 1 kuralı: Product.stock sipariş otoritesi değildir; sadece aggregate yoksa legacy summary fallback'tir.
      return fallbackStock;
    }

    return levels.reduce((sum, level) => sum + this.toAvailableStock(level.onHand, level.reserved), 0);
  }

  private async getOrCreateDefaultWarehouse(tx: PrismaTransactionClient) {
    const tenantId = requireTenantId();
    const defaultWarehouse = await tx.warehouse.findFirst({
      where: {
        isActive: true,
        isDefault: true,
      },
      select: {
        id: true,
      },
    });

    if (defaultWarehouse) {
      return defaultWarehouse;
    }

    return tx.warehouse.upsert({
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

  private async ensureInventoryState(tx: PrismaTransactionClient, productId: string) {
    const tenantId = requireTenantId();

    const product = await tx.product.findFirst({
      where: {
        id: productId,
        deleted: false,
      },
      select: {
        id: true,
        sku: true,
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
                warehouseId: true,
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
      throw new Error(`INSUFFICIENT_STOCK:${productId}`);
    }

    const defaultWarehouse = await this.getOrCreateDefaultWarehouse(tx);

    let inventoryItemId = product.inventoryItem?.id;
    if (!inventoryItemId) {
      const createdInventoryItem = await tx.inventoryItem.create({
        data: {
          tenantId,
          productId: product.id,
          skuSnapshot: product.sku,
        },
        select: {
          id: true,
        },
      });
      inventoryItemId = createdInventoryItem.id;
    } else if (product.inventoryItem?.skuSnapshot !== product.sku) {
      await tx.inventoryItem.update({
        where: {
          id: inventoryItemId,
        },
        data: {
          skuSnapshot: product.sku,
        },
      });
    }

    let levels = product.inventoryItem?.inventoryLevels.map((level) => ({
      warehouseId: level.warehouseId,
      onHand: level.onHand,
      reserved: level.reserved,
      isDefault: level.warehouse.isDefault,
      warehouseCode: level.warehouse.code,
    })) ?? [];

    if (levels.length === 0) {
      // Legacy summary değerinden tek seferlik aggregate bootstrap yapılır; sonrasında otorite inventory level'dır.
      await tx.inventoryLevel.create({
        data: {
          tenantId,
          inventoryItemId,
          warehouseId: defaultWarehouse.id,
          onHand: product.stock,
          reserved: 0,
        },
      });

      if (product.stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            inventoryItemId,
            warehouseId: defaultWarehouse.id,
            type: "INITIAL_LOAD",
            quantity: product.stock,
            note: "Sipariş akışında legacy stok özetinden envanter başlatıldı",
          },
        });
      }

      levels = [{
        warehouseId: defaultWarehouse.id,
        onHand: product.stock,
        reserved: 0,
        isDefault: true,
        warehouseCode: "MAIN",
      }];
    }

    levels.sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }

      const rightAvailable = this.toAvailableStock(right.onHand, right.reserved);
      const normalizedLeftAvailable = this.toAvailableStock(left.onHand, left.reserved);
      return rightAvailable - normalizedLeftAvailable;
    });

    return {
      productId: product.id,
      inventoryItemId,
      levels,
    };
  }

  private async recalculateProductStockSummary(
    tx: PrismaTransactionClient,
    productId: string,
    inventoryItemId: string,
  ) {
    const levels = await tx.inventoryLevel.findMany({
      where: {
        inventoryItemId,
        warehouse: {
          isActive: true,
        },
      },
      select: {
        onHand: true,
        reserved: true,
      },
    });

    const availableStock = levels.reduce(
      (sum, level) => sum + this.toAvailableStock(level.onHand, level.reserved),
      0,
    );

    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: availableStock,
      },
    });
  }

  private async getActiveLevelSnapshot(
    tx: PrismaTransactionClient,
    inventoryItemId: string,
    warehouseId: string,
  ) {
    return tx.inventoryLevel.findUnique({
      where: {
        inventoryItemId_warehouseId: {
          inventoryItemId,
          warehouseId,
        },
      },
      select: {
        onHand: true,
        reserved: true,
      },
    });
  }

  async listActiveProductsByIds(productIds: string[]) {
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
      },
    });
  }

  async listSellableSnapshots(lines: Array<{ productId: string; variantId?: string }>) {
    const productIds = Array.from(new Set(lines.map((line) => line.productId)));
    const variantIds = Array.from(new Set(lines.map((line) => line.variantId).filter((value): value is string => Boolean(value))));
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        deleted: false,
        status: "ACTIVE",
        salesEnabled: true,
      },
      include: {
        variants: variantIds.length > 0
          ? {
              where: {
                id: {
                  in: variantIds,
                },
                deleted: false,
                salesEnabled: true,
              },
            }
          : false,
      },
    });

    return lines.flatMap((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) {
        return [];
      }

      const variant = line.variantId
        ? product.variants.find((item) => item.id === line.variantId)
        : null;

      if (line.variantId && !variant) {
        return [];
      }

      return [{
        productId: product.id,
        slug: product.slug,
        sku: variant?.sku ?? product.sku,
        name: product.name,
        imageUrl: variant?.imageUrl ?? product.imageUrl,
        currency: product.currency,
        unitPrice: variant?.priceOverride?.toNumber() ?? product.price.toNumber(),
        compareAtPrice: variant?.compareAtPriceOverride?.toNumber() ?? product.compareAtPrice?.toNumber() ?? null,
        variantId: variant?.id ?? null,
        variantSlug: variant?.slug ?? null,
        variantSku: variant?.sku ?? null,
        variantTitle: variant?.title ?? null,
        variantOptionSummary: variant?.optionSummary ?? null,
        variantStockOverride: variant?.stockOverride ?? null,
      }];
    });
  }

  async findOrderByNumber(orderNumber: string) {
    return prisma.order.findFirst({
      where: {
        orderNumber,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });
  }

  async createOrderAndCommitInventory(args: {
    orderNumber: string;
    lines: CommerceLineQuote[];
    subtotal: number;
    discountTotal: number;
    total: number;
    promotionCode: string | null;
    currency: string;
    customerAccountId?: string | null;
    shipmentAddressLine?: string | null;
    shipmentCity?: string | null;
    shipmentDistrict?: string | null;
    shipmentPostalCode?: string | null;
    shipmentContactName?: string | null;
    shipmentContactPhone?: string | null;
    invoiceAddressLine?: string | null;
    invoiceCity?: string | null;
    invoiceDistrict?: string | null;
    invoicePostalCode?: string | null;
    carrierCompanyId?: string | null;
    cargoTrackingNumber?: string | null;
    shipmentSourceChannel?: string | null;
    externalCarrierNameRaw?: string | null;
  }) {
    return this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      const holds: Array<{
        productId: string;
        variantId: string | null;
        variantTitle: string | null;
        variantSku: string | null;
        inventoryItemId: string;
        warehouseId: string;
        reservationId: string;
        quantity: number;
      }> = [];
      for (const line of args.lines) {
        const state = await this.ensureInventoryState(tx, line.productId);
        const availableStock = state.levels.reduce(
          (sum, level) => sum + this.toAvailableStock(level.onHand, level.reserved),
          0,
        );

        if (availableStock < line.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${line.productId}`);
        }

        let remainingQuantity = line.quantity;

        for (const level of state.levels) {
          if (remainingQuantity <= 0) {
            break;
          }

          const currentLevel = await this.getActiveLevelSnapshot(
            tx,
            state.inventoryItemId,
            level.warehouseId,
          );
          const levelAvailable = this.toAvailableStock(
            currentLevel?.onHand ?? level.onHand,
            currentLevel?.reserved ?? level.reserved,
          );
          if (levelAvailable <= 0) {
            continue;
          }

          const reservedQuantity = Math.min(levelAvailable, remainingQuantity);

          const reservation = await tx.stockReservation.create({
            data: {
              tenantId,
              inventoryItemId: state.inventoryItemId,
              warehouseId: level.warehouseId,
              quantity: reservedQuantity,
              status: "ACTIVE",
              reference: args.orderNumber,
            },
          });

          await tx.inventoryLevel.update({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId: state.inventoryItemId,
                warehouseId: level.warehouseId,
              },
            },
            data: {
              reserved: {
                increment: reservedQuantity,
              },
            },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              inventoryItemId: state.inventoryItemId,
              warehouseId: level.warehouseId,
              reservationId: reservation.id,
              type: "RESERVATION_HOLD",
              quantity: reservedQuantity,
              note: `Checkout reservation hold for ${args.orderNumber}`,
              metadata: line.variantId
                ? {
                    productVariantId: line.variantId,
                    productVariantTitle: line.variantTitle,
                    productVariantSku: line.variantSku,
                  }
                : undefined,
            },
          });

          holds.push({
            productId: state.productId,
            variantId: line.variantId,
            variantTitle: line.variantTitle,
            variantSku: line.variantSku,
            inventoryItemId: state.inventoryItemId,
            warehouseId: level.warehouseId,
            reservationId: reservation.id,
            quantity: reservedQuantity,
          });

          remainingQuantity -= reservedQuantity;
        }

        if (remainingQuantity > 0) {
          throw new Error(`INSUFFICIENT_STOCK:${line.productId}`);
        }
      }

      const order = await (tx.order as any).create({
        data: {
          tenantId,
          orderNumber: args.orderNumber,
          cariId: args.customerAccountId ?? null,
          status: "CONFIRMED",
          paymentStatus: "PENDING",
          subtotal: args.subtotal,
          discountTotal: args.discountTotal,
          total: args.total,
          promotionCode: args.promotionCode,
          currency: args.currency,
          shipmentAddressLine: args.shipmentAddressLine ?? null,
          shipmentCity: args.shipmentCity ?? null,
          shipmentDistrict: args.shipmentDistrict ?? null,
          shipmentPostalCode: args.shipmentPostalCode ?? null,
          shipmentContactName: args.shipmentContactName ?? null,
          shipmentContactPhone: args.shipmentContactPhone ?? null,
          invoiceAddressLine: args.invoiceAddressLine ?? null,
          invoiceCity: args.invoiceCity ?? null,
          invoiceDistrict: args.invoiceDistrict ?? null,
          invoicePostalCode: args.invoicePostalCode ?? null,
          carrierCariId: args.carrierCompanyId ?? null,
          cargoTrackingNumber: args.cargoTrackingNumber ?? null,
          shipmentSourceChannel: args.shipmentSourceChannel ?? null,
          externalCarrierNameRaw: args.externalCarrierNameRaw ?? null,
          statusHistory: {
            create: {
              tenantId,
              fromStatus: null,
              toStatus: "CONFIRMED",
              source: "SYSTEM",
              note: "Checkout created order",
            },
          },
          paymentStatusHistory: {
            create: {
              tenantId,
              fromStatus: null,
              toStatus: "PENDING",
              source: "SYSTEM",
              note: "Checkout initialized payment status",
            },
          },
          items: {
            create: args.lines.map((line) => ({
              tenantId,
              productId: line.productId,
              productVariantId: line.variantId,
              productSlug: line.slug,
              productSku: line.sku,
              productVariantSlug: line.variantSlug,
              productVariantSku: line.variantSku,
              productVariantTitle: line.variantTitle,
              productVariantOptionSummary: line.variantOptionSummary,
              productName: line.name,
              productImageUrl: line.imageUrl,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              compareAtPrice: line.compareAtPrice,
              lineTotal: line.lineTotal,
              currency: line.currency,
            })),
          },
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

      for (const hold of holds) {
        const committedLevel = await this.getActiveLevelSnapshot(
          tx,
          hold.inventoryItemId,
          hold.warehouseId,
        );

        if (!committedLevel || committedLevel.onHand < hold.quantity || committedLevel.reserved < hold.quantity) {
          throw new Error(`STALE_RESERVATION_LEVEL:${hold.productId}:${hold.warehouseId}:${hold.quantity}`);
        }

        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: hold.inventoryItemId,
              warehouseId: hold.warehouseId,
            },
          },
          data: {
            onHand: {
              decrement: hold.quantity,
            },
            reserved: {
              decrement: hold.quantity,
            },
          },
        });

        await tx.stockReservation.update({
          where: {
            id: hold.reservationId,
          },
          data: {
            status: "COMMITTED",
            orderId: order.id,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            inventoryItemId: hold.inventoryItemId,
            warehouseId: hold.warehouseId,
            orderId: order.id,
            reservationId: hold.reservationId,
            type: "ORDER_COMMIT",
            quantity: -hold.quantity,
            note: `Checkout inventory commit for ${args.orderNumber}`,
            metadata: hold.variantId
              ? {
                  productVariantId: hold.variantId,
                  productVariantTitle: hold.variantTitle,
                  productVariantSku: hold.variantSku,
                }
              : undefined,
          },
        });

      }
      const touchedProductStates = new Map<string, string>();
      for (const hold of holds) {
        touchedProductStates.set(hold.productId, hold.inventoryItemId);
      }

      for (const [productId, inventoryItemId] of touchedProductStates.entries()) {
        await this.recalculateProductStockSummary(tx, productId, inventoryItemId);
      }

      return {
        orderNumber: order.orderNumber,
      };
    });
  }

  async listOrders(args: Required<Pick<AdminOrderListQuery, "page" | "pageSize">> & Pick<AdminOrderListQuery, "search" | "status" | "paymentStatus" | "shipmentStatus" | "carrierCompanyId">) {
    return (prisma.order as any).findMany({
      where: {
        deleted: false,
        ...(args.search
          ? {
              orderNumber: {
                contains: args.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
        ...(args.status ? { status: args.status } : {}),
        ...(args.paymentStatus ? { paymentStatus: args.paymentStatus } : {}),
        ...(args.shipmentStatus ? { shipmentStatus: args.shipmentStatus } : {}),
        ...(args.carrierCompanyId ? { carrierCariId: args.carrierCompanyId } : {}),
      },
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        carrierCari: {
          select: {
            id: true,
            name: true,
            carrierProfile: {
              select: {
                trackingUrlTemplate: true,
              },
            },
          },
        },
        items: {
          where: {
            deleted: false,
          },
        },
        stockReservations: {
          select: {
            id: true,
            inventoryMovements: {
              where: {
                type: {
                  in: ["ORDER_CANCEL_RESTOCK", "RETURN_RESTOCK"],
                },
              },
              select: {
                id: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async countOrders(args: Pick<AdminOrderListQuery, "search" | "status" | "paymentStatus" | "shipmentStatus" | "carrierCompanyId">) {
    return prisma.order.count({
      where: {
        deleted: false,
        ...(args.search
          ? {
              orderNumber: {
                contains: args.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
        ...(args.status ? { status: args.status } : {}),
        ...(args.paymentStatus ? { paymentStatus: args.paymentStatus } : {}),
        ...(args.shipmentStatus ? { shipmentStatus: args.shipmentStatus } : {}),
        ...(args.carrierCompanyId ? { carrierCariId: args.carrierCompanyId } : {}),
      },
    });
  }

  async getShipmentCarrierReportRows() {
    return prisma.order.findMany({
      where: {
        deleted: false,
      },
      select: {
        carrierCariId: true,
        carrierCari: {
          select: {
            name: true,
          },
        },
        shipmentStatus: true,
        cargoShippedAt: true,
        cargoDeliveredAt: true,
      },
    });
  }

  async aggregateRevenue() {
    const where = {
      deleted: false,
      status: "CONFIRMED" as const,
    };

    const [aggregate, paidOrders, pendingPayments] = await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: {
          total: true,
          discountTotal: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.order.count({
        where: {
          ...where,
          paymentStatus: "PAID",
        },
      }),
      prisma.order.count({
        where: {
          ...where,
          paymentStatus: "PENDING",
        },
      }),
    ]);

    return {
      aggregate,
      paidOrders,
      pendingPayments,
    };
  }

  async findOrderById(id: string) {
    return (prisma.order as any).findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        carrierCari: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        statusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        paymentStatusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        stockReservations: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            warehouse: {
              select: {
                code: true,
              },
            },
            inventoryMovements: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                quantity: true,
                note: true,
                reservationId: true,
                createdAt: true,
                warehouse: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            documentNumber: true,
            documentType: true,
            status: true,
            externalSystemStatus: true,
            issueDate: true,
            totalAmount: true,
            currency: true,
            inventoryTransaction: {
              select: {
                transactionNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderShipment(args: {
    id: string;
    shipmentStatus?: "NOT_SHIPPED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED";
    shipmentAddressLine?: string | null;
    shipmentCity?: string | null;
    shipmentDistrict?: string | null;
    shipmentPostalCode?: string | null;
    shipmentCountry?: string | null;
    shipmentContactName?: string | null;
    shipmentContactPhone?: string | null;
    invoiceAddressLine?: string | null;
    invoiceCity?: string | null;
    invoiceDistrict?: string | null;
    invoicePostalCode?: string | null;
    carrierCompanyId?: string | null;
    cargoTrackingNumber?: string | null;
    cargoShippedAt?: Date | null;
    cargoDeliveredAt?: Date | null;
  }) {
    return prisma.order.update({
      where: {
        id: args.id,
      },
      data: {
        ...(args.shipmentStatus !== undefined ? { shipmentStatus: args.shipmentStatus } : {}),
        ...(args.shipmentAddressLine !== undefined ? { shipmentAddressLine: args.shipmentAddressLine } : {}),
        ...(args.shipmentCity !== undefined ? { shipmentCity: args.shipmentCity } : {}),
        ...(args.shipmentDistrict !== undefined ? { shipmentDistrict: args.shipmentDistrict } : {}),
        ...(args.shipmentPostalCode !== undefined ? { shipmentPostalCode: args.shipmentPostalCode } : {}),
        ...(args.shipmentCountry !== undefined ? { shipmentCountry: args.shipmentCountry } : {}),
        ...(args.shipmentContactName !== undefined ? { shipmentContactName: args.shipmentContactName } : {}),
        ...(args.shipmentContactPhone !== undefined ? { shipmentContactPhone: args.shipmentContactPhone } : {}),
        ...(args.invoiceAddressLine !== undefined ? { invoiceAddressLine: args.invoiceAddressLine } : {}),
        ...(args.invoiceCity !== undefined ? { invoiceCity: args.invoiceCity } : {}),
        ...(args.invoiceDistrict !== undefined ? { invoiceDistrict: args.invoiceDistrict } : {}),
        ...(args.invoicePostalCode !== undefined ? { invoicePostalCode: args.invoicePostalCode } : {}),
        ...(args.carrierCompanyId !== undefined ? { carrierCariId: args.carrierCompanyId } : {}),
        ...(args.cargoTrackingNumber !== undefined ? { cargoTrackingNumber: args.cargoTrackingNumber } : {}),
        ...(args.cargoShippedAt !== undefined ? { cargoShippedAt: args.cargoShippedAt } : {}),
        ...(args.cargoDeliveredAt !== undefined ? { cargoDeliveredAt: args.cargoDeliveredAt } : {}),
      },
      select: {
        id: true,
      },
    });
  }

  async updateOrderStatus(args: {
    id: string;
    fromStatus: "CONFIRMED" | "CANCELLED";
    toStatus: "CONFIRMED" | "CANCELLED";
    changedByUserId: string;
    note?: string;
  }) {
    return prisma.order.update({
      where: {
        id: args.id,
      },
      data: {
        status: args.toStatus,
        statusHistory: {
          create: {
            tenantId: requireTenantId(),
            fromStatus: args.fromStatus,
            toStatus: args.toStatus,
            source: "ADMIN",
            changedByUserId: args.changedByUserId,
            note: args.note ?? null,
          },
        },
      },
      include: {
        items: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        statusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        paymentStatusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        stockReservations: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            warehouse: {
              select: {
                code: true,
              },
            },
            inventoryMovements: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                quantity: true,
                note: true,
                reservationId: true,
                createdAt: true,
                warehouse: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            documentNumber: true,
            documentType: true,
            status: true,
            externalSystemStatus: true,
            issueDate: true,
            totalAmount: true,
            currency: true,
            inventoryTransaction: {
              select: {
                transactionNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderPaymentStatus(args: {
    id: string;
    fromStatus: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
    toStatus: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
    changedByUserId: string;
    note?: string;
  }) {
    return prisma.order.update({
      where: {
        id: args.id,
      },
      data: {
        paymentStatus: args.toStatus,
        paymentStatusHistory: {
          create: {
            tenantId: requireTenantId(),
            fromStatus: args.fromStatus,
            toStatus: args.toStatus,
            source: "ADMIN",
            changedByUserId: args.changedByUserId,
            note: args.note ?? null,
          },
        },
      },
      include: {
        items: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        statusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        paymentStatusHistory: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        stockReservations: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            warehouse: {
              select: {
                code: true,
              },
            },
            inventoryMovements: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                quantity: true,
                note: true,
                reservationId: true,
                createdAt: true,
                warehouse: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        businessDocuments: {
          where: {
            deleted: false,
          },
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            documentNumber: true,
            documentType: true,
            status: true,
            externalSystemStatus: true,
            issueDate: true,
            totalAmount: true,
            currency: true,
            inventoryTransaction: {
              select: {
                transactionNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async restockOrderInventory(args: {
    id: string;
    movementType: "ORDER_CANCEL_RESTOCK" | "RETURN_RESTOCK";
    note: string;
  }) {
    await this.runSerializableTransaction(async (tx) => {
      const tenantId = requireTenantId();

      const order = await tx.order.findFirst({
        where: {
          id: args.id,
          deleted: false,
        },
        select: {
          id: true,
          items: {
            where: {
              deleted: false,
            },
            select: {
              productId: true,
              quantity: true,
            },
          },
          stockReservations: {
            select: {
              id: true,
              inventoryItemId: true,
              warehouseId: true,
              quantity: true,
              status: true,
              inventoryMovements: {
                where: {
                  type: args.movementType,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error(`ORDER_NOT_FOUND:${args.id}`);
      }

      const reservationsToRestock = order.stockReservations.filter((reservation) => reservation.status === "COMMITTED" && reservation.inventoryMovements.length === 0);

      for (const reservation of reservationsToRestock) {
        const currentLevel = await this.getActiveLevelSnapshot(
          tx,
          reservation.inventoryItemId,
          reservation.warehouseId,
        );

        if (!currentLevel) {
          throw new Error(`RESTOCK_LEVEL_NOT_FOUND:${reservation.inventoryItemId}:${reservation.warehouseId}`);
        }

        await tx.inventoryLevel.update({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: reservation.inventoryItemId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            onHand: {
              increment: reservation.quantity,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            inventoryItemId: reservation.inventoryItemId,
            warehouseId: reservation.warehouseId,
            orderId: order.id,
            reservationId: reservation.id,
            type: args.movementType,
            quantity: reservation.quantity,
            note: args.note,
          },
        });

        await tx.stockReservation.update({
          where: {
            id: reservation.id,
          },
          data: {
            status: args.movementType === "ORDER_CANCEL_RESTOCK" ? "CANCELLED" : "RELEASED",
          },
        });
      }

      const restockedProductIds = new Set(order.items.map((item) => item.productId).filter((productId): productId is string => productId != null));

      for (const productId of restockedProductIds) {
        const product = await tx.product.findFirst({
          where: {
            id: productId,
            deleted: false,
          },
          select: {
            inventoryItem: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!product?.inventoryItem?.id) {
          continue;
        }

        await this.recalculateProductStockSummary(tx, productId, product.inventoryItem.id);
      }
    });
  }

  async softDeleteOrder(id: string, deletedUserId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: {
          orderId: id,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedDate: new Date(),
          deletedUserId,
        },
      });

      return tx.order.update({
        where: {
          id,
        },
        data: {
          deleted: true,
          deletedDate: new Date(),
          deletedUserId,
        },
      });
    });
  }

  async updateOrderCustomerAccountId(orderId: string, customerAccountId: string) {
    return prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        cariId: customerAccountId,
      },
    });
  }

  async findLatestBusinessDocumentForOrder(orderId: string) {
    return prisma.businessDocument.findFirst({
      where: {
        orderId,
        deleted: false,
      },
      orderBy: {
        issueDate: "desc",
      },
      select: {
        counterpartyName: true,
        counterpartyEmail: true,
      },
    });
  }
}
