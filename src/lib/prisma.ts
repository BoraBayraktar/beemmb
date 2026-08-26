import { Prisma, PrismaClient } from "@prisma/client";

import { getTenantContext } from "@/lib/tenant-context";

/**
 * Bu is-verisi modelleri, merkezi tenant-isolation extension'i uzerinden her
 * sorguya otomatik tenantId filtresi/degeri enjekte edilerek erisilir. Faz 0'da
 * bilincli olarak BOS birakildi (no-op) -- once altyapi kurulur, davranis
 * degisikligi Faz 1'de modul modul, ayri onayla acilir. Yeni bir model bu
 * listeye eklenmeden production'da tenant-scoped sayilamaz (DEVELOPMENT_RULES.md
 * madde 7).
 */
const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  "Warehouse",
  "Category",
  "Brand",
  "Cari",
  "Product",
  "ProductVariant",
  "Order",
  "OrderItem",
  "OrderStatusHistory",
  "OrderPaymentStatusHistory",
  "InventoryItem",
  "InventoryLevel",
  "StockReservation",
  "InventoryMovement",
  "StockCount",
  "StockCountLine",
  "InventoryAlert",
  "InventoryTransaction",
  "InventoryTransactionLine",
  "ExternalStockEvent",
  "InventoryIntegrationMapping",
  "InventoryExportHistory",
  "UserInventoryPreference",
  "InventoryHistoryEvent",
  "FinancialAccount",
  "CashTransaction",
  "FinanceLedgerAccount",
  "FinanceAccountEntry",
  "CollectionRecord",
  "PaymentRecord",
  "FinanceAllocationLink",
]);

const WHERE_MANY_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);
const WHERE_UNIQUE_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete"]);

type OperationArgs = Record<string, unknown>;

function applyTenantScope(operation: string, args: OperationArgs, tenantId: string): OperationArgs {
  if (WHERE_MANY_OPERATIONS.has(operation) || WHERE_UNIQUE_OPERATIONS.has(operation)) {
    return { ...args, where: { ...(args.where as OperationArgs | undefined), tenantId } };
  }

  if (operation === "create") {
    return { ...args, data: { ...(args.data as OperationArgs | undefined), tenantId } };
  }

  // upsert'in args sekli { where, create, update } -- "data" alani yok. where'e tenantId
  // eklenir (composite-unique lookup icin), create dalina da eklenir; update dalina
  // DOKUNULMAZ (mevcut bir kaydin tenantId'si asla update ile degistirilemez).
  if (operation === "upsert") {
    return {
      ...args,
      where: { ...(args.where as OperationArgs | undefined), tenantId },
      create: { ...(args.create as OperationArgs | undefined), tenantId },
    };
  }

  if (operation === "createMany" && Array.isArray(args.data)) {
    return { ...args, data: (args.data as OperationArgs[]).map((row) => ({ ...row, tenantId })) };
  }

  return args;
}

function withTenantScope(client: PrismaClient) {
  return client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const ctx = getTenantContext();
          if (!ctx) {
            throw new Error(`Tenant context olmadan tenant-scoped model erisimi engellendi: ${model}.${operation}`);
          }

          return query(applyTenantScope(operation, args, ctx.tenantId));
        },
      },
    },
  });
}

type TenantScopedPrismaClient = ReturnType<typeof withTenantScope>;

/** $transaction((tx) => ...) callback'lerinde kullanilacak tx parametre tipi -- extension'li client'in kendi transaction-client tipi, plain Prisma.TransactionClient DEGIL. */
export type PrismaTransactionClient = Omit<TenantScopedPrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use">;

declare global {
  var prismaClient: TenantScopedPrismaClient | undefined;
}

function createPrismaClient(): TenantScopedPrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
  return withTenantScope(client);
}

function hasRequiredDelegates(client: TenantScopedPrismaClient | undefined): client is TenantScopedPrismaClient {
  if (!client) {
    return false;
  }

  // In dev, schema/client can change while global cache still holds an older instance.
  const delegateCheck = client as unknown as {
    productReview?: unknown;
    productQuestion?: unknown;
    inventoryAlert?: unknown;
    inventoryHistoryEvent?: unknown;
    inventoryExportHistory?: unknown;
    userInventoryPreference?: unknown;
    stockCount?: unknown;
    stockCountLine?: unknown;
    inventoryTransaction?: unknown;
    integrationSyncJob?: unknown;
    marketplaceIntegrationConfig?: unknown;
    marketplaceOrderPackage?: unknown;
    marketplaceOrderLine?: unknown;
    collectionRecord?: unknown;
    paymentRecord?: unknown;
    customerAccount?: unknown;
  };

  return (
    typeof delegateCheck.productReview !== "undefined"
    && typeof delegateCheck.productQuestion !== "undefined"
    && typeof delegateCheck.inventoryAlert !== "undefined"
    && typeof delegateCheck.inventoryHistoryEvent !== "undefined"
    && typeof delegateCheck.inventoryExportHistory !== "undefined"
    && typeof delegateCheck.userInventoryPreference !== "undefined"
    && typeof delegateCheck.stockCount !== "undefined"
    && typeof delegateCheck.stockCountLine !== "undefined"
    && typeof delegateCheck.inventoryTransaction !== "undefined"
    && typeof delegateCheck.integrationSyncJob !== "undefined"
    && typeof delegateCheck.marketplaceIntegrationConfig !== "undefined"
    && typeof delegateCheck.marketplaceOrderPackage !== "undefined"
    && typeof delegateCheck.marketplaceOrderLine !== "undefined"
    && typeof delegateCheck.collectionRecord !== "undefined"
    && typeof delegateCheck.paymentRecord !== "undefined"
    && typeof delegateCheck.customerAccount !== "undefined"
  );
}

function resolvePrismaClient() {
  if (hasRequiredDelegates(global.prismaClient)) {
    return global.prismaClient;
  }

  const nextClient = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    global.prismaClient = nextClient;
  }

  return nextClient;
}

const prismaClient = resolvePrismaClient();

export const prisma = new Proxy(prismaClient, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== "undefined") {
      return value;
    }

    if (typeof prop !== "string" || prop.startsWith("$")) {
      return value;
    }

    const refreshedClient = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      global.prismaClient = refreshedClient;
    }

    return Reflect.get(refreshedClient, prop, refreshedClient);
  },
});

if (process.env.NODE_ENV !== "production") {
  global.prismaClient = prismaClient;
}
