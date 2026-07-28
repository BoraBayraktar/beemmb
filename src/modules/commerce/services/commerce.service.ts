import { z } from "zod";

import { redisCache } from "@/lib/redis";
import type {
  AdminOrderDetail,
  AdminOrderFinancialMovementEntry,
  AdminOrderDetailItem,
  AdminOrderDocumentSummaryItem,
  AdminOrderInventoryMovementEntry,
  AdminOrderInventorySummary,
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminOrderListResult,
  AdminPaymentStatusHistoryEntry,
  AdminOrderSummary,
  AdminOrderStatusHistoryEntry,
  AdminUpdateOrderStatusInput,
  CommerceCheckoutInput,
  CommerceCheckoutResult,
  CommerceLineQuote,
  CommerceQuoteInput,
  CommerceQuoteResult,
} from "@/modules/commerce/contracts/commerce.contract";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";
import { CommerceRepository } from "@/modules/commerce/repositories/commerce.repository";
import { integrationService } from "@/modules/integration/services/integration.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { pricingService } from "@/modules/pricing/services/pricing.service";

const lineSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

const quoteSchema = z.object({
  lines: z.array(lineSchema).min(1).max(30),
  promotionCode: z.string().trim().max(40).optional(),
});

const orderListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const orderIdSchema = z.object({
  id: z.string().trim().min(1),
});

const updateOrderStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED"]).optional(),
  refundFinancialAccountId: z.string().trim().optional(),
  changedByUserId: z.string().trim().min(1),
  note: z.string().trim().max(280).optional(),
}).refine((value) => Boolean(value.status || value.paymentStatus), {
  message: "Order status or payment status is required",
});

export class CommerceCheckoutError extends Error {
  constructor(message: string, public readonly status = 409) {
    super(message);
    this.name = "CommerceCheckoutError";
  }
}

export class CommerceOrderAdminError extends Error {
  constructor(message: string, public readonly status = 404) {
    super(message);
    this.name = "CommerceOrderAdminError";
  }
}

function normalizeLines(lines: CommerceQuoteInput["lines"]) {
  const aggregated = new Map<string, { productId: string; variantId?: string; quantity: number }>();

  for (const line of lines) {
    const key = `${line.productId}:${line.variantId ?? ""}`;
    const existing = aggregated.get(key);
    aggregated.set(key, {
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      quantity: (existing?.quantity ?? 0) + line.quantity,
    });
  }

  return [...aggregated.values()];
}

function mapQuoteLine(args: {
  line: { productId: string; variantId?: string; quantity: number };
  product: {
    productId: string;
    slug: string;
    sku: string;
    name: string;
    imageUrl: string;
    currency: string;
    unitPrice: number;
    compareAtPrice: number | null;
    availableStock: number;
    variantId: string | null;
    variantSlug: string | null;
    variantSku: string | null;
    variantTitle: string | null;
    variantOptionSummary: string | null;
  } | undefined;
}): CommerceLineQuote {
  if (!args.product) {
    return {
      productId: args.line.productId,
      variantId: args.line.variantId ?? null,
      variantSlug: null,
      variantSku: null,
      variantTitle: null,
      variantOptionSummary: null,
      slug: "",
      sku: "",
      name: "Unknown product",
      imageUrl: "",
      currency: "TRY",
      quantity: args.line.quantity,
      unitPrice: 0,
      compareAtPrice: null,
      lineTotal: 0,
      inStock: false,
      availableStock: 0,
    };
  }

  return {
    productId: args.product.productId,
    variantId: args.product.variantId,
    variantSlug: args.product.variantSlug,
    variantSku: args.product.variantSku,
    variantTitle: args.product.variantTitle,
    variantOptionSummary: args.product.variantOptionSummary,
    slug: args.product.slug,
    sku: args.product.sku,
    name: args.product.name,
    imageUrl: args.product.imageUrl,
    currency: args.product.currency,
    quantity: args.line.quantity,
    unitPrice: args.product.unitPrice,
    compareAtPrice: args.product.compareAtPrice,
    lineTotal: args.product.unitPrice * args.line.quantity,
    inStock: args.product.availableStock >= args.line.quantity,
    availableStock: args.product.availableStock,
  };
}

