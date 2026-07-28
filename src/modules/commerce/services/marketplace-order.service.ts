import { redisCache } from "@/lib/redis";
import type { CommerceLineQuote } from "@/modules/commerce/contracts/commerce.contract";
import { CommerceRepository } from "@/modules/commerce/repositories/commerce.repository";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";

export type MarketplaceOrderLineInput = {
  productId: string;
  productVariantId: string | null;
  quantity: number;
  unitPrice: number | null;
  currency: string;
};

import type { MarketplaceIntegrationChannel } from "@/modules/integration/contracts/integration.contract";

export type CreateMarketplaceOrderInput = {
  channel: MarketplaceIntegrationChannel;
  externalOrderNumber: string;
  customerName?: string | null;
  customerEmail?: string | null;
  lines: MarketplaceOrderLineInput[];
};

export type CreateMarketplaceOrderResult = {
  orderNumber: string;
};

export class MarketplaceOrderCreationError extends Error {
  constructor(message: string, public readonly status = 409) {
    super(message);
    this.name = "MarketplaceOrderCreationError";
  }
}

async function invalidateCatalogCache() {
  await Promise.all([
    redisCache.delByPrefix("catalog:list:"),
    redisCache.delByPrefix("catalog:detail:"),
    redisCache.del("catalog:categories"),
  ]);
}

export class MarketplaceOrderService {
  constructor(private readonly repository = new CommerceRepository()) {}

  async createOrderFromMarketplace(input: CreateMarketplaceOrderInput): Promise<CreateMarketplaceOrderResult> {
    if (input.lines.length === 0) {
      throw new MarketplaceOrderCreationError("MARKETPLACE_ORDER_EMPTY_LINES", 400);
    }

    const orderNumber = `${input.channel}-${input.externalOrderNumber}`;
    const existing = await this.repository.findOrderByNumber(orderNumber);

    if (existing) {
      return {
        orderNumber: existing.orderNumber,
      };
    }

    const snapshots = await this.repository.listSellableSnapshots(input.lines.map((line) => ({
      productId: line.productId,
      ...(line.productVariantId ? { variantId: line.productVariantId } : {}),
    })));

    const quoteLines: CommerceLineQuote[] = input.lines.map((line) => {
      const snapshot = snapshots.find((item) => (
        item.productId === line.productId
        && item.variantId === line.productVariantId
      ));

      if (!snapshot) {
        throw new MarketplaceOrderCreationError("MARKETPLACE_ORDER_PRODUCT_NOT_SELLABLE", 409);
      }

      const unitPrice = line.unitPrice ?? snapshot.unitPrice;
      const currency = line.currency || snapshot.currency;

      return {
        productId: snapshot.productId,
        variantId: snapshot.variantId,
        variantSlug: snapshot.variantSlug,
        variantSku: snapshot.variantSku,
        variantTitle: snapshot.variantTitle,
        variantOptionSummary: snapshot.variantOptionSummary,
        slug: snapshot.slug,
        sku: snapshot.sku,
        name: snapshot.name,
        imageUrl: snapshot.imageUrl,
        currency,
        quantity: line.quantity,
        unitPrice,
        compareAtPrice: snapshot.compareAtPrice,
        lineTotal: unitPrice * line.quantity,
        inStock: true,
        availableStock: 0,
      };
    });

    const subtotal = quoteLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const customerAccount = input.customerName?.trim()
      ? await customerAccountService.ensureCustomerAccountFromContact({
          name: input.customerName,
          email: input.customerEmail ?? null,
        })
      : null;

    try {
      const created = await this.repository.createOrderAndCommitInventory({
        orderNumber,
        lines: quoteLines,
        subtotal,
        discountTotal: 0,
        total: subtotal,
        promotionCode: null,
        currency: quoteLines[0]?.currency ?? "TRY",
        customerAccountId: customerAccount?.id ?? null,
      });
      await invalidateCatalogCache();
      return created;
    } catch (error) {
      if (
        error instanceof Error
        && (
          error.message.startsWith("INSUFFICIENT_STOCK")
          || error.message.startsWith("STALE_RESERVATION_LEVEL")
          || error.message === "SERIALIZABLE_TRANSACTION_FAILED"
        )
      ) {
        throw new MarketplaceOrderCreationError("MARKETPLACE_ORDER_STOCK_CHANGED", 409);
      }

      throw error;
    }
  }
}

export const marketplaceOrderService = new MarketplaceOrderService();
