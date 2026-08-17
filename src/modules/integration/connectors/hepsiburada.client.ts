type HepsiburadaOrderLine = {
  lineId?: string | number;
  itemId?: string | number;
  orderLineId?: string | number;
  packageItemId?: string | number;
  merchantSku?: string;
  merchantSKU?: string;
  sku?: string;
  stockCode?: string;
  barcode?: string;
  productName?: string;
  productTitle?: string;
  quantity?: number | string;
  totalPrice?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  currency?: string;
  currencyCode?: string;
  [key: string]: unknown;
};

export type HepsiburadaOrderRow = {
  packageNumber?: string | number;
  packageNo?: string | number;
  packageId?: string | number;
  orderNumber?: string | number;
  orderNo?: string | number;
  merchantOrderNumber?: string | number;
  status?: string;
  orderDate?: string | number;
  lastModifiedDate?: string | number;
  customerName?: string;
  customerFullName?: string;
  customerEmail?: string;
  shipmentAddress?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  invoiceAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  cargoCompanyName?: string;
  cargoProviderName?: string;
  cargoTrackingNumber?: string;
  trackingNumber?: string;
  lines?: HepsiburadaOrderLine[];
  items?: HepsiburadaOrderLine[];
  lineItems?: HepsiburadaOrderLine[];
  packageItems?: HepsiburadaOrderLine[];
  [key: string]: unknown;
};

export type HepsiburadaOrderQuery = {
  startDate: Date;
  endDate: Date;
  pageSize?: number;
  maxPages?: number;
};

export type HepsiburadaListingUpdateInput = {
  merchantSku: string;
  hepsiburadaSku?: string | null;
  availableStock: number;
  price: number;
};

export type HepsiburadaPackageLineItemRequest = {
  id: string;
  quantity: number;
  serialNumbers?: string[];
};

export type HepsiburadaCreatePackageInput = {
  barcode?: string | null;
  cargoCompany?: string | null;
  carrier?: string | null;
  creationReason?: string | null;
  deci?: number | null;
  lineItemRequests: HepsiburadaPackageLineItemRequest[];
  parcelQuantity?: number | null;
  warehouse?: {
    shippingAddressLabel?: string | null;
    shippingModel?: string | null;
  } | null;
};

export type HepsiburadaInvoiceInput = {
  packageNumber: string;
  arrangementDate?: string | null;
  invoiceLink?: string | null;
  rowNumber?: string | null;
  serialNumber?: string | null;
  invoices?: Array<{
    arrangementDate?: string | null;
    contentType?: "application/pdf" | "text/html" | string | null;
    invoiceLink?: string | null;
    orderNumber?: string | null;
    rowNumber?: string | null;
    serialNumber?: string | null;
  }>;
};

export type HepsiburadaProductUpdateItem = {
  hbSku: string;
  productName?: string;
  productDescription?: string;
  barcode?: string;
  kdv?: string;
  warrantyPeriod?: string;
  desi?: string;
  isCustomizable?: string;
  video?: string;
  attributes?: Record<string, string>;
  [key: `image${number}`]: string | undefined;
};

type HepsiburadaOrderResponse =
  | HepsiburadaOrderRow[]
  | {
      data?: HepsiburadaOrderRow[] | { items?: HepsiburadaOrderRow[]; content?: HepsiburadaOrderRow[] };
      items?: HepsiburadaOrderRow[];
      content?: HepsiburadaOrderRow[];
      totalPages?: number;
      page?: number;
    };

function parseListPayload(payload: HepsiburadaOrderResponse) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      totalPages: 1,
    };
  }

  const nestedData = payload.data;

  if (Array.isArray(nestedData)) {
    return {
      items: nestedData,
      totalPages: Math.max(payload.totalPages ?? 1, 1),
    };
  }

  return {
    items: payload.items ?? payload.content ?? nestedData?.items ?? nestedData?.content ?? [],
    totalPages: Math.max(payload.totalPages ?? 1, 1),
  };
}

export class HepsiburadaClient {
  private readonly baseUrl: string;

  constructor(private readonly args: {
    merchantId: string;
    apiKey: string;
    apiSecret: string;
    userAgent: string;
    endpointUrl?: string | null;
  }) {
    this.baseUrl = (args.endpointUrl ?? "https://oms-external-sit.hepsiburada.com").replace(/\/$/, "");
  }

  private buildListingUrl(path: string) {
    const listingBaseUrl = this.baseUrl
      .replace("oms-external-sit.hepsiburada.com", "listing-external-sit.hepsiburada.com")
      .replace("oms-external.hepsiburada.com", "listing-external.hepsiburada.com");

    return new URL(path, `${listingBaseUrl}/`);
  }

  private buildHeaders() {
    const token = Buffer.from(`${this.args.apiKey}:${this.args.apiSecret}`, "utf8").toString("base64");

    return {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
      "User-Agent": this.args.userAgent,
    };
  }

