import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { TrendyolClient, type TrendyolProductV2CreateItem } from "@/modules/integration/connectors/trendyol.client";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { resolveAggregateAvailableStock } from "@/modules/inventory/services/inventory-stock-aggregate";

function decimalToNumber(value: { toNumber?: () => number; toString: () => string } | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value.toString());
}

function hasUsableImage(target: NonNullable<Awaited<ReturnType<MarketplaceIntegrationRepository["findProductSyncPreflightTarget"]>>>) {
  return Boolean(target.imageUrl?.trim() || target.imageUrls.some((item) => item.trim().length > 0));
}

function getUsableImages(...groups: Array<Array<string | null | undefined>>) {
  return Array.from(new Set(groups.flat().map((item) => item?.trim()).filter((item): item is string => Boolean(item)))).slice(0, 8);
}

function normalizeValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function toAttributePayload(item: {
  trendyolAttributeId: number;
  externalAttributeValueId: number | null;
  customAttributeValue: string | null;
}) {
  if (item.externalAttributeValueId) {
    return {
      attributeId: item.trendyolAttributeId,
      attributeValueId: item.externalAttributeValueId,
    };
  }

  return {
    attributeId: item.trendyolAttributeId,
    customAttributeValue: item.customAttributeValue ?? "",
  };
}

export class TrendyolProductSyncService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async preflightProduct(productId: string) {
    const [target, config] = await Promise.all([
      this.repository.findProductSyncPreflightTarget(productId),
      this.repository.listActiveConfigsByChannel("TRENDYOL").then((items) => items[0] ?? null),
    ]);

    if (!target) {
      throw new Error("TRENDYOL_PRODUCT_SYNC_PRODUCT_NOT_FOUND");
    }

