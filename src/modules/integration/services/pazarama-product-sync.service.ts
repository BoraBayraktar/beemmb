import { PazaramaClient, type PazaramaCreateProductItem } from "@/modules/integration/connectors/pazarama.client";
import { IntegrationRepository } from "@/modules/integration/repositories/integration.repository";
import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";
import { resolveAggregateAvailableStock } from "@/modules/inventory/services/inventory-stock-aggregate";

function normalizeValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function hasUsableImage(target: NonNullable<Awaited<ReturnType<MarketplaceIntegrationRepository["findProductSyncPreflightTarget"]>>>) {
  return Boolean(target.imageUrl?.trim() || target.imageUrls.some((item) => item.trim().length > 0));
}

function getUsableImages(...groups: Array<Array<string | null | undefined>>) {
  return Array.from(new Set(groups.flat().map((item) => item?.trim()).filter((item): item is string => Boolean(item)))).slice(0, 8);
}

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

export class PazaramaProductSyncService {
  constructor(
    private readonly repository = new MarketplaceIntegrationRepository(),
    private readonly integrationRepository = new IntegrationRepository(),
  ) {}

  async preflightProduct(productId: string) {
    const [target, config] = await Promise.all([
      this.repository.findProductSyncPreflightTarget(productId),
      this.repository.listActiveConfigsByChannel("PAZARAMA").then((items) => items[0] ?? null),
    ]);

    if (!target) {
      throw new Error("PAZARAMA_PRODUCT_SYNC_PRODUCT_NOT_FOUND");
    }

    const aggregateAvailableStock = resolveAggregateAvailableStock(target.inventoryItem?.inventoryLevels ?? [], 0);

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      blockingIssues.push("Aktif Pazarama entegrasyon konfigürasyonu bulunmalıdır.");
    }

    if (target.status !== "ACTIVE" || !target.salesEnabled) {
      blockingIssues.push("Ürün aktif ve satışa açık olmalıdır.");
    }

    if (target.productType !== "PHYSICAL") {
      blockingIssues.push("Pazarama ürün aktarımı için ürün tipi fiziksel ürün olmalıdır.");
    }

    if (!target.barcode?.trim()) {
      blockingIssues.push("Pazarama ürün aktarımı için ürün barkodu zorunludur.");
    }

    if (!target.brand) {
      blockingIssues.push("Üründe marka seçimi zorunludur.");
    } else if (!target.brand.pazaramaBrandId?.trim()) {
      blockingIssues.push("Marka için Pazarama marka ID eşlemesi girilmelidir.");
    }

    if (!target.category) {
      blockingIssues.push("Üründe kategori seçimi zorunludur.");
    } else if (!target.category.pazaramaCategoryId?.trim()) {
      blockingIssues.push("Kategori için Pazarama kategori ID eşlemesi girilmelidir.");
    }

    if (!hasUsableImage(target)) {
      blockingIssues.push("Pazarama ürün aktarımı için en az bir ürün görseli gereklidir.");
    }

    const mappedAttributeValues: Array<{
      variantSku: string;
      attributeName: string;
      localValue: string;
      externalAttributeValueName: string | null;
      customAttributeValue: string | null;
    }> = [];
    const missingValueMappings = new Set<string>();

    for (const variant of target.variants.filter((item) => item.salesEnabled)) {
      for (const attributeValue of variant.attributeValues) {
        const mapping = attributeValue.attributeDefinition.marketplaceValueMappings.find((item) => (
          item.channel === "PAZARAMA" && normalizeValue(item.localValue) === normalizeValue(attributeValue.value)
        ));

        if (!mapping || (!mapping.externalAttributeValueName?.trim() && !mapping.customAttributeValue?.trim())) {
          missingValueMappings.add(`${attributeValue.attributeDefinition.name}: ${attributeValue.value}`);
          continue;
        }

        mappedAttributeValues.push({
          variantSku: variant.sku,
          attributeName: attributeValue.attributeDefinition.name,
          localValue: attributeValue.value,
          externalAttributeValueName: mapping.externalAttributeValueName,
          customAttributeValue: mapping.customAttributeValue,
        });
      }
    }

    if (missingValueMappings.size > 0) {
      warnings.push(`Pazarama attribute value eşlemesi eksik: ${Array.from(missingValueMappings).slice(0, 8).join(", ")}`);
    }

