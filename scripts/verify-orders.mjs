import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.APP_URL || "http://localhost:3001";
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readAggregateStock(productId) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      stock: true,
      inventoryItem: {
        select: {
          inventoryLevels: {
            where: {
              warehouse: {
                isActive: true,
              },
            },
            select: {
              onHand: true,
              reserved: true,
            },
          },
        },
      },
    },
  });

  assert(product, "Product missing while reading aggregate stock");

  const levels = product.inventoryItem?.inventoryLevels ?? [];
  const aggregateStock = levels.length > 0
    ? levels.reduce((sum, level) => sum + Math.max(0, level.onHand - level.reserved), 0)
    : product.stock;

  return {
    summaryStock: product.stock,
    aggregateStock,
  };
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return null;
  }

  return setCookieHeader.split(";")[0] || null;
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/identity/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `Login failed for ${email} with status ${response.status}`);

  const cookie = extractCookie(response.headers.get("set-cookie"));
  assert(cookie, `No auth cookie for ${email}`);

  return cookie;
}

async function authFetch(path, cookie, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookie,
    },
  });
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const editorPasswordHash = await bcrypt.hash("Editor123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@beemmb.local" },
    update: {
      name: "Admin User",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      email: "admin@beemmb.local",
      name: "Admin User",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@beemmb.local" },
    update: {
      name: "Editor User",
      role: "EDITOR",
      passwordHash: editorPasswordHash,
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      email: "editor@beemmb.local",
      name: "Editor User",
      role: "EDITOR",
      passwordHash: editorPasswordHash,
    },
  });

  const adminCookie = await login("admin@beemmb.local", "Admin123!");
  const editorCookie = await login("editor@beemmb.local", "Editor123!");

  const unique = Date.now();
  const createProductResponse = await authFetch("/api/admin/products", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: `orders-verify-${unique}`,
      sku: `orders-verify-sku-${unique}`,
      name: "Orders Verify Product",
      description: "Temporary product for orders verify",
      price: 120,
      compareAtPrice: 150,
      stock: 3,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    }),
  });

  assert(createProductResponse.status === 201, `Create product expected 201, got ${createProductResponse.status}`);
  const createProductPayload = await createProductResponse.json();
  const productId = createProductPayload?.item?.id;
  assert(productId, "Create product response should include id");
  const initialProductStock = createProductPayload?.item?.stock;
  assert(initialProductStock === 3, `Initial product stock expected 3, got ${initialProductStock}`);

  let createdOrderId = null;
  let refundOrderId = null;

  try {
    const checkoutResponse = await fetch(`${baseUrl}/api/commerce/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: [{ productId, quantity: 1 }],
      }),
    });

    assert(checkoutResponse.status === 201, `Checkout expected 201, got ${checkoutResponse.status}`);
    const checkoutPayload = await checkoutResponse.json();
    const orderNumber = checkoutPayload?.orderNumber;
    assert(orderNumber, "Checkout should return order number");

    const adminListResponse = await authFetch(`/api/admin/orders?search=${encodeURIComponent(orderNumber)}&page=1&pageSize=5`, adminCookie);
    assert(adminListResponse.status === 200, `Admin orders list expected 200, got ${adminListResponse.status}`);

    const adminPayload = await adminListResponse.json();
    assert(Array.isArray(adminPayload.items), "Orders list should include items array");
    const createdOrder = adminPayload.items.find((item) => item.orderNumber === orderNumber);
    assert(createdOrder, "Created order should be listed");
    assert(createdOrder.restockStatus === "NOT_RESTOCKED", "Fresh order should list restock status as NOT_RESTOCKED");
    assert(createdOrder.lastRestockedAt === null, "Fresh order should not have a last restocked timestamp");
    createdOrderId = createdOrder.id;

    const editorListResponse = await authFetch("/api/admin/orders?page=1&pageSize=5", editorCookie);
    assert(editorListResponse.status === 200, `Editor orders list expected 200, got ${editorListResponse.status}`);

    const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/orders?page=1&pageSize=5`);
    assert(unauthorizedResponse.status === 401, `Unauthorized orders list expected 401, got ${unauthorizedResponse.status}`);

    const adminDetailResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, adminCookie);
    assert(adminDetailResponse.status === 200, `Admin order detail expected 200, got ${adminDetailResponse.status}`);
    const adminDetailPayload = await adminDetailResponse.json();
    assert(Array.isArray(adminDetailPayload?.statusHistory), "Order detail should include status history");
    assert(adminDetailPayload.statusHistory.length >= 1, "Order should have initial status history");
    assert(adminDetailPayload.statusHistory[0].toStatus === "CONFIRMED", "Initial history should be CONFIRMED");
    assert(adminDetailPayload.paymentStatus === "PENDING", "Initial payment status should be PENDING");
    assert(Array.isArray(adminDetailPayload?.paymentStatusHistory), "Order detail should include payment status history");
    assert(adminDetailPayload.paymentStatusHistory.length >= 1, "Order should have initial payment history");
    assert(adminDetailPayload.paymentStatusHistory[0].toStatus === "PENDING", "Initial payment history should be PENDING");
    assert(adminDetailPayload.inventorySummary?.restockStatus === "NOT_RESTOCKED", "Initial restock status should be NOT_RESTOCKED");
    assert(Array.isArray(adminDetailPayload.inventoryMovements), "Order detail should include inventory movements");
    assert(adminDetailPayload.inventoryMovements.some((item) => item.type === "ORDER_COMMIT"), "Order detail should include ORDER_COMMIT movement");

    const editorDetailResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, editorCookie);
    assert(editorDetailResponse.status === 200, `Editor order detail expected 200, got ${editorDetailResponse.status}`);

    const editorPatchResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, editorCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    assert(editorPatchResponse.status === 403, `Editor order patch expected 403, got ${editorPatchResponse.status}`);

    const adminPatchResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "CANCELLED", paymentStatus: "PAID" }),
    });
    assert(adminPatchResponse.status === 200, `Admin order patch expected 200, got ${adminPatchResponse.status}`);

    const patchedPayload = await adminPatchResponse.json();
    assert(patchedPayload?.item?.status === "CANCELLED", "Admin order patch should update status");
    assert(patchedPayload?.item?.statusHistory?.length >= 2, "Status update should append history record");
    assert(patchedPayload.item.statusHistory[0].toStatus === "CANCELLED", "Latest history should be CANCELLED");
    assert(patchedPayload.item.statusHistory[0].source === "ADMIN", "Latest history source should be ADMIN");
    assert(patchedPayload.item.statusHistory[0].changedByUserId === adminUser.id, "History actor should match admin user");
    assert(patchedPayload.item.paymentStatus === "PAID", "Admin order patch should update payment status");
    assert(patchedPayload.item.paymentStatusHistory.length >= 2, "Payment status update should append history record");
    assert(patchedPayload.item.paymentStatusHistory[0].toStatus === "PAID", "Latest payment history should be PAID");
    assert(patchedPayload.item.paymentStatusHistory[0].source === "ADMIN", "Latest payment history source should be ADMIN");
    assert(patchedPayload.item.paymentStatusHistory[0].changedByUserId === adminUser.id, "Payment history actor should match admin user");
    assert(patchedPayload.item.inventorySummary.restockStatus === "RESTOCKED", "Cancelled order should be marked as restocked");
    assert(patchedPayload.item.inventoryMovements.some((item) => item.type === "ORDER_CANCEL_RESTOCK"), "Cancelled order should include cancel restock movement");

    const cancelledOrderListResponse = await authFetch(`/api/admin/orders?search=${encodeURIComponent(orderNumber)}&page=1&pageSize=5`, adminCookie);
    assert(cancelledOrderListResponse.status === 200, `Cancelled order list expected 200, got ${cancelledOrderListResponse.status}`);
    const cancelledOrderListPayload = await cancelledOrderListResponse.json();
    const cancelledOrder = cancelledOrderListPayload.items.find((item) => item.orderNumber === orderNumber);
    assert(cancelledOrder?.restockStatus === "RESTOCKED", "Cancelled order should list restock status as RESTOCKED");
    assert(typeof cancelledOrder?.lastRestockedAt === "string", "Cancelled order should include last restocked timestamp");

    const restockedAfterCancel = await readAggregateStock(productId);
    assert(restockedAfterCancel.summaryStock === initialProductStock, `Cancelled order should restore summary stock to ${initialProductStock}`);
    assert(restockedAfterCancel.aggregateStock === initialProductStock, `Cancelled order should restore aggregate stock to ${initialProductStock}`);
    assert(restockedAfterCancel.summaryStock === restockedAfterCancel.aggregateStock, "Cancelled order should keep summary and aggregate stock aligned");

    const refundCheckoutResponse = await fetch(`${baseUrl}/api/commerce/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: [{ productId, quantity: 1 }],
      }),
    });
    assert(refundCheckoutResponse.status === 201, `Refund checkout expected 201, got ${refundCheckoutResponse.status}`);
    const refundCheckoutPayload = await refundCheckoutResponse.json();
    const refundOrderNumber = refundCheckoutPayload?.orderNumber;
    assert(refundOrderNumber, "Refund checkout should return order number");

    const refundOrderListResponse = await authFetch(`/api/admin/orders?search=${encodeURIComponent(refundOrderNumber)}&page=1&pageSize=5`, adminCookie);
    assert(refundOrderListResponse.status === 200, `Refund order list expected 200, got ${refundOrderListResponse.status}`);
    const refundOrderListPayload = await refundOrderListResponse.json();
    const refundOrder = refundOrderListPayload.items.find((item) => item.orderNumber === refundOrderNumber);
    assert(refundOrder, "Refund order should be listed");
    assert(refundOrder.restockStatus === "NOT_RESTOCKED", "Refund order should start with NOT_RESTOCKED in list");
    assert(refundOrder.lastRestockedAt === null, "Refund order should not have last restocked timestamp before refund");
    refundOrderId = refundOrder.id;

    const paidOrderPatchResponse = await authFetch(`/api/admin/orders/${refundOrderId}`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    assert(paidOrderPatchResponse.status === 200, `Refund order paid patch expected 200, got ${paidOrderPatchResponse.status}`);

    const refundedOrderPatchResponse = await authFetch(`/api/admin/orders/${refundOrderId}`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentStatus: "REFUNDED" }),
    });
    assert(refundedOrderPatchResponse.status === 200, `Refund order refund patch expected 200, got ${refundedOrderPatchResponse.status}`);
    const refundedPayload = await refundedOrderPatchResponse.json();
    assert(refundedPayload?.item?.paymentStatus === "REFUNDED", "Refund patch should update payment status to REFUNDED");
    assert(refundedPayload.item.inventorySummary.restockStatus === "RESTOCKED", "Refunded order should be marked as restocked");
    assert(refundedPayload.item.inventoryMovements.some((item) => item.type === "RETURN_RESTOCK"), "Refunded order should include return restock movement");

    const refundedOrderListResponse = await authFetch(`/api/admin/orders?search=${encodeURIComponent(refundOrderNumber)}&page=1&pageSize=5`, adminCookie);
    assert(refundedOrderListResponse.status === 200, `Refunded order list expected 200, got ${refundedOrderListResponse.status}`);
    const refundedOrderListPayload = await refundedOrderListResponse.json();
    const refundedOrder = refundedOrderListPayload.items.find((item) => item.orderNumber === refundOrderNumber);
    assert(refundedOrder?.restockStatus === "RESTOCKED", "Refunded order should list restock status as RESTOCKED");
    assert(typeof refundedOrder?.lastRestockedAt === "string", "Refunded order should include last restocked timestamp");

    const restockedAfterRefund = await readAggregateStock(productId);
    assert(restockedAfterRefund.summaryStock === initialProductStock, `Refunded order should restore summary stock to ${initialProductStock}`);
    assert(restockedAfterRefund.aggregateStock === initialProductStock, `Refunded order should restore aggregate stock to ${initialProductStock}`);
    assert(restockedAfterRefund.summaryStock === restockedAfterRefund.aggregateStock, "Refunded order should keep summary and aggregate stock aligned");

    const editorDeleteResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, editorCookie, {
      method: "DELETE",
    });
    assert(editorDeleteResponse.status === 403, `Editor order delete expected 403, got ${editorDeleteResponse.status}`);

    const adminDeleteResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, adminCookie, {
      method: "DELETE",
    });
    assert(adminDeleteResponse.status === 200, `Admin order delete expected 200, got ${adminDeleteResponse.status}`);

    const inventoryStateBeforeDelete = await prisma.order.findUnique({
      where: {
        id: createdOrderId,
      },
      select: {
        stockReservations: {
          select: {
            id: true,
            status: true,
            inventoryMovements: {
              select: {
                id: true,
                type: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    const adminDetailAfterDeleteResponse = await authFetch(`/api/admin/orders/${createdOrderId}`, adminCookie);
    assert(adminDetailAfterDeleteResponse.status === 404, `Deleted order detail expected 404, got ${adminDetailAfterDeleteResponse.status}`);

    const inventoryStateAfterDelete = await prisma.order.findUnique({
      where: {
        id: createdOrderId,
      },
      select: {
        deleted: true,
        stockReservations: {
          select: {
            id: true,
            status: true,
            inventoryMovements: {
              select: {
                id: true,
                type: true,
                quantity: true,
              },
            },
          },
        },
      },
    });
    assert(inventoryStateBeforeDelete != null, "Inventory state before delete should exist");
    assert(inventoryStateAfterDelete?.deleted === true, "Soft-deleted order should remain in database");
    assert(JSON.stringify(inventoryStateAfterDelete?.stockReservations) === JSON.stringify(inventoryStateBeforeDelete.stockReservations), "Soft delete should not mutate inventory reservations or movements");

    console.log("Orders admin integration verification passed");
  } finally {
    if (createdOrderId) {
      await authFetch(`/api/admin/orders/${createdOrderId}`, adminCookie, {
        method: "DELETE",
      });
    }

    if (refundOrderId) {
      await authFetch(`/api/admin/orders/${refundOrderId}`, adminCookie, {
        method: "DELETE",
      });
    }

    await authFetch(`/api/admin/products/${productId}`, adminCookie, {
      method: "DELETE",
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