    const aggregateAvailableStock = resolveAggregateAvailableStock(target.inventoryItem?.inventoryLevels ?? [], target.stock);

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      blockingIssues.push("Aktif Trendyol entegrasyon konfigürasyonu bulunmalıdır.");
    }

    if (!config?.trendyolCargoCompanyId) {
      blockingIssues.push("Product V2 için Trendyol kargo firma ID girilmelidir.");
    }

    if (!config?.trendyolOrigin) {
      blockingIssues.push("Product V2 için menşe ülke kodu girilmelidir.");
    }

    if (!config?.trendyolDimensionalWeight) {
      blockingIssues.push("Product V2 için desi bilgisi girilmelidir.");
    }

    if (target.status !== "ACTIVE" || !target.salesEnabled) {
      blockingIssues.push("Ürün aktif ve satışa açık olmalıdır.");
    }

    if (target.productType !== "PHYSICAL") {
      blockingIssues.push("Trendyol ürün aktarımı için ürün tipi fiziksel ürün olmalıdır.");
    }

    if (!target.barcode?.trim()) {
      blockingIssues.push("Trendyol ürün aktarımı için ürün barkodu zorunludur.");
    }

    if (!target.brand) {
      blockingIssues.push("Üründe marka seçimi zorunludur.");
    } else if (!target.brand.trendyolBrandId) {
      blockingIssues.push("Marka için Trendyol marka ID eşlemesi girilmelidir.");
    }

    if (!target.category) {
      blockingIssues.push("Üründe kategori seçimi zorunludur.");
    } else if (!target.category.trendyolCategoryId) {
      blockingIssues.push("Kategori için Trendyol kategori ID eşlemesi girilmelidir.");
    }

    if (!hasUsableImage(target)) {
      blockingIssues.push("Trendyol ürün aktarımı için en az bir ürün görseli gereklidir.");
    }

    const nonHttpsImages = getUsableImages([target.imageUrl], target.imageUrls).filter((url) => !url.startsWith("https://"));
    if (nonHttpsImages.length > 0) {
      blockingIssues.push("Trendyol ürün görselleri https URL olmalıdır.");
    }

    const salePrice = decimalToNumber(target.price);
    const compareAtPrice = decimalToNumber(target.compareAtPrice);
    const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;

    if (salePrice <= 0) {
      blockingIssues.push("Satış fiyatı sıfırdan büyük olmalıdır.");
    }

    if (target.currency !== "TRY") {
      warnings.push("Trendyol Türkiye ürün aktarımı için para birimi TRY olmalıdır.");
    }

    const variantBarcodesMissing = target.variants
      .filter((variant) => variant.salesEnabled && !variant.barcode?.trim())
      .map((variant) => variant.sku);

    if (variantBarcodesMissing.length > 0) {
      blockingIssues.push(`Satışa açık varyantlarda barkod eksik: ${variantBarcodesMissing.slice(0, 5).join(", ")}`);
    }

    const missingAttributeIds = new Set<string>();
    const missingValueMappings = new Set<string>();
    const mappedAttributeValues: Array<{
      variantSku: string;
      attributeName: string;
      localValue: string;
      trendyolAttributeId: number;
      externalAttributeValueId: number | null;
      externalAttributeValueName: string | null;
      customAttributeValue: string | null;
    }> = [];

    for (const variant of target.variants.filter((item) => item.salesEnabled)) {
      for (const attributeValue of variant.attributeValues) {
        const definition = attributeValue.attributeDefinition;

        if (!definition.trendyolAttributeId) {
          missingAttributeIds.add(definition.name);
          continue;
        }

        const mapping = definition.marketplaceValueMappings.find((item) => (
          normalizeValue(item.localValue) === normalizeValue(attributeValue.value)
        ));

        if (!mapping) {
          missingValueMappings.add(`${definition.name}: ${attributeValue.value}`);
          continue;
        }

        if (!mapping.externalAttributeValueId && !mapping.customAttributeValue?.trim()) {
          missingValueMappings.add(`${definition.name}: ${attributeValue.value}`);
          continue;
        }

        mappedAttributeValues.push({
          variantSku: variant.sku,
          attributeName: definition.name,
          localValue: attributeValue.value,
          trendyolAttributeId: definition.trendyolAttributeId,
          externalAttributeValueId: mapping.externalAttributeValueId,
          externalAttributeValueName: mapping.externalAttributeValueName,
          customAttributeValue: mapping.customAttributeValue,
        });
      }
    }

    if (missingAttributeIds.size > 0) {
      blockingIssues.push(`Trendyol attribute ID eksik: ${Array.from(missingAttributeIds).slice(0, 8).join(", ")}`);
    }

    if (missingValueMappings.size > 0) {
      blockingIssues.push(`Trendyol attribute value eşlemesi eksik: ${Array.from(missingValueMappings).slice(0, 8).join(", ")}`);
    }

    if (mappedAttributeValues.length === 0) {
      blockingIssues.push("Trendyol Product V2 için en az bir kategori attribute değeri eşlenmelidir.");
    }

    const dimensionalWeight = decimalToNumber(config?.trendyolDimensionalWeight);
    const productV2DraftPayload = blockingIssues.length === 0 && config && target.brand?.trendyolBrandId && target.category?.trendyolCategoryId
      ? {
          items: (target.variants.filter((variant) => variant.salesEnabled).length > 0
            ? target.variants.filter((variant) => variant.salesEnabled)
            : [{
                id: target.id,
                sku: target.sku,
                barcode: target.barcode,
                title: target.name,
                priceOverride: null,
                compareAtPriceOverride: null,
                stockOverride: aggregateAvailableStock,
                imageUrl: null,
                imageUrls: [],
                salesEnabled: true,
                attributeValues: [],
              }]).map((variant) => {
            const variantSalePrice = decimalToNumber(variant.priceOverride) || salePrice;
            const variantCompareAtPrice = decimalToNumber(variant.compareAtPriceOverride) || compareAtPrice;
            const variantListPrice = variantCompareAtPrice > 0 ? Math.max(variantCompareAtPrice, variantSalePrice) : listPrice;
            const attributes = mappedAttributeValues
              .filter((item) => item.variantSku === variant.sku)
              .map(toAttributePayload);
            const images = getUsableImages([variant.imageUrl], variant.imageUrls, [target.imageUrl], target.imageUrls)
              .map((url) => ({ url }));

            return {
              barcode: variant.barcode ?? target.barcode,
              title: variant.title,
              productMainId: target.sku,
              brandId: target.brand!.trendyolBrandId,
              categoryId: target.category!.trendyolCategoryId,
              quantity: Math.max(0, variant.stockOverride ?? aggregateAvailableStock),
              stockCode: variant.sku,
              description: target.description,
              currencyType: "TRY",
              listPrice: variantListPrice,
              salePrice: variantSalePrice,
              vatRate: target.vatRate,
              cargoCompanyId: config.trendyolCargoCompanyId,
              shipmentAddressId: config.trendyolShipmentAddressId ?? 0,
              returningAddressId: config.trendyolReturningAddressId ?? 0,
              origin: config.trendyolOrigin,
              dimensionalWeight,
              images,
              attributes,
            };
          }),
        }
      : null;

    return {
      productId: target.id,
      sku: target.sku,
      barcode: target.barcode,
      title: target.name,
      categoryName: target.category?.name ?? null,
      trendyolCategoryId: target.category?.trendyolCategoryId ?? null,
      brandName: target.brand?.name ?? null,
      trendyolBrandId: target.brand?.trendyolBrandId ?? null,
      cargoCompanyId: config?.trendyolCargoCompanyId ?? null,
      shipmentAddressId: config?.trendyolShipmentAddressId ?? null,
      returningAddressId: config?.trendyolReturningAddressId ?? null,
      origin: config?.trendyolOrigin ?? null,
      dimensionalWeight,
      salePrice,
      listPrice,
      vatRate: target.vatRate,
      variantCount: target.variants.length,
      mappedAttributeValueCount: mappedAttributeValues.length,
      mappedAttributeValues,
      productV2DraftPayload: productV2DraftPayload as { items: TrendyolProductV2CreateItem[] } | null,
      readyForTrendyolProductV2: blockingIssues.length === 0,
      blockingIssues,
      warnings,
    };
  }

  async syncProduct(productId: string) {
    const preflight = await this.preflightProduct(productId);

    if (!preflight.readyForTrendyolProductV2 || !preflight.productV2DraftPayload) {
      throw new Error(`TRENDYOL_PRODUCT_SYNC_PREFLIGHT_FAILED:${preflight.blockingIssues.join(" | ")}`);
    }

    const [config] = await this.repository.listActiveConfigsByChannel("TRENDYOL");

    if (!config) {
      throw new Error("TRENDYOL_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret || !config.userAgent) {
      throw new Error("TRENDYOL_CONFIG_INCOMPLETE");
    }

    const client = new TrendyolClient({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      userAgent: config.userAgent,
      storeFrontCode: config.storeFrontCode,
      endpointUrl: config.endpointUrl,
    });
    const result = await client.createProductsV2(preflight.productV2DraftPayload);

    return {
      providerKey: "trendyol",
      externalReference: result.batchRequestId ?? preflight.barcode,
      responsePayload: {
        ...result,
        mode: "PRODUCT_V2_CREATE",
        batchRequestId: result.batchRequestId,
        preflight,
      },
    };
  }
}

export const trendyolProductSyncService = new TrendyolProductSyncService();
