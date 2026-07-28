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
  const initialTr = `Storefront Test TR ${unique}`;
  const initialEn = `Storefront Test EN ${unique}`;
  const updatedTr = `Storefront Test TR Updated ${unique}`;
  const updatedEn = `Storefront Test EN Updated ${unique}`;

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/storefront/items`);
  assert(
    unauthorizedResponse.status === 401,
    `Unauthorized storefront list expected 401, got ${unauthorizedResponse.status}`,
  );

  const createResponse = await authFetch("/api/admin/storefront/items", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      section: "HOME_CAMPAIGN",
      variant: "accent",
      titleTr: initialTr,
      titleEn: initialEn,
      descriptionTr: "Storefront test aciklama tr",
      descriptionEn: "Storefront test description en",
      sortOrder: 91,
    }),
  });

  assert(createResponse.status === 201, `Storefront create expected 201, got ${createResponse.status}`);
  const created = await createResponse.json();
  const itemId = created?.item?.id;
  assert(itemId, "Storefront create did not return item id");

  const listResponse = await authFetch("/api/admin/storefront/items", adminCookie);
  assert(listResponse.status === 200, `Storefront list expected 200, got ${listResponse.status}`);
  const listPayload = await listResponse.json();
  assert(
    listPayload.items.some((item) => item.id === itemId && item.titleTr === initialTr),
    "Created storefront item should appear in admin list",
  );

  const trHomeInitial = await fetch(`${baseUrl}/tr`).then((response) => response.text());
  const enHomeInitial = await fetch(`${baseUrl}/en`).then((response) => response.text());
  assert(trHomeInitial.includes(initialTr), "TR homepage should render created storefront item");
  assert(enHomeInitial.includes(initialEn), "EN homepage should render created storefront item");

  const updateResponse = await authFetch(`/api/admin/storefront/items/${itemId}`, adminCookie, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      section: "HOME_CAMPAIGN",
      variant: "soft",
      titleTr: updatedTr,
      titleEn: updatedEn,
      descriptionTr: "Storefront test aciklama guncel tr",
      descriptionEn: "Storefront test description updated en",
      sortOrder: 92,
    }),
  });

  assert(updateResponse.status === 200, `Storefront update expected 200, got ${updateResponse.status}`);

  const trHomeUpdated = await fetch(`${baseUrl}/tr`).then((response) => response.text());
  const enHomeUpdated = await fetch(`${baseUrl}/en`).then((response) => response.text());
  assert(trHomeUpdated.includes(updatedTr), "TR homepage should render updated storefront item");
  assert(enHomeUpdated.includes(updatedEn), "EN homepage should render updated storefront item");

  const deleteResponse = await authFetch(`/api/admin/storefront/items/${itemId}`, adminCookie, {
    method: "DELETE",
  });
  assert(deleteResponse.status === 200, `Storefront delete expected 200, got ${deleteResponse.status}`);

  const deletedRecord = await prisma.storefrontItem.findUnique({
    where: { id: itemId },
    select: {
      deleted: true,
      deletedDate: true,
      deletedUserId: true,
    },
  });

  assert(deletedRecord?.deleted === true, "Storefront delete should set deleted=true");
  assert(deletedRecord?.deletedDate, "Storefront delete should set deletedDate");
  assert(deletedRecord?.deletedUserId, "Storefront delete should set deletedUserId");

  const trHomeDeleted = await fetch(`${baseUrl}/tr`).then((response) => response.text());
  assert(!trHomeDeleted.includes(updatedTr), "Deleted storefront item should disappear from homepage");

  console.log("Storefront integration verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
