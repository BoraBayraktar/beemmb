import { redisCache } from "@/lib/redis";
import type { CommerceLineQuote } from "@/modules/commerce/contracts/commerce.contract";
import { CommerceRepository } from "@/modules/commerce/repositories/commerce.repository";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
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
  shipmentAddress?: Record<string, unknown> | null;
  invoiceAddress?: Record<string, unknown> | null;
  cargoProviderName?: string | null;
  cargoTrackingNumber?: string | null;
};

export type CreateMarketplaceOrderResult = {
  orderNumber: string;
};

type NormalizedAddress = {
  addressLine: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

const ADDRESS_LINE_KEYS = ["fullAddress", "address1", "address", "addressLine", "addressLine1", "openAddress", "street"];
const CITY_KEYS = ["city", "cityName", "il"];
const DISTRICT_KEYS = ["district", "districtName", "town", "ilce"];
const POSTAL_CODE_KEYS = ["postalCode", "postCode", "zipCode", "zip"];
const CONTACT_NAME_KEYS = ["fullName", "contactName", "recipientName", "name"];
const CONTACT_PHONE_KEYS = ["phone", "phoneNumber", "gsm", "gsmNumber", "mobilePhone"];

function pickString(source: Record<string, unknown>, candidateKeys: string[]): string | null {
  const lowerCasedKeys = new Map(Object.keys(source).map((key) => [key.toLowerCase(), key] as const));

  for (const candidate of candidateKeys) {
    const actualKey = lowerCasedKeys.get(candidate.toLowerCase());
    if (!actualKey) {
      continue;
    }

    const value = source[actualKey];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Pazaryeri kanallarının adres JSON şeması resmi olarak dokümante/doğrulanmamış olduğundan
 * (bkz. docs/PARASUT_CARGO_ALIGNMENT_PLAN.md Faz 3 risk notu), en yaygın Türkçe e-ticaret
 * pazaryeri alan adı takma isimleri denenir. Eşleşme bulunamazsa alan null kalır; ham veri
 * kaynağı olan MarketplaceOrderPackage kaydı değişmeden korunur, bilgi kaybolmaz.
 */
function normalizeMarketplaceAddress(raw: Record<string, unknown> | null | undefined): NormalizedAddress {
  if (!raw) {
    return {
      addressLine: null,
      city: null,
      district: null,
      postalCode: null,
      contactName: null,
      contactPhone: null,
    };
  }

  const firstName = pickString(raw, ["firstName"]);
  const lastName = pickString(raw, ["lastName"]);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  return {
    addressLine: pickString(raw, ADDRESS_LINE_KEYS),
    city: pickString(raw, CITY_KEYS),
    district: pickString(raw, DISTRICT_KEYS),
    postalCode: pickString(raw, POSTAL_CODE_KEYS),
    contactName: pickString(raw, CONTACT_NAME_KEYS) ?? combinedName,
    contactPhone: pickString(raw, CONTACT_PHONE_KEYS),
  };
}

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

    const shipment = normalizeMarketplaceAddress(input.shipmentAddress);
    const invoice = normalizeMarketplaceAddress(input.invoiceAddress);
    const cargoProviderName = input.cargoProviderName?.trim() || null;
    const matchedCarrier = cargoProviderName
      ? await catalogAdminService.findCarrierCompanyByName(cargoProviderName)
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
        shipmentAddressLine: shipment.addressLine,
        shipmentCity: shipment.city,
        shipmentDistrict: shipment.district,
        shipmentPostalCode: shipment.postalCode,
        shipmentContactName: shipment.contactName,
        shipmentContactPhone: shipment.contactPhone,
        invoiceAddressLine: invoice.addressLine,
        invoiceCity: invoice.city,
        invoiceDistrict: invoice.district,
        invoicePostalCode: invoice.postalCode,
        carrierCompanyId: matchedCarrier?.id ?? null,
        cargoTrackingNumber: input.cargoTrackingNumber?.trim() || null,
        shipmentSourceChannel: input.channel,
        externalCarrierNameRaw: matchedCarrier ? null : cargoProviderName,
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