async function invalidateCatalogCache() {
  await Promise.all([
    redisCache.delByPrefix("catalog:list:"),
    redisCache.delByPrefix("catalog:detail:"),
    redisCache.del("catalog:categories"),
  ]);
}

function mapOrderDetailItem(item: {
  id: string;
  productId: string | null;
  productVariantId?: string | null;
  productSlug: string;
  productSku: string;
  productVariantSlug?: string | null;
  productVariantSku?: string | null;
  productVariantTitle?: string | null;
  productVariantOptionSummary?: string | null;
  productName: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: { toNumber: () => number };
  compareAtPrice: { toNumber: () => number } | null;
  lineTotal: { toNumber: () => number };
  currency: string;
}): AdminOrderDetailItem {
  return {
    id: item.id,
    productId: item.productId,
    productVariantId: item.productVariantId ?? null,
    productSlug: item.productSlug,
    productSku: item.productSku,
    productVariantSlug: item.productVariantSlug ?? null,
    productVariantSku: item.productVariantSku ?? null,
    productVariantTitle: item.productVariantTitle ?? null,
    productVariantOptionSummary: item.productVariantOptionSummary ?? null,
    productName: item.productName,
    productImageUrl: item.productImageUrl,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toNumber(),
    compareAtPrice: item.compareAtPrice?.toNumber() ?? null,
    lineTotal: item.lineTotal.toNumber(),
    currency: item.currency,
  };
}

function mapRestockStatus(args: {
  reservationCount: number;
  restockMovementCount: number;
}): "NOT_RESTOCKED" | "RESTOCKED" | "PARTIALLY_RESTOCKED" {
  if (args.restockMovementCount === 0) {
    return "NOT_RESTOCKED";
  }

  if (args.restockMovementCount < args.reservationCount) {
    return "PARTIALLY_RESTOCKED";
  }

  return "RESTOCKED";
}

