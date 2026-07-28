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

async function createProduct(cookie, payload) {
  const response = await authFetch("/api/admin/products", cookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  assert(response.status === 201, `Create expected 201, got ${response.status}`);
  return response.json();
}

async function main() {
  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const categories = await prisma.category.findMany({
    where: { deleted: false },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  assert(categories.length > 0, "Expected seed categories to exist");

  const slugPrefix = `crud-test-${Date.now()}`;
  const createdIds = [];

  try {
    const first = await createProduct(adminCookie, {
      slug: `${slugPrefix}-alpha`,
      sku: `${slugPrefix}-alpha-sku`,
      name: "CRUD Test Alpha",
      description: "Alpha product for integration tests",
      price: 101.25,
      compareAtPrice: 121.25,
      stock: 11,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      categoryId: categories[0].id,
    });

    const second = await createProduct(adminCookie, {
      slug: `${slugPrefix}-beta`,
      sku: `${slugPrefix}-beta-sku`,
      name: "CRUD Test Beta",
      description: "Beta product for integration tests",
      price: 202.5,
      compareAtPrice: 232.5,
      stock: 7,
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      categoryId: categories[0].id,
    });

    const third = await createProduct(adminCookie, {
      slug: `${slugPrefix}-gamma`,
      sku: `${slugPrefix}-gamma-sku`,
      name: "CRUD Test Gamma",
      description: "Gamma product for integration tests",
      price: 303.75,
      compareAtPrice: 333.75,
      stock: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=1200&q=80",
      categoryId: categories[1] ? categories[1].id : categories[0].id,
    });

    createdIds.push(first.item.id, second.item.id, third.item.id);

    const listResponse = await authFetch(
      `/api/admin/products?search=${encodeURIComponent(slugPrefix)}&page=1&pageSize=2`,
      adminCookie,
    );
    assert(listResponse.status === 200, `List expected 200, got ${listResponse.status}`);

    const listPayload = await listResponse.json();
    assert(listPayload.page === 1, "List should return page=1");
    assert(listPayload.pageSize === 2, "List should return pageSize=2");
    assert(listPayload.total >= 3, "List should include newly created products");
    assert(listPayload.totalPages >= 2, "List should have at least 2 pages");
    assert(listPayload.items.length === 2, "Page 1 should include exactly 2 items");

    const filterResponse = await authFetch(
      `/api/admin/products?search=${encodeURIComponent(slugPrefix)}&categoryId=${categories[0].id}&page=1&pageSize=10`,
      adminCookie,
    );
    assert(filterResponse.status === 200, `Filter expected 200, got ${filterResponse.status}`);
    const filterPayload = await filterResponse.json();

    assert(
      filterPayload.items.every((item) => item.categoryId === categories[0].id),
      "Category filter should only return items from selected category",
    );

    const invalidCreateResponse = await authFetch("/api/admin/products", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: "x",
        sku: "x",
        name: "x",
        description: "x",
        price: -1,
        stock: -3,
        imageUrl: "invalid-url",
      }),
    });

    assert(
      invalidCreateResponse.status === 400,
      `Invalid create expected 400, got ${invalidCreateResponse.status}`,
    );

    const updateResponse = await authFetch(`/api/admin/products/${second.item.id}`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "CRUD Test Beta Updated",
        price: 222.22,
        compareAtPrice: 252.22,
        stock: 19,
      }),
    });

    assert(updateResponse.status === 200, `Update expected 200, got ${updateResponse.status}`);

    const updatedPayload = await updateResponse.json();
    assert(updatedPayload.item.name === "CRUD Test Beta Updated", "Update should change product name");
    assert(updatedPayload.item.stock === 19, "Update should change stock");

    const deleteResponse = await authFetch(`/api/admin/products/${first.item.id}`, adminCookie, {
      method: "DELETE",
    });

    assert(deleteResponse.status === 200, `Delete expected 200, got ${deleteResponse.status}`);

    const softDeletedRecord = await prisma.product.findUnique({
      where: { id: first.item.id },
      select: {
        deleted: true,
        deletedDate: true,
        deletedUserId: true,
      },
    });

    assert(softDeletedRecord?.deleted === true, "Deleted product should be soft deleted");
    assert(softDeletedRecord?.deletedDate, "Soft delete should set deletedDate");
    assert(softDeletedRecord?.deletedUserId, "Soft delete should set deletedUserId");

    const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/products`);
    assert(
      unauthorizedResponse.status === 401,
      `Unauthorized access expected 401, got ${unauthorizedResponse.status}`,
    );

    console.log("Admin product CRUD integration verification passed");
  } finally {
    if (createdIds.length > 0) {
      await prisma.product.updateMany({
        where: {
          id: {
            in: createdIds,
          },
        },
        data: {
          deleted: true,
          deletedDate: new Date(),
          deletedUserId: "integration-test-cleanup",
        },
      });
    }
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
