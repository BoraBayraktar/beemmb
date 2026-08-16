import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.APP_URL || "http://localhost:3001";
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
  assert(cookie, `No auth cookie received for ${email}`);

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
  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const unique = Date.now();

  const carrierResponse = await authFetch("/api/admin/carriers", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: `order-shipment-carrier-${unique}`,
      name: `Order Shipment Carrier ${unique}`,
      trackingUrlTemplate: "https://kargo.example.com/takip?kod={trackingNumber}",
    }),
  });
  assert(carrierResponse.status === 201, `Carrier create expected 201, got ${carrierResponse.status}`);
  const carrierPayload = await carrierResponse.json();
  const carrierId = carrierPayload?.item?.id;
  assert(carrierId, "Carrier create did not return item id");

  const productResponse = await authFetch("/api/admin/products", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: `order-shipment-product-${unique}`,
      sku: `order-shipment-sku-${unique}`,
      name: "Order Shipment Verify Product",
      description: "Temporary product for order shipment verify",
      price: 80,
      stock: 3,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    }),
  });
  assert(productResponse.status === 201, `Create product expected 201, got ${productResponse.status}`);
  const productPayload = await productResponse.json();
  const productId = productPayload?.item?.id;
  assert(productId, "Create product response should include id");

  let orderId = null;

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

    const listResponse = await authFetch(`/api/admin/orders?search=${encodeURIComponent(orderNumber)}&page=1&pageSize=5`, adminCookie);
    const listPayload = await listResponse.json();
    const createdOrder = listPayload.items.find((item) => item.orderNumber === orderNumber);
    assert(createdOrder, "Created order should be listed");
    orderId = createdOrder.id;

    const detailBeforeResponse = await authFetch(`/api/admin/orders/${orderId}`, adminCookie);
    assert(detailBeforeResponse.status === 200, `Order detail expected 200, got ${detailBeforeResponse.status}`);
    const detailBeforePayload = await detailBeforeResponse.json();
    assert(detailBeforePayload.shipment.shipmentStatus === "NOT_SHIPPED", "Fresh order should start with NOT_SHIPPED");
    assert(detailBeforePayload.shipment.carrierCompanyId === null, "Fresh order should have no carrier");

    const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/orders/${orderId}/shipment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shipmentStatus: "SHIPPED" }),
    });
    assert(unauthorizedResponse.status === 401, `Unauthorized shipment patch expected 401, got ${unauthorizedResponse.status}`);

    const shipmentPatchResponse = await authFetch(`/api/admin/orders/${orderId}/shipment`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipmentStatus: "SHIPPED",
        carrierCompanyId: carrierId,
        cargoTrackingNumber: "TRK-VERIFY-1",
        shipmentAddressLine: "Test Mah. Test Sk. No:1",
        shipmentCity: "Istanbul",
        shipmentDistrict: "Kadikoy",
        shipmentContactName: "Test Alici",
        shipmentContactPhone: "+905551112233",
      }),
    });
    assert(shipmentPatchResponse.status === 200, `Shipment patch expected 200, got ${shipmentPatchResponse.status}`);
    const shipmentPatchPayload = await shipmentPatchResponse.json();
    assert(shipmentPatchPayload.item.shipment.shipmentStatus === "SHIPPED", "Shipment status should update to SHIPPED");
    assert(shipmentPatchPayload.item.shipment.carrierCompanyId === carrierId, "carrierCompanyId should match");
    assert(shipmentPatchPayload.item.shipment.carrierCompanyName, "carrierCompanyName should be resolved");
    assert(shipmentPatchPayload.item.shipment.cargoTrackingNumber === "TRK-VERIFY-1", "cargoTrackingNumber should match");
    assert(shipmentPatchPayload.item.shipment.shipmentCity === "Istanbul", "shipmentCity should match");

    const detailAfterResponse = await authFetch(`/api/admin/orders/${orderId}`, adminCookie);
    const detailAfterPayload = await detailAfterResponse.json();
    assert(detailAfterPayload.shipment.shipmentStatus === "SHIPPED", "Re-fetched order should show SHIPPED status");
    assert(detailAfterPayload.shipment.carrierCompanyId === carrierId, "Re-fetched order should keep carrier reference");

    const invalidCarrierResponse = await authFetch(`/api/admin/orders/${orderId}/shipment`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ carrierCompanyId: "nonexistent-carrier-id" }),
    });
    assert(invalidCarrierResponse.status === 400, `Invalid carrier patch expected 400, got ${invalidCarrierResponse.status}`);

    console.log("Order shipment integration verification passed");
  } finally {
    if (orderId) {
      await authFetch(`/api/admin/orders/${orderId}`, adminCookie, {
        method: "DELETE",
      });
    }

    await authFetch(`/api/admin/products/${productId}`, adminCookie, {
      method: "DELETE",
    });

    await authFetch(`/api/admin/carriers/${carrierId}`, adminCookie, {
      method: "DELETE",
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
