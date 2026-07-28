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
  const categorySlug = `category-test-${unique}`;
  const updatedCategorySlug = `category-test-updated-${unique}`;
  const categoryName = `Category Test ${unique}`;
  const updatedCategoryName = `Category Test Updated ${unique}`;

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/categories`);
  assert(
    unauthorizedResponse.status === 401,
    `Unauthorized category list expected 401, got ${unauthorizedResponse.status}`,
  );

  const createResponse = await authFetch("/api/admin/categories", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: categorySlug,
      name: categoryName,
    }),
  });

  assert(createResponse.status === 201, `Category create expected 201, got ${createResponse.status}`);
  const created = await createResponse.json();
  const categoryId = created?.item?.id;
  assert(categoryId, "Category create did not return item id");

  const listResponse = await authFetch(`/api/admin/categories?search=${encodeURIComponent(categorySlug)}`, adminCookie);
  assert(listResponse.status === 200, `Category list expected 200, got ${listResponse.status}`);
  const listPayload = await listResponse.json();
  assert(
    listPayload.items.some((item) => item.id === categoryId && item.slug === categorySlug),
    "Created category should appear in list",
  );

  const updateResponse = await authFetch(`/api/admin/categories/${categoryId}`, adminCookie, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: updatedCategorySlug,
      name: updatedCategoryName,
    }),
  });

  assert(updateResponse.status === 200, `Category update expected 200, got ${updateResponse.status}`);

  const updatePayload = await updateResponse.json();
  assert(updatePayload?.item?.slug === updatedCategorySlug, "Category update should change slug");
  assert(updatePayload?.item?.name === updatedCategoryName, "Category update should change name");

  const activeCategory = await prisma.category.findFirst({
    where: {
      deleted: false,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
  assert(activeCategory, "Expected at least one active category");

  const productCreateResponse = await authFetch("/api/admin/products", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: `category-lock-product-${unique}`,
      sku: `category-lock-sku-${unique}`,
      name: `Category Lock Product ${unique}`,
      description: "Product created to verify category delete guard",
      price: 99.9,
      compareAtPrice: 119.9,
      stock: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      categoryId,
    }),
  });

  assert(productCreateResponse.status === 201, `Product create expected 201, got ${productCreateResponse.status}`);
  const createdProductPayload = await productCreateResponse.json();
  const createdProductId = createdProductPayload?.item?.id;
  assert(createdProductId, "Product create did not return item id");

  const blockedDeleteResponse = await authFetch(`/api/admin/categories/${categoryId}`, adminCookie, {
    method: "DELETE",
  });
  assert(blockedDeleteResponse.status === 409, `Category delete with products expected 409, got ${blockedDeleteResponse.status}`);

  const productDeleteResponse = await authFetch(`/api/admin/products/${createdProductId}`, adminCookie, {
    method: "DELETE",
  });
  assert(productDeleteResponse.status === 200, `Product delete expected 200, got ${productDeleteResponse.status}`);

  const deleteResponse = await authFetch(`/api/admin/categories/${categoryId}`, adminCookie, {
    method: "DELETE",
  });
  assert(deleteResponse.status === 200, `Category delete expected 200, got ${deleteResponse.status}`);

  const deletedRecord = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      deleted: true,
      deletedDate: true,
      deletedUserId: true,
    },
  });

  assert(deletedRecord?.deleted === true, "Category delete should set deleted=true");
  assert(deletedRecord?.deletedDate, "Category delete should set deletedDate");
  assert(deletedRecord?.deletedUserId, "Category delete should set deletedUserId");

  const invalidCreateResponse = await authFetch("/api/admin/categories", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: "",
      name: "",
    }),
  });

  assert(invalidCreateResponse.status === 400, `Invalid category create expected 400, got ${invalidCreateResponse.status}`);

  console.log("Category management integration verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