  private buildBearerHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  }

  private buildMpopUrl(path: string) {
    const mpopBaseUrl = this.baseUrl
      .replace("oms-external-sit.hepsiburada.com", "mpop-sit.hepsiburada.com/ticket-api")
      .replace("oms-external.hepsiburada.com", "mpop.hepsiburada.com/ticket-api");

    return new URL(path, `${mpopBaseUrl.replace(/\/$/, "")}/`);
  }

  private async readJsonResponse(response: Response, errorCode: string) {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`${errorCode}:${response.status}:${errorBody.slice(0, 240)}`);
    }

    const responseText = await response.text().catch(() => "");
    if (!responseText.trim()) {
      return {
        ok: true,
      };
    }

    return JSON.parse(responseText) as Record<string, unknown>;
  }

  async getOrders(query: HepsiburadaOrderQuery) {
    const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
    const maxPages = Math.min(Math.max(query.maxPages ?? 20, 1), 100);
    const rows: HepsiburadaOrderRow[] = [];
    let totalPages = 1;

    for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
      const url = new URL(`${this.baseUrl}/orders/merchantid/${encodeURIComponent(this.args.merchantId)}`);
      url.searchParams.set("beginDate", query.startDate.toISOString());
      url.searchParams.set("endDate", query.endDate.toISOString());
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String((page - 1) * pageSize));

      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`HEPSIBURADA_GET_ORDERS_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
      }

      const payload = await response.json().catch(() => []) as HepsiburadaOrderResponse;
      const parsed = parseListPayload(payload);
      rows.push(...parsed.items);
      totalPages = parsed.totalPages;

      if (parsed.items.length < pageSize && parsed.totalPages === 1) {
        break;
      }
    }

    return rows;
  }

  private async postListingUpload(args: {
    type: "price" | "stock";
    payload: Record<string, unknown>[];
    errorCode: string;
  }) {
    const url = this.buildListingUrl(`/listings/merchantid/${encodeURIComponent(this.args.merchantId)}/${args.type}-uploads`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      body: JSON.stringify(args.payload),
      cache: "no-store",
    });

    return this.readJsonResponse(response, args.errorCode);
  }

  async uploadPrice(input: Pick<HepsiburadaListingUpdateInput, "merchantSku" | "hepsiburadaSku" | "price">) {
    const payload = {
      ...(input.hepsiburadaSku ? { hepsiburadaSku: input.hepsiburadaSku } : {}),
      merchantSku: input.merchantSku,
      price: input.price,
    };

    return this.postListingUpload({
      type: "price",
      payload: [payload],
      errorCode: "HEPSIBURADA_PRICE_UPLOAD_FAILED",
    });
  }

  async uploadStock(input: Pick<HepsiburadaListingUpdateInput, "merchantSku" | "hepsiburadaSku" | "availableStock">) {
    const payload = {
      ...(input.hepsiburadaSku ? { hepsiburadaSku: input.hepsiburadaSku } : {}),
      merchantSku: input.merchantSku,
      availableStock: input.availableStock,
    };

    return this.postListingUpload({
      type: "stock",
      payload: [payload],
      errorCode: "HEPSIBURADA_STOCK_UPLOAD_FAILED",
    });
  }

  private async getListingUploadResult(args: { type: "price" | "stock"; id: string; errorCode: string }) {
    const url = this.buildListingUrl(`/listings/merchantid/${encodeURIComponent(this.args.merchantId)}/${args.type}-uploads/id/${encodeURIComponent(args.id)}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`${args.errorCode}:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
  }

  async getPriceUploadResult(id: string) {
    return this.getListingUploadResult({
      type: "price",
      id,
      errorCode: "HEPSIBURADA_PRICE_UPLOAD_STATUS_FAILED",
    });
  }

  async getStockUploadResult(id: string) {
    return this.getListingUploadResult({
      type: "stock",
      id,
      errorCode: "HEPSIBURADA_STOCK_UPLOAD_STATUS_FAILED",
    });
  }

  async listPackageableWith(lineItemId: string) {
    const url = new URL(`${this.baseUrl}/lineitems/merchantid/${encodeURIComponent(this.args.merchantId)}/packageablewith/lineitemid/${encodeURIComponent(lineItemId)}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_PACKAGEABLE_LINE_ITEMS_FAILED");
  }

  async createPackage(input: HepsiburadaCreatePackageInput) {
    const url = new URL(`${this.baseUrl}/packages/merchantid/${encodeURIComponent(this.args.merchantId)}`);
    const payload = {
      ...(input.barcode ? { barcode: input.barcode } : {}),
      ...(input.cargoCompany ? { cargoCompany: input.cargoCompany } : {}),
      ...(input.carrier ? { carrier: input.carrier } : {}),
      ...(input.creationReason ? { creationReason: input.creationReason } : {}),
      ...(typeof input.deci === "number" ? { deci: input.deci } : {}),
      lineItemRequests: input.lineItemRequests.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        ...(line.serialNumbers?.length ? { serialNumbers: line.serialNumbers } : {}),
      })),
      ...(typeof input.parcelQuantity === "number" ? { parcelQuantity: input.parcelQuantity } : {}),
      ...(input.warehouse ? {
        warehouse: {
          ...(input.warehouse.shippingAddressLabel ? { shippingAddressLabel: input.warehouse.shippingAddressLabel } : {}),
          ...(input.warehouse.shippingModel ? { shippingModel: input.warehouse.shippingModel } : {}),
        },
      } : {}),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_CREATE_PACKAGE_FAILED");
  }

  /**
   * Paketlenmiş bir siparişin kargo firmasını değiştirir. Hepsiburada'nın kendi kargo firması
   * kısa adı (ShortName) kullanılır — bu, beemmb'nin dahili CarrierCompany kaydından farklı bir
   * kimlik alanıdır (bkz. CarrierCompany.externalCodeHepsiburada).
   * Kaynak: "Paketli Siparişin Kargo Firmasının Değiştirilmesi",
   * PUT /packages/merchantid/{merchantId}/packagenumber/{packageNumber}/changecargocompany
   */
  async changePackageCargoCompany(packageNumber: string, cargoCompanyShortName: string) {
    const url = new URL(`${this.baseUrl}/packages/merchantid/${encodeURIComponent(this.args.merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/changecargocompany`);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      body: JSON.stringify({ CargoCompanyShortName: cargoCompanyShortName }),
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_CHANGE_PACKAGE_CARGO_COMPANY_FAILED");
  }

  /**
   * Belirli bir paketin güncel kargo/takip bilgisini okur. Takip numarası Hepsiburada/entegre
   * kargo firması tarafından üretilir — merchant tarafından girilmez, yalnızca geri okunur.
   * Kaynak: "Paket İçin Kargo Bilgilerini Listeleme",
   * GET /packages/merchantid/{merchantId}/packagenumber/{packagenumber}
   */
  async getPackageShippingInfo(packageNumber: string) {
    const url = new URL(`${this.baseUrl}/packages/merchantid/${encodeURIComponent(this.args.merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_GET_PACKAGE_SHIPPING_INFO_FAILED");
  }

  async sendInvoiceLink(input: HepsiburadaInvoiceInput) {
    const url = new URL(`${this.baseUrl}/packages/merchantid/${encodeURIComponent(this.args.merchantId)}/packagenumber/${encodeURIComponent(input.packageNumber)}/invoice`);
    const payload = {
      ...(input.arrangementDate ? { arrangementDate: input.arrangementDate } : {}),
      ...(input.invoiceLink ? { invoiceLink: input.invoiceLink } : {}),
      ...(input.rowNumber ? { rowNumber: input.rowNumber } : {}),
      ...(input.serialNumber ? { serialNumber: input.serialNumber } : {}),
      ...(input.invoices?.length ? { invoices: input.invoices } : {}),
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...this.buildHeaders(),
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_SEND_INVOICE_LINK_FAILED");
  }

  async importProductUpdates(input: {
    serviceToken: string;
    version?: number;
    items: HepsiburadaProductUpdateItem[];
  }) {
    const url = this.buildMpopUrl("/api/integrator/import");
    url.searchParams.set("version", String(input.version ?? 1));

    const formData = new FormData();
    const payload = {
      merchantId: this.args.merchantId,
      items: input.items,
    };
    const file = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("file", file, "integrator-ticket-upload.json");

    const response = await fetch(url, {
      method: "POST",
      headers: this.buildBearerHeaders(input.serviceToken),
      body: formData,
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_PRODUCT_UPDATE_IMPORT_FAILED");
  }

  async getProductUpdateStatus(input: { serviceToken: string; trackingId: string; page?: number; size?: number; version?: number }) {
    const url = this.buildMpopUrl(`/api/integrator/status/${encodeURIComponent(input.trackingId)}`);
    url.searchParams.set("version", String(input.version ?? 1));
    url.searchParams.set("page", String(input.page ?? 0));
    url.searchParams.set("size", String(input.size ?? 1000));

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildBearerHeaders(input.serviceToken),
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_PRODUCT_UPDATE_STATUS_FAILED");
  }

  async getProductUpdateHistory(input: { serviceToken: string; hbSku: string }) {
    const url = this.buildMpopUrl(`/api/integrator/merchant/${encodeURIComponent(this.args.merchantId)}/hbSku/${encodeURIComponent(input.hbSku)}`);

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildBearerHeaders(input.serviceToken),
      cache: "no-store",
    });

    return this.readJsonResponse(response, "HEPSIBURADA_PRODUCT_UPDATE_HISTORY_FAILED");
  }

  async testConnection() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 10 * 60000);

    await this.getOrders({
      startDate,
      endDate,
      pageSize: 1,
      maxPages: 1,
    });

    return {
      ok: true,
    };
  }
}
