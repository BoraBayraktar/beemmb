import { MarketplaceIntegrationRepository } from "@/modules/integration/repositories/marketplace-integration.repository";
import { N11Client } from "@/modules/integration/connectors/n11.client";
import { integrationSecretCryptoService } from "@/modules/integration/services/integration-secret-crypto.service";

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

export class N11ProductSyncService {
  constructor(private readonly repository = new MarketplaceIntegrationRepository()) {}

  async preflightProduct(productId: string) {
    const [target, config] = await Promise.all([
      this.repository.findProductSyncPreflightTarget(productId),
      this.repository.listActiveConfigsByChannel("N11").then((items) => items[0] ?? null),
    ]);

    if (!target) {
      throw new Error("N11_PRODUCT_SYNC_PRODUCT_NOT_FOUND");
    }

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      blockingIssues.push("Aktif N11 entegrasyon konfigürasyonu bulunmalıdır.");
    }

    if (target.status !== "ACTIVE" || !target.salesEnabled) {
      warnings.push("Ürün aktif veya satışa açık değilse N11 tarafında Suspended olarak güncellenecektir.");
    }

    if (!target.sku.trim()) {
      blockingIssues.push("N11 ürün güncellemesi için stok kodu zorunludur.");
    }

    if (!target.description.trim()) {
      blockingIssues.push("N11 ürün güncellemesi için açıklama zorunludur.");
    }

    if (target.description.trim().length < 80) {
      warnings.push("Ürün açıklaması kısa görünüyor. N11 içerik kalitesi için daha açıklayıcı metin önerilir.");
    }

    if (![0, 1, 10, 20].includes(target.vatRate)) {
      blockingIssues.push("N11 ürün güncellemesi için KDV oranı 0, 1, 10 veya 20 olmalıdır.");
    }

    if (!target.barcode?.trim()) {
      warnings.push("Üründe barkod yok. N11 operasyonunda eşleştirme ve takip için barkod önerilir.");
    }

    if (!hasUsableImage(target)) {
      warnings.push("Üründe görsel bulunmuyor. N11 ürün kalitesi için en az bir görsel önerilir.");
    }

    if (!target.brand) {
      warnings.push("Üründe marka seçilmemiş. Katalog bütünlüğü için marka önerilir.");
    }

    if (!target.category) {
      warnings.push("Üründe kategori seçilmemiş. Katalog bütünlüğü için kategori önerilir.");
    }

    if (target.currency !== "TRY") {
      warnings.push("N11 Türkiye mağazası için para birimi genellikle TRY olmalıdır.");
    }

    const derivedProductMainId = target.id;
    const maxPurchaseQuantity = 0;

    const syncStatus: "Active" | "Suspended" = target.status === "ACTIVE" && target.salesEnabled
      ? "Active"
      : "Suspended";

    return {
      productId: target.id,
      sku: target.sku,
      status: target.status,
      salesEnabled: target.salesEnabled,
      descriptionLength: target.description.length,
      vatRate: target.vatRate,
      derivedProductMainId,
      maxPurchaseQuantity,
      blockingIssues,
      warnings,
      readyForN11ProductUpdate: blockingIssues.length === 0,
      draftPayload: blockingIssues.length === 0
        ? {
            payload: {
              integrator: config?.displayName ?? "BEEMMB",
              skus: [
                {
                  stockCode: target.sku,
                  status: syncStatus,
                  description: target.description,
                  vatRate: target.vatRate,
                  productMainId: derivedProductMainId,
                  deleteProductMainId: false,
                  deleteMaxPurchaseQuantity: true,
                },
              ],
            },
          }
        : null,
    };
  }

  async syncProduct(productId: string) {
    const preflight = await this.preflightProduct(productId);

    if (!preflight.readyForN11ProductUpdate || !preflight.draftPayload) {
      throw new Error(`N11_PRODUCT_SYNC_PREFLIGHT_FAILED:${preflight.blockingIssues.join(" | ")}`);
    }

    const [config] = await this.repository.listActiveConfigsByChannel("N11");

    if (!config) {
      throw new Error("N11_CONFIG_NOT_FOUND");
    }

    const apiKey = integrationSecretCryptoService.decrypt(config.apiKeyEncrypted);
    const apiSecret = integrationSecretCryptoService.decrypt(config.apiSecretEncrypted);

    if (!apiKey || !apiSecret) {
      throw new Error("N11_CONFIG_INCOMPLETE");
    }

    const client = new N11Client({
      sellerId: config.sellerId,
      apiKey,
      apiSecret,
      endpointUrl: config.endpointUrl,
    });

    const skuPayload = preflight.draftPayload.payload.skus[0];
    const result = await client.updateProducts(preflight.draftPayload.payload);

    return {
      providerKey: "n11",
      externalReference: typeof result.id === "number" || typeof result.id === "string" ? String(result.id) : preflight.sku,
      responsePayload: {
        ...result,
        taskId: typeof result.id === "number" || typeof result.id === "string" ? String(result.id) : null,
        preflight,
        stockCode: skuPayload.stockCode,
        productStatus: skuPayload.status,
        vatRate: skuPayload.vatRate,
        productMainId: skuPayload.productMainId,
        descriptionLength: skuPayload.description?.length ?? 0,
      },
    };
  }
}

export const n11ProductSyncService = new N11ProductSyncService();