    let resolvedAttributesByVariant = new Map<string, Array<{ attributeId: string; attributeValueId: string }>>();

    if (config && target.category?.pazaramaCategoryId && mappedAttributeValues.length > 0) {
      const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
      const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

      if (!apiKey || !apiSecret) {
        blockingIssues.push("Pazarama config eksik olduğu için kategori attribute doğrulaması yapılamadı.");
      } else {
        const client = new PazaramaClient({
          apiKey,
          apiSecret,
          endpointUrl: config.endpointUrl,
        });

        const categoryAttributes = await client.getCategoryAttributes(target.category.pazaramaCategoryId);
        const unresolvedAttributeMappings = new Set<string>();
        resolvedAttributesByVariant = mappedAttributeValues.reduce((acc, item) => {
          const categoryAttribute = categoryAttributes.find((attribute) => normalizeValue(attribute.name) === normalizeValue(item.attributeName));
          const attributeValue = categoryAttribute?.values.find((value) => (
            normalizeValue(value.name) === normalizeValue(item.externalAttributeValueName ?? item.localValue)
            || normalizeValue(value.name) === normalizeValue(item.localValue)
          ));

          if (!categoryAttribute || !attributeValue) {
            unresolvedAttributeMappings.add(`${item.attributeName}: ${item.externalAttributeValueName ?? item.localValue}`);
            return acc;
          }

          const existing = acc.get(item.variantSku) ?? [];
          existing.push({
            attributeId: categoryAttribute.id,
            attributeValueId: attributeValue.id,
          });
          acc.set(item.variantSku, existing);
          return acc;
        }, new Map<string, Array<{ attributeId: string; attributeValueId: string }>>());

        if (unresolvedAttributeMappings.size > 0) {
          blockingIssues.push(`Pazarama attribute çözümlemesi başarısız: ${Array.from(unresolvedAttributeMappings).slice(0, 8).join(", ")}`);
        }
      }
    }

    const draftPayload = config && target.brand?.pazaramaBrandId && target.category?.pazaramaCategoryId
      ? {
          products: (target.variants.filter((item) => item.salesEnabled).length > 0 ? target.variants.filter((item) => item.salesEnabled) : [
            {
              sku: target.sku,
              barcode: target.barcode,
              title: target.name,
              priceOverride: target.price,
              compareAtPriceOverride: target.compareAtPrice,
              imageUrl: target.imageUrl,
              imageUrls: target.imageUrls,
              inventoryItem: target.inventoryItem,
            },
          ]).map((variant) => {
            const salePrice = decimalToNumber(variant.priceOverride) || decimalToNumber(target.price);
            const compareAtPrice = variant.compareAtPriceOverride != null
              ? decimalToNumber(variant.compareAtPriceOverride)
              : decimalToNumber(target.compareAtPrice);
            const listPrice = compareAtPrice > 0 ? Math.max(compareAtPrice, salePrice) : salePrice;
            const variantAvailableStock = resolveAggregateAvailableStock(variant.inventoryItem?.inventoryLevels ?? [], aggregateAvailableStock);

            return {
              Name: variant.title ?? target.name,
              DisplayName: variant.title ?? target.name,
              Description: target.description,
              brandId: target.brand!.pazaramaBrandId!,
              Desi: 1,
              Code: (variant.barcode ?? target.barcode)!,
              groupCode: target.sku.slice(0, 10),
              StockCount: Math.max(0, variantAvailableStock),
              stockCode: variant.sku,
              VatRate: target.vatRate,
              ListPrice: listPrice,
              SalePrice: salePrice,
              currencyType: "TRY" as const,
              CategoryId: target.category!.pazaramaCategoryId!,
              images: getUsableImages([variant.imageUrl], variant.imageUrls, [target.imageUrl], target.imageUrls).map((imageurl) => ({ imageurl })),
              attributes: resolvedAttributesByVariant.get(variant.sku) ?? [],
              deliveries: [],
            } satisfies PazaramaCreateProductItem;
          }),
        }
      : null;

