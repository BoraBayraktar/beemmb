import { z } from "zod";
import { createHash } from "node:crypto";

import type {
  AuditLogAction,
  AuditLogEntityType,
  AuditLogItem,
  AuditLogListQuery,
  AuditLogListResult,
  CreateAuditLogInput,
} from "@/modules/system/contracts/audit-log.contract";
import {
  AUDIT_LOG_ACTIONS,
  AUDIT_LOG_ENTITY_TYPES,
} from "@/modules/system/contracts/audit-log.contract";
import { createRequestId, getRequestIdFromHeaders } from "@/lib/observability";
import { AuditLogRepository } from "@/modules/system/repositories/audit-log.repository";

export const auditLogEntityLabels: Record<AuditLogEntityType, string> = {
  USER: "Kullanıcı",
  PRODUCT: "Ürün",
  BRAND: "Marka",
  CARRIER_COMPANY: "Kargo Firması",
  SUPPLIER: "Tedarikçi",
  PRODUCT_ATTRIBUTE: "Ürün Özelliği",
  CUSTOMER_ACCOUNT: "Cari Müşteri Kartı",
  CATEGORY: "Kategori",
  ORDER: "Sipariş",
  BUSINESS_DOCUMENT: "Belge",
  INCOMING_INVOICE: "Gelen Fatura",
  FINANCE_COLLECTION: "Tahsilat",
  FINANCE_PAYMENT: "Ödeme",
  WAREHOUSE: "Depo",
  INVENTORY: "Stok",
  STOCK_COUNT: "Stok Sayımı",
  INTEGRATION: "Entegrasyon",
  MARKETPLACE_ACCOUNT: "Pazaryeri Hesabı",
  MARKETPLACE_PACKAGE: "Pazaryeri Paketi",
  STOREFRONT_ITEM: "Mağaza İçeriği",
  AUTH: "Oturum",
};

export const auditLogActionLabels: Record<AuditLogAction, string> = {
  CREATE: "Oluşturma",
  UPDATE: "Güncelleme",
  DELETE: "Silme",
  STATUS_UPDATE: "Durum Güncelleme",
  IMPORT: "İçe Aktarma",
  EXPORT: "Dışa Aktarma",
  SYNC: "Senkronizasyon",
  LOGIN: "Giriş",
  LOGIN_FAILED: "Başarısız Giriş",
  LOGOUT: "Çıkış",
  PASSWORD_RESET_REQUEST: "Şifre Sıfırlama Talebi",
  PASSWORD_RESET_COMPLETE: "Şifre Sıfırlama Tamamlandı",
  PERMISSION_CHANGE: "Yetki Değişikliği",
  AUDIT_EXPORT: "Audit Dışa Aktarım",
};

