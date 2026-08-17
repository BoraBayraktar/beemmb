export type N11ShipmentPackageLine = {
  orderLineId?: number | string;
  stockCode?: string;
  barcode?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  sellerInvoiceAmount?: number;
  orderItemLineItemStatusName?: string;
  [key: string]: unknown;
};

export type N11ShipmentPackage = {
  id?: number | string | null;
  orderNumber?: string | number;
  shipmentPackageStatus?: string;
  lastModifiedDate?: number;
  customerEmail?: string;
  customerfullName?: string;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  cargoProviderName?: string;
  cargoTrackingNumber?: string;
  shipmentCompanyId?: number | string;
  cargoSenderNumber?: string | number;
  cargoTrackingLink?: string;
  shipmentMethod?: number | string;
  lines?: N11ShipmentPackageLine[];
  [key: string]: unknown;
};

export type N11ShipmentPackageQuery = {
  startDate: Date;
  endDate: Date;
  status?: string;
  pageSize?: number;
  maxPages?: number;
};

type N11ShipmentPackagesResponse = {
  content?: N11ShipmentPackage[];
  totalPages?: number;
  page?: number;
  size?: number;
};

type N11UpdateOrderResponse = {
  content?: Array<{
    lineId?: number | string;
    status?: string;
    reasons?: string;
  }>;
};

type N11SplitPackageResponse = {
  code?: number;
  message?: string;
  splitPackageOrderItems?: Array<{
    orderNumber?: string;
    packageId?: string;
    orderLineId?: number | string;
    stockCode?: string;
    quantity?: number;
  }>;
};

type N11CollectionRequestResponse = {
  code?: number;
  message?: string;
};

/** Toplama Talebi'nde (CollectionRequest) kabul edilen sabit lojistik firma kısa kodları. */
export const N11_COLLECTION_REQUEST_SHIPMENT_COMPANIES = ["HLZ", "CEVA", "BL"] as const;
export type N11CollectionRequestShipmentCompany = (typeof N11_COLLECTION_REQUEST_SHIPMENT_COMPANIES)[number];

/** cancelReasonId degerleri (splitPackageByQuantity > cancelledItems). */
export const N11_CANCEL_REASON_IDS = [61, 62, 63, 64, 65] as const;

type N11PriceStockTaskResponse = {
  id?: number | string;
  type?: string;
  status?: string;
  reasons?: string[];
};

type N11TaskDetailsResponse = {
  taskId?: number | string;
  status?: string;
  skus?: Record<string, unknown>;
  [key: string]: unknown;
};

type N11ProductUpdateTaskResponse = {
  id?: number | string;
  type?: string;
  status?: string;
  reasons?: string[];
};

export class N11Client {
  private readonly baseUrl: string;

  constructor(private readonly args: {
    sellerId: string;
    apiKey: string;
    apiSecret: string;
    endpointUrl?: string | null;
  }) {
    this.baseUrl = (args.endpointUrl ?? "https://api.n11.com").replace(/\/$/, "");
  }

