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

  const unique = Date.now();
  const createEmail = `user-test-${unique}@beemmb.local`;
  const updateEmail = `user-test-updated-${unique}@beemmb.local`;
  let createdUserId = null;

  const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/users`);
  assert(unauthorizedResponse.status === 401, `Unauthorized users list expected 401, got ${unauthorizedResponse.status}`);

  const editorForbiddenResponse = await authFetch("/api/admin/users", editorCookie);
  assert(editorForbiddenResponse.status === 403, `Editor users list expected 403, got ${editorForbiddenResponse.status}`);

  try {
    const createResponse = await authFetch("/api/admin/users", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: createEmail,
        name: "User Test Account",
        role: "EDITOR",
        password: "User1234!",
      }),
    });

    assert(createResponse.status === 201, `User create expected 201, got ${createResponse.status}`);
    const created = await createResponse.json();
    createdUserId = created?.item?.id;
    assert(createdUserId, "User create did not return item id");

    const listResponse = await authFetch(`/api/admin/users?search=${encodeURIComponent(createEmail)}`, adminCookie);
    assert(listResponse.status === 200, `Users list expected 200, got ${listResponse.status}`);
    const listPayload = await listResponse.json();
    assert(
      listPayload.items.some((item) => item.id === createdUserId && item.email === createEmail),
      "Created user should appear in users list",
    );

    const updateResponse = await authFetch(`/api/admin/users/${createdUserId}`, adminCookie, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: updateEmail,
        name: "User Test Updated",
        role: "ADMIN",
      }),
    });

    assert(updateResponse.status === 200, `User update expected 200, got ${updateResponse.status}`);

    const updated = await updateResponse.json();
    assert(updated?.item?.email === updateEmail, "User update should change e-mail");
    assert(updated?.item?.role === "ADMIN", "User update should change role");

    const meResponse = await authFetch("/api/identity/me", adminCookie);
    assert(meResponse.status === 200, `Identity me expected 200, got ${meResponse.status}`);
    const mePayload = await meResponse.json();

    const selfDeleteResponse = await authFetch(`/api/admin/users/${mePayload.user.id}`, adminCookie, {
      method: "DELETE",
    });
    assert(selfDeleteResponse.status === 409, `Self delete expected 409, got ${selfDeleteResponse.status}`);

    const deleteResponse = await authFetch(`/api/admin/users/${createdUserId}`, adminCookie, {
      method: "DELETE",
    });
    assert(deleteResponse.status === 200, `User delete expected 200, got ${deleteResponse.status}`);

    const deletedRecord = await prisma.user.findUnique({
      where: { id: createdUserId },
      select: {
        deleted: true,
        deletedDate: true,
        deletedUserId: true,
      },
    });

    assert(deletedRecord?.deleted === true, "User delete should set deleted=true");
    assert(deletedRecord?.deletedDate, "User delete should set deletedDate");
    assert(deletedRecord?.deletedUserId, "User delete should set deletedUserId");

    const invalidCreateResponse = await authFetch("/api/admin/users", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "bad-email",
        name: "x",
        role: "EDITOR",
        password: "123",
      }),
    });

    assert(invalidCreateResponse.status === 400, `Invalid user create expected 400, got ${invalidCreateResponse.status}`);

    console.log("User management integration verification passed");
  } finally {
    if (createdUserId) {
      await prisma.user.updateMany({
        where: {
          id: createdUserId,
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