export function createAuditLogRequestContext(request: Request, input: {
  module?: string;
  operation?: string;
  tenantId?: string | null;
  actorType?: CreateAuditLogInput["actorType"];
} = {}): Pick<CreateAuditLogInput, "actorType" | "tenantId" | "module" | "route" | "operation" | "requestId" | "correlationId" | "ipAddress" | "userAgent"> {
  const requestId = getRequestIdFromHeaders(request) ?? createRequestId();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");

  return {
    actorType: input.actorType ?? "USER",
    tenantId: input.tenantId ?? null,
    module: input.module,
    route: new URL(request.url).pathname,
    operation: input.operation,
    requestId,
    correlationId: request.headers.get("x-correlation-id") ?? requestId,
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

function sha256(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

const createAuditLogSchema = z.object({
  entityType: z.enum(AUDIT_LOG_ENTITY_TYPES),
  entityId: z.string().trim().min(1).optional().nullable(),
  action: z.enum(AUDIT_LOG_ACTIONS),
  actorUserId: z.string().trim().min(1).optional().nullable(),
  actorType: z.enum(["USER", "SYSTEM", "INTEGRATION"]).default("USER"),
  tenantId: z.string().trim().min(1).optional().nullable(),
  module: z.string().trim().min(1).max(80).optional().nullable(),
  route: z.string().trim().min(1).max(220).optional().nullable(),
  operation: z.string().trim().min(1).max(120).optional().nullable(),
  requestId: z.string().trim().min(1).max(120).optional().nullable(),
  correlationId: z.string().trim().min(1).max(120).optional().nullable(),
  ipAddress: z.string().trim().min(1).max(120).optional().nullable(),
  userAgent: z.string().trim().min(1).max(500).optional().nullable(),
  summary: z.string().trim().min(1).max(280).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  occurredAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

const listAuditLogSchema = z.object({
  search: z.string().trim().optional(),
  entityType: z.enum(AUDIT_LOG_ENTITY_TYPES).optional(),
  action: z.enum(AUDIT_LOG_ACTIONS).optional(),
  actorUserId: z.string().trim().optional(),
  startDate: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, z.string().date().optional()),
  endDate: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, z.string().date().optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function mapItem(item: {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  actorUserId: string | null;
  actorType?: string | null;
  tenantId?: string | null;
  module?: string | null;
  route?: string | null;
  operation?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  entityLabel: string;
  actorLabel: string | null;
  summary: string | null;
  metadata: unknown;
  payloadHash?: string | null;
  previousHash?: string | null;
  chainHash?: string | null;
  hashAlgorithm?: string | null;
  occurredAt?: Date | null;
  serverReceivedAt?: Date | null;
  createdAt: Date;
}): AuditLogItem {
  return {
    id: item.id,
    entityType: item.entityType as AuditLogItem["entityType"],
    entityId: item.entityId,
    entityLabel: item.entityLabel,
    action: item.action as AuditLogItem["action"],
    actorUserId: item.actorUserId,
    actorType: item.actorType ?? "USER",
    actorLabel: item.actorLabel,
    tenantId: item.tenantId ?? null,
    module: item.module ?? null,
    route: item.route ?? null,
    operation: item.operation ?? null,
    requestId: item.requestId ?? null,
    correlationId: item.correlationId ?? null,
    ipAddress: item.ipAddress ?? null,
    userAgent: item.userAgent ?? null,
    summary: item.summary,
    metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    payloadHash: item.payloadHash ?? null,
    previousHash: item.previousHash ?? null,
    chainHash: item.chainHash ?? null,
    hashAlgorithm: item.hashAlgorithm ?? "SHA-256",
    occurredAt: (item.occurredAt ?? item.createdAt).toISOString(),
    serverReceivedAt: (item.serverReceivedAt ?? item.createdAt).toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}

function formatFallbackEntityLabel(entityType: string, entityId: string | null) {
  const entityLabel = auditLogEntityLabels[entityType as AuditLogEntityType] ?? entityType;

  if (!entityId) {
    return entityLabel;
  }

  return `${entityLabel} • ${entityId.slice(0, 8)}`;
}

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async record(input: CreateAuditLogInput) {
    const parsed = createAuditLogSchema.parse(input);
    await this.repository.create(parsed);
  }

  async recordFromRequest(request: Request, input: CreateAuditLogInput) {
    await this.record({
      ...createAuditLogRequestContext(request, {
        module: input.module ?? input.entityType,
        operation: input.operation ?? input.action,
        tenantId: input.tenantId,
        actorType: input.actorType,
      }),
      ...input,
    });
  }

  async recordAdminAction(input: CreateAuditLogInput) {
    await this.record(input);
  }

  async recordCatalogAction(input: Omit<CreateAuditLogInput, "entityType"> & {
    entityType: Extract<AuditLogEntityType, "PRODUCT" | "BRAND" | "SUPPLIER" | "CATEGORY" | "PRODUCT_ATTRIBUTE">;
  }) {
    await this.record(input);
  }

  async recordOrderAction(input: Omit<CreateAuditLogInput, "entityType">) {
    await this.record({ ...input, entityType: "ORDER" });
  }

  async recordBusinessDocumentAction(input: Omit<CreateAuditLogInput, "entityType">) {
    await this.record({ ...input, entityType: "BUSINESS_DOCUMENT" });
  }

  async recordFinanceAction(input: Omit<CreateAuditLogInput, "entityType"> & {
    entityType: Extract<AuditLogEntityType, "FINANCE_COLLECTION" | "FINANCE_PAYMENT">;
  }) {
    await this.record(input);
  }

  async recordInventoryAction(input: Omit<CreateAuditLogInput, "entityType"> & {
    entityType?: Extract<AuditLogEntityType, "INVENTORY" | "STOCK_COUNT" | "WAREHOUSE">;
  }) {
    await this.record({ ...input, entityType: input.entityType ?? "INVENTORY" });
  }

  async list(query: AuditLogListQuery): Promise<AuditLogListResult> {
    const parsed = listAuditLogSchema.parse(query);

    const [items, total] = await Promise.all([
      this.repository.list(parsed),
      this.repository.count({
        search: parsed.search,
        entityType: parsed.entityType,
        action: parsed.action,
        actorUserId: parsed.actorUserId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      }),
    ]);

    const actorIds = Array.from(new Set(items.map((item) => item.actorUserId).filter((value): value is string => Boolean(value))));
    const productIds = Array.from(new Set(items.filter((item) => item.entityType === "PRODUCT" && item.entityId).map((item) => item.entityId as string)));
    const brandIds = Array.from(new Set(items.filter((item) => item.entityType === "BRAND" && item.entityId).map((item) => item.entityId as string)));
    const supplierIds = Array.from(new Set(items.filter((item) => item.entityType === "SUPPLIER" && item.entityId).map((item) => item.entityId as string)));
    const productAttributeIds = Array.from(new Set(items.filter((item) => item.entityType === "PRODUCT_ATTRIBUTE" && item.entityId).map((item) => item.entityId as string)));
    const categoryIds = Array.from(new Set(items.filter((item) => item.entityType === "CATEGORY" && item.entityId).map((item) => item.entityId as string)));
    const orderIds = Array.from(new Set(items.filter((item) => item.entityType === "ORDER" && item.entityId).map((item) => item.entityId as string)));
    const businessDocumentIds = Array.from(new Set(items.filter((item) => item.entityType === "BUSINESS_DOCUMENT" && item.entityId).map((item) => item.entityId as string)));
    const collectionRecordIds = Array.from(new Set(items.filter((item) => item.entityType === "FINANCE_COLLECTION" && item.entityId).map((item) => item.entityId as string)));
    const paymentRecordIds = Array.from(new Set(items.filter((item) => item.entityType === "FINANCE_PAYMENT" && item.entityId).map((item) => item.entityId as string)));
    const storefrontItemIds = Array.from(new Set(items.filter((item) => item.entityType === "STOREFRONT_ITEM" && item.entityId).map((item) => item.entityId as string)));
    const userEntityIds = Array.from(new Set(items.filter((item) => item.entityType === "USER" && item.entityId).map((item) => item.entityId as string)));
    const warehouseIds = Array.from(new Set(items.filter((item) => item.entityType === "WAREHOUSE" && item.entityId).map((item) => item.entityId as string)));
    const customerAccountIds = Array.from(new Set(items.filter((item) => item.entityType === "CUSTOMER_ACCOUNT" && item.entityId).map((item) => item.entityId as string)));

    const [
      actors,
      userEntities,
      products,
      brands,
      suppliers,
      productAttributes,
      categories,
      orders,
      businessDocuments,
      collectionRecords,
      paymentRecords,
      warehouses,
      storefrontItems,
      customerAccounts,
    ] = await Promise.all([
      this.repository.findUsersByIds(actorIds),
      this.repository.findUsersByIds(userEntityIds),
      this.repository.findProductsByIds(productIds),
      this.repository.findBrandsByIds(brandIds),
      this.repository.findSuppliersByIds(supplierIds),
      this.repository.findProductAttributesByIds(productAttributeIds),
      this.repository.findCategoriesByIds(categoryIds),
      this.repository.findOrdersByIds(orderIds),
      this.repository.findBusinessDocumentsByIds(businessDocumentIds),
      this.repository.findCollectionRecordsByIds(collectionRecordIds),
      this.repository.findPaymentRecordsByIds(paymentRecordIds),
      this.repository.findWarehousesByIds(warehouseIds),
      this.repository.findStorefrontItemsByIds(storefrontItemIds),
      this.repository.findCustomerAccountsByIds(customerAccountIds),
    ]);

    const actorMap = new Map(actors.map((item) => [item.id, `${item.name} • ${item.email}`]));
    const userEntityMap = new Map(userEntities.map((item) => [item.id, `${item.name} • ${item.email}`]));
    const productMap = new Map(products.map((item) => [item.id, `${item.name} • ${item.sku}`]));
    const brandMap = new Map(brands.map((item) => [item.id, `${item.name} • ${item.slug}`]));
    const supplierMap = new Map(suppliers.map((item) => [item.id, `${item.name}${item.taxNumber ? ` • ${item.taxNumber}` : ""}`]));
    const productAttributeMap = new Map(productAttributes.map((item) => [item.id, `${item.name} • ${item.slug}`]));
    const categoryMap = new Map(categories.map((item) => [item.id, `${item.name} • ${item.slug}`]));
    const orderMap = new Map(orders.map((item) => [item.id, `Sipariş • ${item.orderNumber}`]));
    const businessDocumentMap = new Map(businessDocuments.map((item) => [item.id, `Belge • ${item.documentNumber} • ${item.documentType}`]));
    const collectionRecordMap = new Map(collectionRecords.map((item) => [item.id, `Tahsilat • ${item.amount} ${item.currency}`]));
    const paymentRecordMap = new Map(paymentRecords.map((item) => [item.id, `Ödeme • ${item.amount} ${item.currency}`]));
    const warehouseMap = new Map(warehouses.map((item) => [item.id, `${item.name} • ${item.code}`]));
    const storefrontMap = new Map(storefrontItems.map((item) => [item.id, `${item.titleTr} • ${item.section}`]));
    const customerAccountMap = new Map<string, string>(
      customerAccounts.map((item: { id: string; name: string; email: string | null }) => [item.id, `${item.name}${item.email ? ` • ${item.email}` : ""}`]),
    );

    return {
      items: items.map((item) => mapItem({
        ...item,
        entityLabel:
          (item.entityType === "USER" ? userEntityMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "PRODUCT" ? productMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "BRAND" ? brandMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "SUPPLIER" ? supplierMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "PRODUCT_ATTRIBUTE" ? productAttributeMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "CATEGORY" ? categoryMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "ORDER" ? orderMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "BUSINESS_DOCUMENT" ? businessDocumentMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "FINANCE_COLLECTION" ? collectionRecordMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "FINANCE_PAYMENT" ? paymentRecordMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "WAREHOUSE" ? warehouseMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "STOREFRONT_ITEM" ? storefrontMap.get(item.entityId ?? "") : undefined)
          ?? (item.entityType === "CUSTOMER_ACCOUNT" ? customerAccountMap.get(item.entityId ?? "") : undefined)
          ?? formatFallbackEntityLabel(item.entityType, item.entityId),
        actorLabel: item.actorUserId ? (actorMap.get(item.actorUserId) ?? item.actorUserId.slice(0, 8)) : null,
      })),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async exportManifest(query: AuditLogListQuery) {
    const result = await this.list({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 100,
    });
    const records = result.items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      actorUserId: item.actorUserId,
      requestId: item.requestId,
      payloadHash: item.payloadHash,
      previousHash: item.previousHash,
      chainHash: item.chainHash,
      occurredAt: item.occurredAt,
      createdAt: item.createdAt,
    }));
    const manifest = {
      generatedAt: new Date().toISOString(),
      hashAlgorithm: "SHA-256",
      query,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      firstChainHash: records[records.length - 1]?.chainHash ?? null,
      lastChainHash: records[0]?.chainHash ?? null,
      recordCount: records.length,
      records,
    };

    return {
      ...manifest,
      manifestHash: sha256(manifest),
    };
  }
}

export const auditLogService = new AuditLogService(new AuditLogRepository());
