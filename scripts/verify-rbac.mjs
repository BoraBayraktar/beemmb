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
  const editorCookie = await login("editor@beemmb.local", "Editor123!");

  const slug = `rbac-test-${Date.now()}`;

  const createResponse = await authFetch("/api/admin/products", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      sku: `${slug}-sku`,
      name: "RBAC Test Product",
      description: "Used for role-based access verification",
      price: 199.99,
      compareAtPrice: 229.99,
      stock: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    }),
  });

  assert(createResponse.status === 201, `Create expected 201, got ${createResponse.status}`);
  const created = await createResponse.json();
  const productId = created?.item?.id;
  assert(productId, "Create response did not include product id");

  const editorPatchResponse = await authFetch(`/api/admin/products/${productId}`, editorCookie, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "RBAC Test Product Updated" }),
  });

  assert(
    editorPatchResponse.status === 200,
    `Editor PATCH expected 200, got ${editorPatchResponse.status}`,
  );

  const editorDeleteResponse = await authFetch(`/api/admin/products/${productId}`, editorCookie, {
    method: "DELETE",
  });

  assert(
    editorDeleteResponse.status === 403,
    `Editor DELETE expected 403, got ${editorDeleteResponse.status}`,
  );

  const adminDeleteResponse = await authFetch(`/api/admin/products/${productId}`, adminCookie, {
    method: "DELETE",
  });

  assert(
    adminDeleteResponse.status === 200,
    `Admin DELETE expected 200, got ${adminDeleteResponse.status}`,
  );

  const deletedRecord = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      deleted: true,
      deletedDate: true,
      deletedUserId: true,
    },
  });

  assert(deletedRecord?.deleted === true, "Soft delete expected deleted=true");
  assert(deletedRecord?.deletedDate, "Soft delete expected deletedDate");
  assert(deletedRecord?.deletedUserId, "Soft delete expected deletedUserId");

  console.log("RBAC verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