  private buildHeaders() {
    return {
      appkey: this.args.apiKey,
      appsecret: this.args.apiSecret,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async getShipmentPackages(query: N11ShipmentPackageQuery) {
    const pageSize = Math.min(Math.max(query.pageSize ?? 100, 1), 100);
    const maxPages = Math.min(Math.max(query.maxPages ?? 20, 1), 100);
    const packages: N11ShipmentPackage[] = [];
    let totalPages = 1;

    for (let page = 0; page < totalPages && page < maxPages; page += 1) {
      const url = new URL(`${this.baseUrl}/rest/delivery/v1/shipmentPackages`);
      url.searchParams.set("startDate", String(query.startDate.getTime()));
      url.searchParams.set("endDate", String(query.endDate.getTime()));
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(pageSize));
      url.searchParams.set("orderByField", "true");
      url.searchParams.set("orderByDirection", "ASC");
      url.searchParams.set("sender", "SELLER");

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
        throw new Error(`N11_GET_SHIPMENT_PACKAGES_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
      }

      const payload = await response.json() as N11ShipmentPackagesResponse;
      packages.push(...(payload.content ?? []));
      totalPages = Math.max(payload.totalPages ?? 1, 1);
    }

    return packages;
  }

  async updateOrderLinesToPicking(lineIds: string[]) {
    const response = await fetch(`${this.baseUrl}/rest/order/v1/update`, {
      method: "PUT",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        lines: lineIds.map((lineId) => ({ lineId: Number(lineId) || lineId })),
        status: "Picking",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_UPDATE_ORDER_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11UpdateOrderResponse>;
  }

  async splitPackageByQuantity(splitPackages: Array<{
    packageDetails: Array<{
      orderLineId: string;
      quantities: number;
    }>;
  }>, cancelledItems?: Array<{
    orderLineId: string;
    quantity: number;
    cancelReasonId: number;
  }>) {
    const response = await fetch(`${this.baseUrl}/rest/delivery/v1/splitPackageByQuantity`, {
      method: "POST",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        splitPackages: splitPackages.map((item) => ({
          packageDetails: item.packageDetails.map((detail) => ({
            orderLineId: Number(detail.orderLineId) || detail.orderLineId,
            quantities: detail.quantities,
          })),
        })),
        ...(cancelledItems && cancelledItems.length > 0 ? {
          cancelledItems: cancelledItems.map((item) => ({
            orderLineId: Number(item.orderLineId) || item.orderLineId,
            quantity: item.quantity,
            cancelReasonId: item.cancelReasonId,
          })),
        } : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_SPLIT_PACKAGE_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11SplitPackageResponse>;
  }

  /** Toplama Talebi (CollectionRequest) - Picking statusundeki paket icin kargo firmasina teslim/toplama talebi olusturur. */
  async createCollectionRequest(details: Array<{
    id: string;
    orderLineId: string;
    boxQuantity: number;
    desi: number;
    shipmentCompany: N11CollectionRequestShipmentCompany;
  }>) {
    const response = await fetch(`${this.baseUrl}/rest/delivery/v1/collectionRequest`, {
      method: "PUT",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        collectionRequestDetails: details.map((detail) => ({
          id: detail.id,
          orderLineId: Number(detail.orderLineId) || detail.orderLineId,
          boxQuantity: detail.boxQuantity,
          desi: detail.desi,
          shipmentCompany: detail.shipmentCompany,
        })),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_COLLECTION_REQUEST_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11CollectionRequestResponse>;
  }

  async updateProductPriceAndStock(input: {
    integrator: string;
    skus: Array<{
      stockCode: string;
      listPrice?: number;
      salePrice?: number;
      quantity?: number;
      currencyType?: "TL" | "USD" | "EUR";
    }>;
  }) {
    const response = await fetch(`${this.baseUrl}/ms/product/tasks/price-stock-update`, {
      method: "POST",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        payload: {
          integrator: input.integrator,
          skus: input.skus,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_PRICE_STOCK_UPDATE_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11PriceStockTaskResponse>;
  }

  async getTaskDetails(taskId: string, page = 0, size = 1000) {
    const response = await fetch(`${this.baseUrl}/ms/product/task-details/page-query`, {
      method: "POST",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        taskId: Number(taskId) || taskId,
        pageable: {
          page,
          size,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_TASK_DETAILS_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11TaskDetailsResponse>;
  }

  async updateProducts(input: {
    integrator: string;
    skus: Array<{
      stockCode: string;
      status?: "Active" | "Suspended";
      description?: string;
      vatRate?: number;
      productMainId?: string;
      deleteProductMainId?: boolean;
      maxPurchaseQuantity?: number;
      deleteMaxPurchaseQuantity?: boolean;
    }>;
  }) {
    const response = await fetch(`${this.baseUrl}/ms/product/tasks/product-update`, {
      method: "POST",
      headers: this.buildHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        payload: {
          integrator: input.integrator,
          skus: input.skus,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`N11_PRODUCT_UPDATE_FAILED:${response.status}:${errorBody.slice(0, 240)}`);
    }

    return response.json() as Promise<N11ProductUpdateTaskResponse>;
  }

  async testConnection() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 10 * 60000);
    await this.getShipmentPackages({
      startDate,
      endDate,
      pageSize: 1,
      maxPages: 1,
      status: "Created",
    });
    return { ok: true };
  }
}
