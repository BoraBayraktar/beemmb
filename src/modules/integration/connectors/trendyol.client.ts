export type TrendyolShipmentPackageLine = {
  id?: number | string;
  productName?: string;
  merchantSku?: string;
  sku?: string;
  barcode?: string;
  quantity?: number;
  amount?: number;
  price?: number;
  currencyCode?: string;
  [key: string]: unknown;
};

export type TrendyolShipmentPackage = {
  id?: number | string;
  orderNumber?: string;
  status?: string;
  orderDate?: number;
  packageLastModifiedDate?: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  shipmentAddress?: Record<string, unknown>;
  invoiceAddress?: Record<string, unknown>;
  cargoProviderName?: string;
  cargoTrackingNumber?: string;
  lines?: TrendyolShipmentPackageLine[];
  [key: string]: unknown;
};

export type TrendyolShipmentPackageQuery = {
  startDate: Date;
  endDate: Date;
  status?: string;
  pageSize?: number;
  maxPages?: number;
};

export type TrendyolCancelUnsuppliedItemsInput = {
  packageId: string;
  lines: Array<{
    lineId: string;
    quantity: number;
  }>;
  reasonId: number;
};

export type TrendyolUpdatePackageStatusInput = {
  packageId: string;
  status: "Picking" | "Invoiced";
  lines: Array<{
    lineId: string;
    quantity: number;
  }>;
  invoiceNumber?: string | null;
};

export type TrendyolSplitShipmentPackageInput = {
  packageId: string;
  packageDetails: Array<{
    orderLineId: string;
    quantity: number;
  }>;
};

export type TrendyolPriceAndInventoryItem = {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
};

export type TrendyolProductV2CreateItem = {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  description: string;
  currencyType: "TRY";
  listPrice: number;
  salePrice: number;
  vatRate: number;
  images: Array<{ url: string }>;
  attributes: Array<{
    attributeId: number;
    attributeValueId?: number;
    customAttributeValue?: string;
  }>;
};

