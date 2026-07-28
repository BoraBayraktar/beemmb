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

  const category = await prisma.category.findFirst({
    where: { deleted: false },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  const slug = category?.slug ?? "general";
  const formData = new FormData();
  const fileContent = Buffer.from(`arventa-upload-smoke-${Date.now()}`);
  const blob = new Blob([fileContent], { type: "image/png" });

  formData.set("slug", slug);
  formData.set("file", blob, "smoke.png");

  const uploadResponse = await authFetch("/api/admin/uploads/product-image", adminCookie, {
    method: "POST",
    body: formData,
  });

  assert(uploadResponse.status === 201, `Upload expected 201, got ${uploadResponse.status}`);

  const uploadPayload = await uploadResponse.json();
  const item = uploadPayload?.item;

  assert(item?.url, "Upload response should contain item.url");
  assert(item?.objectKey, "Upload response should contain item.objectKey");
  assert(item?.bucket, "Upload response should contain item.bucket");
  assert(item.contentType === "image/png", "Upload response should keep content type");
  assert(item.size > 0, "Upload response should include positive size");

  const publicResponse = await fetch(item.url, { method: "GET" });
  assert(publicResponse.ok, `Public image URL is not reachable: ${publicResponse.status}`);

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/uploads/product-image`, {
    method: "POST",
    body: formData,
  });

  assert(
    unauthorizedResponse.status === 401,
    `Unauthorized upload expected 401, got ${unauthorizedResponse.status}`,
  );

  console.log("Media upload integration verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