    return {
      productId: target.id,
      sku: target.sku,
      title: target.name,
      readyForPazaramaProductSync: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      mappedAttributeValueCount: mappedAttributeValues.length,
      variantCount: target.variants.length,
      draftPayload,
    };
  }

  async syncProduct(productId: string) {
    const preflight = await this.preflightProduct(productId);

    if (!preflight.readyForPazaramaProductSync || !preflight.draftPayload) {
      throw new Error(`PAZARAMA_PRODUCT_SYNC_PREFLIGHT_FAILED:${preflight.blockingIssues.join(" | ")}`);
    }

    const [config] = await this.repository.listActiveConfigsByChannel("PAZARAMA");

    if (!config) {
      throw new Error("PAZARAMA_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("PAZARAMA_CONFIG_INCOMPLETE");
    }

    const client = new PazaramaClient({
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });
    const result = await client.createProducts(preflight.draftPayload);
    const batchRequestId = result.data?.batchRequestId ?? null;

    return {
      providerKey: "pazarama",
      externalReference: batchRequestId ?? preflight.sku,
      responsePayload: {
        ...result,
        batchRequestId,
        preflight,
      },
    };
  }

  async getBatchResultForJob(jobId: string) {
    const job = await this.integrationRepository.findJobById(jobId);

    if (!job) {
      throw new Error("INTEGRATION_JOB_NOT_FOUND");
    }

    if (job.channel !== "PAZARAMA" || job.jobType !== "PRODUCT_SYNC") {
      throw new Error("PAZARAMA_BATCH_JOB_UNSUPPORTED");
    }

    const responsePayload = job.responsePayload && typeof job.responsePayload === "object"
      ? job.responsePayload as Record<string, unknown>
      : {};
    const batchRequestId = typeof responsePayload.batchRequestId === "string"
      ? responsePayload.batchRequestId
      : job.externalReference;

    if (!batchRequestId) {
      throw new Error("PAZARAMA_BATCH_REQUEST_ID_NOT_FOUND");
    }

    const [config] = await this.repository.listActiveConfigsByChannel("PAZARAMA");

    if (!config) {
      throw new Error("PAZARAMA_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("PAZARAMA_CONFIG_INCOMPLETE");
    }

    const client = new PazaramaClient({
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });
    const result = await client.getProductBatchResult(batchRequestId);
    const nextPayload = {
      ...responsePayload,
      batchRequestId,
      batchCheckedAt: new Date().toISOString(),
      batchResult: result,
      batchStatus: result.data?.status ?? null,
      failedCount: result.data?.failedCount ?? null,
    };

    if ((result.data?.status ?? 0) === 3) {
      const reason = result.data?.failedProducts?.map((item) => item.errorReason).filter((item): item is string => Boolean(item?.trim())).join(" | ")
        || "PAZARAMA_BATCH_RESULT_FAILED";
      await this.integrationRepository.markJobObservedFailure({
        id: job.id,
        lastError: reason,
        retryDelayMinutes: 15,
        responsePayload: nextPayload,
      });
    } else {
      await this.integrationRepository.updateJobResponsePayload({
        id: job.id,
        externalReference: batchRequestId,
        responsePayload: nextPayload,
      });
    }

    return {
      jobId: job.id,
      batchRequestId,
      result,
    };
  }

  async followUpPendingBatches(input: { limit?: number; minCheckIntervalMinutes?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    const staleBefore = new Date(Date.now() - Math.min(Math.max(input.minCheckIntervalMinutes ?? 15, 1), 1440) * 60000);
    const jobs = await this.integrationRepository.listPendingPazaramaBatchCheckJobs({
      limit,
      staleBefore,
    });

    let checked = 0;
    let failed = 0;
    const items: Array<{ jobId: string; batchRequestId: string | null; ok: boolean; errorMessage: string | null }> = [];

    for (const job of jobs) {
      try {
        const result = await this.getBatchResultForJob(job.id);
        checked += 1;
        items.push({
          jobId: job.id,
          batchRequestId: result.batchRequestId,
          ok: true,
          errorMessage: null,
        });
      } catch (error) {
        failed += 1;
        items.push({
          jobId: job.id,
          batchRequestId: job.externalReference,
          ok: false,
          errorMessage: error instanceof Error ? error.message : "PAZARAMA_BATCH_FOLLOW_UP_FAILED",
        });
      }
    }

    return {
      scanned: jobs.length,
      checked,
      failed,
      items,
    };
  }
}

export const pazaramaProductSyncService = new PazaramaProductSyncService();