function mapOrderDetail(order: {
  id: string;
  orderNumber: string;
  customerAccount: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  status: "CONFIRMED" | "CANCELLED";
  paymentStatus: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
  subtotal: { toNumber: () => number };
  discountTotal: { toNumber: () => number };
  total: { toNumber: () => number };
  promotionCode: string | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string | null;
    productVariantId?: string | null;
    productSlug: string;
    productSku: string;
    productVariantSlug?: string | null;
    productVariantSku?: string | null;
    productVariantTitle?: string | null;
    productVariantOptionSummary?: string | null;
    productName: string;
    productImageUrl: string;
    quantity: number;
    unitPrice: { toNumber: () => number };
    compareAtPrice: { toNumber: () => number } | null;
    lineTotal: { toNumber: () => number };
    currency: string;
  }>;
  stockReservations: Array<{
    id: string;
    quantity: number;
    status: "ACTIVE" | "RELEASED" | "COMMITTED" | "EXPIRED" | "CANCELLED";
    createdAt: Date;
    warehouse: {
      code: string;
    };
    inventoryMovements: Array<{
      id: string;
      type: string;
      quantity: number;
      note: string | null;
      reservationId: string | null;
      createdAt: Date;
      warehouse: {
        code: string;
      };
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: "CONFIRMED" | "CANCELLED" | null;
    toStatus: "CONFIRMED" | "CANCELLED";
    source: "SYSTEM" | "ADMIN";
    changedByUserId: string | null;
    note: string | null;
    createdAt: Date;
  }>;
  paymentStatusHistory: Array<{
    id: string;
    fromStatus: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED" | null;
    toStatus: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
    source: "SYSTEM" | "ADMIN";
    changedByUserId: string | null;
    note: string | null;
    createdAt: Date;
  }>;
  businessDocuments: Array<{
    id: string;
    documentNumber: string;
    documentType: "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";
    status: "DRAFT" | "LINKED" | "ISSUED" | "CANCELLED";
    externalSystemStatus: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
    issueDate: Date;
    totalAmount: { toNumber: () => number } | null;
    currency: string;
    inventoryTransaction: {
      transactionNumber: string;
    } | null;
  }>;
  financialMovements: Array<{
    id: string;
    account: {
      name: string;
    };
    direction: "IN" | "OUT" | "TRANSFER";
    sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND";
    category: "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER" | null;
    amount: { toNumber: () => number };
    currency: string;
    title: string;
    note: string | null;
    counterpartyName: string | null;
    transactionAt: Date;
  }>;
}): AdminOrderDetail {
  const statusHistory: AdminOrderStatusHistoryEntry[] = order.statusHistory.map((item) => ({
    id: item.id,
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    source: item.source,
    changedByUserId: item.changedByUserId,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
  }));

  const paymentStatusHistory: AdminPaymentStatusHistoryEntry[] = order.paymentStatusHistory.map((item) => ({
    id: item.id,
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    source: item.source,
    changedByUserId: item.changedByUserId,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
  }));

  const inventoryMovements: AdminOrderInventoryMovementEntry[] = order.stockReservations
    .flatMap((reservation) => reservation.inventoryMovements)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((movement) => ({
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      warehouseCode: movement.warehouse.code ?? null,
      reservationId: movement.reservationId,
      note: movement.note,
      createdAt: movement.createdAt.toISOString(),
    }));

  const totalReservedQuantity = order.stockReservations.reduce((sum, reservation) => sum + reservation.quantity, 0);
  const releasedReservationCount = order.stockReservations.filter((reservation) => reservation.status === "RELEASED").length;
  const cancelledReservationCount = order.stockReservations.filter((reservation) => reservation.status === "CANCELLED").length;
  const committedReservationCount = order.stockReservations.filter((reservation) => reservation.status === "COMMITTED").length;
  const activeReservationCount = order.stockReservations.filter((reservation) => reservation.status === "ACTIVE").length;
  const restockMovements = inventoryMovements.filter((movement) => movement.type === "ORDER_CANCEL_RESTOCK" || movement.type === "RETURN_RESTOCK");

  let restockStatus: AdminOrderInventorySummary["restockStatus"] = "NOT_RESTOCKED";
  if (restockMovements.length > 0 && restockMovements.length < order.stockReservations.length) {
    restockStatus = "PARTIALLY_RESTOCKED";
  } else if (restockMovements.length > 0) {
    restockStatus = "RESTOCKED";
  }

  const inventorySummary: AdminOrderInventorySummary = {
    reservationCount: order.stockReservations.length,
    committedReservationCount,
    releasedReservationCount,
    cancelledReservationCount,
    activeReservationCount,
    totalReservedQuantity,
    restockStatus,
    lastRestockedAt: restockMovements[0]?.createdAt ?? null,
  };

  const documents: AdminOrderDocumentSummaryItem[] = order.businessDocuments.map((item) => ({
    id: item.id,
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    status: item.status,
    externalSystemStatus: item.externalSystemStatus,
    issueDate: item.issueDate.toISOString(),
    totalAmount: item.totalAmount?.toNumber() ?? null,
    currency: item.currency,
    inventoryTransactionNumber: item.inventoryTransaction?.transactionNumber ?? null,
  }));

  const financialMovements: AdminOrderFinancialMovementEntry[] = order.financialMovements.map((item) => ({
    id: item.id,
    accountName: item.account.name,
    direction: item.direction,
    sourceType: item.sourceType,
    category: item.category,
    amount: item.amount.toNumber(),
    currency: item.currency,
    title: item.title,
    note: item.note,
    counterpartyName: item.counterpartyName,
    transactionAt: item.transactionAt.toISOString(),
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerAccountId: order.customerAccount?.id ?? null,
    customerAccountName: order.customerAccount?.name ?? null,
    customerAccountEmail: order.customerAccount?.email ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal.toNumber(),
    discountTotal: order.discountTotal.toNumber(),
    total: order.total.toNumber(),
    promotionCode: order.promotionCode,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(mapOrderDetailItem),
    documents,
    inventorySummary,
    inventoryMovements,
    financialMovements,
    statusHistory,
    paymentStatusHistory,
  };
}

export class CommerceService {
  constructor(private readonly repository: CommerceRepository) {}

  async quote(input: CommerceQuoteInput): Promise<CommerceQuoteResult> {
    const parsed = quoteSchema.parse(input);
    const normalized = normalizeLines(parsed.lines);
    const products = await inventoryService.getProductAvailability(
      normalized.map((line) => ({
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
      })),
    );
    const sellables = await this.repository.listSellableSnapshots(normalized);
    const productMap = new Map(products.map((item) => [`${item.productId}:${item.variantId ?? ""}`, item]));
    const sellableMap = new Map(sellables.map((item) => [`${item.productId}:${item.variantId ?? ""}`, item]));

    const lines = normalized.map((line) => {
      const availability = productMap.get(`${line.productId}:${line.variantId ?? ""}`);
      const sellable = sellableMap.get(`${line.productId}:${line.variantId ?? ""}`);

      if (!availability || !sellable) {
        return mapQuoteLine({ line, product: undefined });
      }

      const variantCap = sellable.variantStockOverride;
      const availableStock = typeof variantCap === "number"
        ? Math.max(0, Math.min(availability.availableStock, variantCap))
        : availability.availableStock;

      return mapQuoteLine({
        line,
        product: {
          productId: sellable.productId,
          slug: sellable.slug,
          sku: sellable.sku,
          name: sellable.name,
          imageUrl: sellable.imageUrl,
          currency: sellable.currency,
          unitPrice: sellable.unitPrice,
          compareAtPrice: sellable.compareAtPrice,
          availableStock,
          variantId: sellable.variantId,
          variantSlug: sellable.variantSlug,
          variantSku: sellable.variantSku,
          variantTitle: sellable.variantTitle,
          variantOptionSummary: sellable.variantOptionSummary,
        },
      });
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const promotion = await pricingService.evaluatePromotion({
      code: parsed.promotionCode,
      subtotal,
      currency: lines[0]?.currency ?? "TRY",
    });
    const discountTotal = promotion.discountTotal;
    const total = Math.max(0, subtotal - discountTotal);

    return {
      lines,
      subtotal,
      discountTotal,
      total,
      promotionCode: promotion.applied ? promotion.code : null,
      currency: lines[0]?.currency ?? "TRY",
      allInStock: lines.every((line) => line.inStock),
    };
  }

  async checkout(
    input: CommerceCheckoutInput,
    customerProfile?: {
      email: string;
      name: string;
    } | null,
  ): Promise<CommerceCheckoutResult> {
    const quote = await this.quote(input);

    if (quote.lines.length === 0) {
      throw new CommerceCheckoutError("Cart is empty", 400);
    }

    const missing = quote.lines.find((line) => !line.slug);
    if (missing) {
      throw new CommerceCheckoutError("Some products are no longer available", 409);
    }

    const outOfStock = quote.lines.find((line) => !line.inStock);
    if (outOfStock) {
      throw new CommerceCheckoutError("Insufficient stock for one or more products", 409);
    }

    const orderNumber = `ARV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let createdOrderNumber = orderNumber;
    const customerAccount = customerProfile
      ? await customerAccountService.ensureCustomerAccountFromUserProfile(customerProfile)
      : null;

    try {
      const createdOrder = await this.repository.createOrderAndCommitInventory({
        orderNumber,
        lines: quote.lines,
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        total: quote.total,
        promotionCode: quote.promotionCode,
        currency: quote.currency,
        customerAccountId: customerAccount?.id ?? null,
      });
      createdOrderNumber = createdOrder.orderNumber;
    } catch (error) {
      if (
        error instanceof Error
        && (
          error.message.startsWith("INSUFFICIENT_STOCK")
          || error.message.startsWith("STALE_RESERVATION_LEVEL")
          || error.message === "SERIALIZABLE_TRANSACTION_FAILED"
        )
      ) {
        throw new CommerceCheckoutError("Stok eşzamanlı değiştiği için sepet yeniden doğrulanmalıdır", 409);
      }

      throw error;
    }

    await invalidateCatalogCache();
    await Promise.all((["TRENDYOL", "N11", "HEPSIBURADA"] as const).map((channel) => integrationService.dispatchJobs({
      channel,
      jobType: "STOCK_SYNC",
      entityType: "PRODUCT",
      entityIds: Array.from(new Set(quote.lines.map((line) => line.productId))),
      idempotencySuffix: createdOrderNumber,
      payload: {
        trigger: "ORDER_COMMIT",
        reference: createdOrderNumber,
      },
    })));

    if (quote.promotionCode) {
      await pricingService.markPromotionUsage(quote.promotionCode);
    }

    return {
      orderNumber: createdOrderNumber,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      total: quote.total,
      promotionCode: quote.promotionCode,
      currency: quote.currency,
      lines: quote.lines,
    };
  }

  async listOrders(query: AdminOrderListQuery): Promise<AdminOrderListResult> {
    const parsed = orderListQuerySchema.parse(query);
    const [orders, total] = await Promise.all([
      this.repository.listOrders(parsed),
      this.repository.countOrders({ search: parsed.search, status: parsed.status, paymentStatus: parsed.paymentStatus }),
    ]);

    const items: AdminOrderListItem[] = orders.map((order: {
      id: string;
      orderNumber: string;
      customerAccount?: {
        id: string;
        name: string;
        email: string | null;
      } | null;
      status: AdminOrderListItem["status"];
      paymentStatus: AdminOrderListItem["paymentStatus"];
      stockReservations: Array<{
        inventoryMovements: Array<{
          createdAt: Date;
        }>;
      }>;
      subtotal: { toNumber(): number };
      discountTotal: { toNumber(): number };
      total: { toNumber(): number };
      promotionCode: string | null;
      currency: string;
      items: Array<{
        quantity: number;
      }>;
      createdAt: Date;
    }) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerAccountId: order.customerAccount?.id ?? null,
      customerAccountName: order.customerAccount?.name ?? null,
      status: order.status,
      paymentStatus: order.paymentStatus,
      restockStatus: mapRestockStatus({
        reservationCount: order.stockReservations.length,
        restockMovementCount: order.stockReservations.reduce(
          (sum: number, reservation: { inventoryMovements: Array<{ createdAt: Date }> }) => sum + reservation.inventoryMovements.length,
          0,
        ),
      }),
      lastRestockedAt: order.stockReservations
        .flatMap((reservation: { inventoryMovements: Array<{ createdAt: Date }> }) => reservation.inventoryMovements)
        .map((movement: { createdAt: Date }) => movement.createdAt)
        .sort((left: Date, right: Date) => right.getTime() - left.getTime())[0]?.toISOString() ?? null,
      subtotal: order.subtotal.toNumber(),
      discountTotal: order.discountTotal.toNumber(),
      total: order.total.toNumber(),
      promotionCode: order.promotionCode,
      currency: order.currency,
      itemCount: order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      items,
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async getOrderSummary(): Promise<AdminOrderSummary> {
    const aggregated = await this.repository.aggregateRevenue();

    return {
      totalOrders: aggregated.aggregate._count._all,
      totalRevenue: aggregated.aggregate._sum.total?.toNumber() ?? 0,
      totalDiscount: aggregated.aggregate._sum.discountTotal?.toNumber() ?? 0,
      paidOrders: aggregated.paidOrders,
      pendingPayments: aggregated.pendingPayments,
      currency: "TRY",
    };
  }

  async getOrderById(id: string): Promise<AdminOrderDetail> {
    const parsed = orderIdSchema.parse({ id });
    const [order, financialMovements] = await Promise.all([
      this.repository.findOrderById(parsed.id),
      financeRepository.listCashTransactionsBySourceReferenceId(parsed.id),
    ]);

    if (!order) {
      throw new CommerceOrderAdminError("Order not found", 404);
    }

    return mapOrderDetail({
      ...order,
      financialMovements,
    });
  }

  async updateOrderStatus(input: AdminUpdateOrderStatusInput): Promise<AdminOrderDetail> {
    const parsed = updateOrderStatusSchema.parse(input);

    const existing = await this.repository.findOrderById(parsed.id);
    if (!existing) {
      throw new CommerceOrderAdminError("Order not found", 404);
    }

    let current = existing;
    const shouldRestockForCancellation = parsed.status === "CANCELLED" && current.status !== "CANCELLED";
    const shouldRestockForRefund = parsed.paymentStatus === "REFUNDED" && current.paymentStatus !== "REFUNDED";

    if (parsed.status && current.status !== parsed.status) {
      current = await this.repository.updateOrderStatus({
        id: parsed.id,
        fromStatus: current.status,
        toStatus: parsed.status,
        changedByUserId: parsed.changedByUserId,
        note: parsed.note,
      });
    }

    if (parsed.paymentStatus && current.paymentStatus !== parsed.paymentStatus) {
      if (parsed.paymentStatus === "REFUNDED" && current.paymentStatus !== "REFUNDED" && !parsed.refundFinancialAccountId) {
        throw new CommerceOrderAdminError("Refund finans hesabı seçilmelidir.", 400);
      }

      current = await this.repository.updateOrderPaymentStatus({
        id: parsed.id,
        fromStatus: current.paymentStatus,
        toStatus: parsed.paymentStatus,
        changedByUserId: parsed.changedByUserId,
        note: parsed.note,
      });
    }

    if (shouldRestockForCancellation) {
      await this.repository.restockOrderInventory({
        id: parsed.id,
        movementType: "ORDER_CANCEL_RESTOCK",
        note: parsed.note ?? "Order cancelled and stock restored",
      });
      current = await this.repository.findOrderById(parsed.id) ?? current;
    } else if (shouldRestockForRefund) {
      await cashTransactionsService.createTransaction({
        accountId: parsed.refundFinancialAccountId as string,
        direction: "OUT",
        sourceType: "REFUND",
        category: "REFUND",
        sourceReferenceId: parsed.id,
        amount: current.total,
        title: `İade • ${current.orderNumber}`,
        note: parsed.note ?? `Sipariş iadesi • ${current.orderNumber}`,
        counterpartyName: current.customerAccountName ?? current.orderNumber,
        recordedByUserId: parsed.changedByUserId,
      });
      await this.repository.restockOrderInventory({
        id: parsed.id,
        movementType: "RETURN_RESTOCK",
        note: parsed.note ?? "Order refunded and stock restored",
      });
      current = await this.repository.findOrderById(parsed.id) ?? current;
    }

    return mapOrderDetail(current);
  }

  async softDeleteOrder(id: string, deletedUserId: string) {
    const parsed = orderIdSchema.parse({ id });

    const existing = await this.repository.findOrderById(parsed.id);
    if (!existing) {
      throw new CommerceOrderAdminError("Order not found", 404);
    }

    await this.repository.softDeleteOrder(parsed.id, deletedUserId);
  }

  async linkCustomerAccountFromOrderDocuments(orderId: string): Promise<string | null> {
    const order = await this.repository.findOrderById(orderId);

    if (!order) {
      return null;
    }

    if (order.customerAccount?.id) {
      return order.customerAccount.id;
    }

    const document = await this.repository.findLatestBusinessDocumentForOrder(orderId);

    if (!document?.counterpartyEmail) {
      return null;
    }

    const account = await customerAccountService.ensureCustomerAccountFromContact({
      name: document.counterpartyName,
      email: document.counterpartyEmail,
    });

    if (!account) {
      return null;
    }

    await this.repository.updateOrderCustomerAccountId(orderId, account.id);
    return account.id;
  }
}

export const commerceService = new CommerceService(new CommerceRepository());
