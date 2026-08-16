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
  const carrierSlug = `carrier-test-${unique}`;
  const updatedCarrierSlug = `carrier-test-updated-${unique}`;
  const carrierName = `Carrier Test ${unique}`;
  const updatedCarrierName = `Carrier Test Updated ${unique}`;

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/carriers`);
  assert(
    unauthorizedResponse.status === 401,
    `Unauthorized carrier list expected 401, got ${unauthorizedResponse.status}`,
  );

  const createResponse = await authFetch("/api/admin/carriers", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: carrierSlug,
      name: carrierName,
      trackingUrlTemplate: "https://kargo.example.com/takip?kod={trackingNumber}",
      externalCodeTrendyol: 42,
      externalCodePazarama: "pazarama-42",
    }),
  });

  assert(createResponse.status === 201, `Carrier create expected 201, got ${createResponse.status}`);
  const created = await createResponse.json();
  const carrierId = created?.item?.id;
  assert(carrierId, "Carrier create did not return item id");
  assert(created.item.orderCount === 0, "New carrier should start with orderCount 0");
  assert(created.item.isActive === true, "New carrier should default to isActive=true");

  const listResponse = await authFetch("/api/admin/carriers", adminCookie);
  assert(listResponse.status === 200, `Carrier list expected 200, got ${listResponse.status}`);
  const listPayload = await listResponse.json();
  assert(
    listPayload.items.some((item) => item.id === carrierId && item.slug === carrierSlug),
    "Created carrier should appear in list",
  );

  const updateResponse = await authFetch(`/api/admin/carriers/${carrierId}`, adminCookie, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: updatedCarrierSlug,
      name: updatedCarrierName,
      isActive: false,
    }),
  });

  assert(updateResponse.status === 200, `Carrier update expected 200, got ${updateResponse.status}`);
  const updatePayload = await updateResponse.json();
  assert(updatePayload?.item?.slug === updatedCarrierSlug, "Carrier update should change slug");
  assert(updatePayload?.item?.name === updatedCarrierName, "Carrier update should change name");
  assert(updatePayload?.item?.isActive === false, "Carrier update should change isActive");

  const invalidCreateResponse = await authFetch("/api/admin/carriers", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: "",
      name: "",
    }),
  });

  assert(invalidCreateResponse.status === 400, `Invalid carrier create expected 400, got ${invalidCreateResponse.status}`);

  const deleteResponse = await authFetch(`/api/admin/carriers/${carrierId}`, adminCookie, {
    method: "DELETE",
  });
  assert(deleteResponse.status === 200, `Carrier delete expected 200, got ${deleteResponse.status}`);

  const deletedRecord = await prisma.carrierCompany.findUnique({
    where: { id: carrierId },
    select: {
      deleted: true,
      deletedDate: true,
      deletedUserId: true,
    },
  });

  assert(deletedRecord?.deleted === true, "Carrier delete should set deleted=true");
  assert(deletedRecord?.deletedDate, "Carrier delete should set deletedDate");
  assert(deletedRecord?.deletedUserId, "Carrier delete should set deletedUserId");

  const listAfterDeleteResponse = await authFetch("/api/admin/carriers", adminCookie);
  const listAfterDeletePayload = await listAfterDeleteResponse.json();
  assert(
    !listAfterDeletePayload.items.some((item) => item.id === carrierId),
    "Soft-deleted carrier should not appear in list",
  );

  console.log("Carrier company management integration verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