type TrendyolShipmentPackageResponse = {
  content?: TrendyolShipmentPackage[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
};

type TrendyolShipmentPackageStreamResponse = {
  content?: TrendyolShipmentPackage[];
  hasMore?: boolean;
  nextCursor?: string;
  size?: number;
};

/** Trendyol'un v2/orders "maxQueryWindowResult" kısıtı: tek bir filtreli sorguda page*size 10.000'i geçemez (page=0..49, size<=200). */
const TRENDYOL_MAX_QUERY_WINDOW_RESULT = 10000;

type TrendyolBrandItem = {
  id?: number;
  name?: string;
};

type TrendyolBrandListResponse = {
  brands?: TrendyolBrandItem[];
};

type TrendyolCategoryItem = {
  id?: number;
  name?: string;
  parentId?: number | null;
  subCategories?: TrendyolCategoryItem[] | false;
};

type TrendyolCategoryTreeResponse = {
  categories?: TrendyolCategoryItem[];
};

type TrendyolCategoryAttributeItem = {
  attribute?: {
    id?: number;
    name?: string;
  };
  required?: boolean;
  allowCustom?: boolean;
  varianter?: boolean;
  slicer?: boolean;
};

type TrendyolCategoryAttributeResponse = {
  categoryAttributes?: TrendyolCategoryAttributeItem[];
};

type TrendyolCategoryAttributeValueItem = {
  attributeValueId?: number;
  attributeValue?: string;
  id?: number;
  name?: string;
};

type TrendyolCategoryAttributeValueResponse = {
  content?: TrendyolCategoryAttributeValueItem[];
};

export class TrendyolClient {
  private readonly baseUrl: string;

  constructor(private readonly args: {
    sellerId: string;
    apiKey: string;
    apiSecret: string;
    userAgent: string;
    endpointUrl?: string | null;
    storeFrontCode?: string | null;
  }) {
    this.baseUrl = (args.endpointUrl ?? "https://apigw.trendyol.com").replace(/\/$/, "");
  }

  private buildHeaders() {
    const token = Buffer.from(`${this.args.apiKey}:${this.args.apiSecret}`, "utf8").toString("base64");

    return {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
      "User-Agent": this.args.userAgent,
    };
  }

  /** Trendyol'un 15 Ekim 2026'da zorunlu kılacağı v2/orders endpoint'i - maksimum erişilebilir pencere 10.000 kayıt (page 0-49, size<=200). */
  async getShipmentPackages(query: TrendyolShipmentPackageQuery) {
    const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
    const maxSafePages = Math.floor(TRENDYOL_MAX_QUERY_WINDOW_RESULT / pageSize);
    const maxPages = Math.min(Math.max(query.maxPages ?? 20, 1), 100, maxSafePages);
    const packages: TrendyolShipmentPackage[] = [];
    let totalPages = 1;

    for (let page = 0; page < totalPages && page < maxPages; page += 1) {
      const url = new URL(`${this.baseUrl}/integration/order/sellers/${this.args.sellerId}/v2/orders`);
      url.searchParams.set("startDate", String(query.startDate.getTime()));
      url.searchParams.set("endDate", String(query.endDate.getTime()));
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(pageSize));
      url.searchParams.set("orderByField", "PackageLastModifiedDate");
      url.searchParams.set("orderByDirection", "ASC");

      if (query.status) {
        url.searchParams.set("status", query.status);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`TRENDYOL_GET_SHIPMENT_PACKAGES_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
      }

      const payload = await response.json() as TrendyolShipmentPackageResponse;
      packages.push(...(payload.content ?? []));
      totalPages = Math.max(payload.totalPages ?? 1, 1);

      if ((payload.totalElements ?? 0) > TRENDYOL_MAX_QUERY_WINDOW_RESULT) {
        console.warn(`TRENDYOL_QUERY_WINDOW_EXCEEDED: totalElements=${payload.totalElements}, bu filtreyle en fazla ilk ${TRENDYOL_MAX_QUERY_WINDOW_RESULT} kayda erişilebilir. Büyük veri taraması için getShipmentPackagesStream kullanılmalı.`);
      }
    }

    return packages;
  }

  /**
   * Cursor tabanlı akış endpoint'i (getShipmentPackagesStream) - büyük veri taraması ve periyodik senkronizasyon
   * için Trendyol'un önerdiği yöntem; 10.000 kayıt penceresi kısıtına tabi değildir.
   */
  async getShipmentPackagesStream(query: TrendyolShipmentPackageQuery & { maxIterations?: number }) {
    const size = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
    const maxIterations = Math.min(Math.max(query.maxIterations ?? query.maxPages ?? 20, 1), 100);
    const packages: TrendyolShipmentPackage[] = [];
    let nextCursor: string | undefined;
    let hasMore = true;

    for (let iteration = 0; iteration < maxIterations && hasMore; iteration += 1) {
      const url = new URL(`${this.baseUrl}/integration/order/sellers/${this.args.sellerId}/orders/stream`);
      url.searchParams.set("lastModifiedStartDate", String(query.startDate.getTime()));
      url.searchParams.set("lastModifiedEndDate", String(query.endDate.getTime()));
      url.searchParams.set("size", String(size));

      if (query.status) {
        url.searchParams.set("packageItemStatuses", query.status);
      }

      if (nextCursor) {
        url.searchParams.set("nextCursor", nextCursor);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`TRENDYOL_GET_SHIPMENT_PACKAGES_STREAM_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
      }

      const payload = await response.json() as TrendyolShipmentPackageStreamResponse;
      packages.push(...(payload.content ?? []));
      hasMore = Boolean(payload.hasMore);
      nextCursor = payload.nextCursor;

      if (hasMore && iteration + 1 < maxIterations) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    return packages;
  }

  async testConnection() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 10 * 60000);

    await this.getShipmentPackages({
      startDate,
      endDate,
      pageSize: 1,
      maxPages: 1,
    });

    return {
      ok: true,
    };
  }

  async searchBrands(name: string) {
    const query = name.trim();

    if (query.length < 2) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/integration/product/brands/by-name`);
    url.searchParams.set("name", query);

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_SEARCH_BRANDS_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => []) as TrendyolBrandItem[] | TrendyolBrandListResponse;
    const brands = Array.isArray(payload) ? payload : payload.brands ?? [];

    return brands
      .filter((item): item is Required<Pick<TrendyolBrandItem, "id" | "name">> => Boolean(item.id && item.name))
      .map((item) => ({
        id: item.id,
        name: item.name,
      }));
  }

  async searchCategories(name: string) {
    const query = name.trim();

    if (query.length < 2) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/integration/product/product-categories`);
    url.searchParams.set("name", query);

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_SEARCH_CATEGORIES_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => ({})) as TrendyolCategoryTreeResponse;
    const flattened: Array<{ id: number; name: string; path: string; leaf: boolean }> = [];

    function visit(items: TrendyolCategoryItem[] | false | undefined, ancestors: string[]) {
      if (!Array.isArray(items)) {
        return;
      }

      for (const item of items) {
        if (!item.id || !item.name) {
          continue;
        }

        const childItems = Array.isArray(item.subCategories) ? item.subCategories : [];
        const pathParts = [...ancestors, item.name];

        flattened.push({
          id: item.id,
          name: item.name,
          path: pathParts.join(" > "),
          leaf: childItems.length === 0,
        });

        visit(childItems, pathParts);
      }
    }

    visit(payload.categories, []);
    return flattened.filter((item) => item.leaf).slice(0, 50);
  }

  async getCategoryAttributes(categoryId: number) {
    const response = await fetch(`${this.baseUrl}/integration/product/categories/${categoryId}/attributes`, {
      method: "GET",
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_CATEGORY_ATTRIBUTES_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => ({})) as TrendyolCategoryAttributeResponse;

    return (payload.categoryAttributes ?? [])
      .filter((item) => item.attribute?.id && item.attribute.name)
      .map((item) => ({
        id: item.attribute!.id!,
        name: item.attribute!.name!,
        required: Boolean(item.required),
        allowCustom: Boolean(item.allowCustom),
        varianter: Boolean(item.varianter),
        slicer: Boolean(item.slicer),
      }));
  }

  async getCategoryAttributeValues(categoryId: number, attributeId: number) {
    const values: Array<{ id: number; name: string }> = [];
    let totalPages = 1;

    for (let page = 0; page < totalPages && page < 5; page += 1) {
      const url = new URL(`${this.baseUrl}/integration/product/categories/${categoryId}/attributes/${attributeId}/values`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", "1000");

      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`TRENDYOL_CATEGORY_ATTRIBUTE_VALUES_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
      }

      const payload = await response.json().catch(() => ({})) as TrendyolCategoryAttributeValueResponse & { totalPages?: number };
      totalPages = Math.max(payload.totalPages ?? 1, 1);
      values.push(...(payload.content ?? [])
        .map((item) => ({
          id: item.attributeValueId ?? item.id ?? 0,
          name: item.attributeValue ?? item.name ?? "",
        }))
        .filter((item) => item.id > 0 && item.name.trim().length > 0));
    }

    return values;
  }

  async updatePackageStatus(input: TrendyolUpdatePackageStatusInput) {
    const url = new URL(`${this.baseUrl}/integration/order/sellers/${this.args.sellerId}/shipment-packages/${input.packageId}`);
    const body = {
      status: input.status,
      lines: input.lines.map((line) => ({
        lineId: Number(line.lineId),
        quantity: line.quantity,
      })),
      params: input.status === "Invoiced" && input.invoiceNumber
        ? { invoiceNumber: input.invoiceNumber }
        : {},
    };
    const headers = {
      ...this.buildHeaders(),
      ...(this.args.storeFrontCode ? { storeFrontCode: this.args.storeFrontCode } : {}),
    };

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_UPDATE_PACKAGE_STATUS_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const text = await response.text().catch(() => "");
    return {
      requestPayload: body,
      responsePayload: text ? { body: text } : { ok: true },
    };
  }

  /** Tedarik Edememe Bildirimi - paket içindeki bir/birden fazla kalemi tedarik edilemedi diye iptal eder; sonucunda yeni bir shipmentPackageId oluşur. */
  async cancelUnsuppliedItems(input: TrendyolCancelUnsuppliedItemsInput) {
    const url = new URL(`${this.baseUrl}/integration/order/sellers/${this.args.sellerId}/shipment-packages/${input.packageId}/items/unsupplied`);
    const body = {
      lines: input.lines.map((line) => ({
        lineId: Number(line.lineId),
        quantity: line.quantity,
      })),
      reasonId: input.reasonId,
    };
    const headers = {
      ...this.buildHeaders(),
      ...(this.args.storeFrontCode ? { storeFrontCode: this.args.storeFrontCode } : {}),
    };

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_CANCEL_UNSUPPLIED_ITEMS_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const text = await response.text().catch(() => "");
    return {
      requestPayload: body,
      responsePayload: text ? { body: text } : { ok: true },
    };
  }

  async splitShipmentPackage(input: TrendyolSplitShipmentPackageInput) {
    const body = {
      splitPackages: [
        {
          packageDetails: input.packageDetails.map((line) => ({
            orderLineId: Number(line.orderLineId),
            quantities: line.quantity,
          })),
        },
      ],
    };
    const headers = {
      ...this.buildHeaders(),
      ...(this.args.storeFrontCode ? { storeFrontCode: this.args.storeFrontCode } : {}),
    };

    const response = await fetch(`${this.baseUrl}/integration/order/sellers/${this.args.sellerId}/shipment-packages/${input.packageId}/split-packages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_SPLIT_SHIPMENT_PACKAGE_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    return {
      requestPayload: body,
      responsePayload: payload,
    };
  }

  async updatePriceAndInventory(input: { items: TrendyolPriceAndInventoryItem[] }) {
    const items = input.items.slice(0, 1000).map((item) => ({
      barcode: item.barcode,
      quantity: Math.max(0, Math.trunc(item.quantity)),
      salePrice: item.salePrice,
      listPrice: Math.max(item.listPrice, item.salePrice),
    }));
    const body = { items };
    const headers = {
      ...this.buildHeaders(),
      ...(this.args.storeFrontCode ? { storeFrontCode: this.args.storeFrontCode } : {}),
    };
    const response = await fetch(`${this.baseUrl}/integration/inventory/sellers/${this.args.sellerId}/products/price-and-inventory`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_PRICE_AND_INVENTORY_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => ({})) as { batchRequestId?: string };
    return {
      batchRequestId: payload.batchRequestId ?? null,
      requestPayload: body,
      responsePayload: payload,
    };
  }

  async createProductsV2(input: { items: TrendyolProductV2CreateItem[] }) {
    const body = {
      items: input.items.slice(0, 1000),
    };
    const headers = {
      ...this.buildHeaders(),
      ...(this.args.storeFrontCode ? { storeFrontCode: this.args.storeFrontCode } : {}),
    };
    const response = await fetch(`${this.baseUrl}/integration/product/sellers/${this.args.sellerId}/v2/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_CREATE_PRODUCTS_V2_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const payload = await response.json().catch(() => ({})) as { batchRequestId?: string };
    return {
      batchRequestId: payload.batchRequestId ?? null,
      requestPayload: body,
      responsePayload: payload,
    };
  }

  async getBatchRequestResult(batchRequestId: string) {
    const response = await fetch(`${this.baseUrl}/integration/product/sellers/${this.args.sellerId}/products/batch-requests/${batchRequestId}`, {
      method: "GET",
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`TRENDYOL_BATCH_REQUEST_RESULT_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
  }
}
