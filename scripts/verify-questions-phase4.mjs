import { PrismaClient } from "@prisma/client";

const candidateBaseUrls = [
  process.env.APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

let baseUrl = candidateBaseUrls[0];
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

async function resolveBaseUrl() {
  for (const candidate of candidateBaseUrls) {
    try {
      const response = await fetch(`${candidate}/api/identity/me`, {
        method: "GET",
        headers: {
          Cookie: "auth=probe",
        },
      });

      if (response.status === 401 || response.status === 200 || response.status === 403) {
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error(`No reachable base URL found. Tried: ${candidateBaseUrls.join(", ")}`);
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

  const payload = await response.json();
  return { cookie, user: payload.user };
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

async function getQuestionStats(cookie) {
  const response = await authFetch("/api/admin/products/questions/stats", cookie);
  assert(response.status === 200, `Stats endpoint expected 200, got ${response.status}`);
  return response.json();
}

async function listQuestions(cookie, params) {
  const query = new URLSearchParams();
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.search) {
    query.set("search", params.search);
  }
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));

  const response = await authFetch(`/api/admin/products/questions?${query.toString()}`, cookie);
  assert(response.status === 200, `Questions list expected 200, got ${response.status}`);
  return response.json();
}

async function createProduct(cookie, slug) {
  const response = await authFetch("/api/admin/products", cookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      sku: `${slug}-sku`,
      name: `Phase4 QA ${slug}`,
      description: "Phase 4 smoke verification product",
      price: 149.99,
      compareAtPrice: 199.99,
      stock: 12,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    }),
  });

  assert(response.status === 201, `Product create expected 201, got ${response.status}`);
  const payload = await response.json();
  const productId = payload?.item?.id;
  assert(productId, "Product create did not return item id");
  return productId;
}

async function createQuestion(cookie, slug, question) {
  const response = await authFetch(`/api/catalog/products/${slug}/questions`, cookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  assert(response.status === 201, `Question create expected 201, got ${response.status}`);
  const payload = await response.json();
  const questionId = payload?.item?.id;
  assert(questionId, "Question create did not return item id");
  return questionId;
}

async function bulkModerate(cookie, body) {
  const response = await authFetch("/api/admin/products/questions/bulk", cookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  assert(response.status === 200, `Bulk moderation expected 200, got ${response.status}`);
  return response.json();
}

async function main() {
  baseUrl = await resolveBaseUrl();
  const { cookie: adminCookie } = await login("admin@beemmb.local", "Admin123!");

  const unique = Date.now();
  const slug = `phase4-question-${unique}`;
  const marker = `PHASE4-${unique}`;
  let productId = null;

  try {
    const statsBefore = await getQuestionStats(adminCookie);

    productId = await createProduct(adminCookie, slug);

    const q1 = await createQuestion(adminCookie, slug, `${marker} pending q1`);
    const q2 = await createQuestion(adminCookie, slug, `${marker} pending q2`);
    const q3 = await createQuestion(adminCookie, slug, `${marker} pending q3`);

    const listAfterCreate = await listQuestions(adminCookie, {
      status: "all",
      search: marker,
      pageSize: 30,
    });
    assert(listAfterCreate.items.length === 3, `Expected 3 created questions, got ${listAfterCreate.items.length}`);

    const statsAfterCreate = await getQuestionStats(adminCookie);
    assert(statsAfterCreate.pending >= statsBefore.pending + 3, "Pending stats should increase after question creation");

    const bulkAnswerResult = await bulkModerate(adminCookie, {
      ids: [q1, q2],
      action: "answer",
      answer: `${marker} bulk answer`,
    });
    assert(bulkAnswerResult.affected >= 2, `Bulk answer affected expected >=2, got ${bulkAnswerResult.affected}`);

    const answeredList = await listQuestions(adminCookie, {
      status: "answered",
      search: marker,
      pageSize: 30,
    });
    const answeredIds = new Set(answeredList.items.map((item) => item.id));
    assert(answeredIds.has(q1) && answeredIds.has(q2), "Answered list should include bulk-answered questions");

    const statsAfterAnswer = await getQuestionStats(adminCookie);
    assert(
      statsAfterAnswer.answered >= statsAfterCreate.answered + 2,
      "Answered stats should increase after bulk answer",
    );

    const bulkDeleteResult = await bulkModerate(adminCookie, {
      ids: [q3],
      action: "delete",
    });
    assert(bulkDeleteResult.affected >= 1, `Bulk delete affected expected >=1, got ${bulkDeleteResult.affected}`);

    const listAfterDelete = await listQuestions(adminCookie, {
      status: "all",
      search: marker,
      pageSize: 30,
    });
    assert(listAfterDelete.items.length === 2, `Expected 2 questions after delete, got ${listAfterDelete.items.length}`);
    assert(
      listAfterDelete.items.every((item) => item.id !== q3),
      "Deleted question should not appear in list",
    );

    const statsAfterDelete = await getQuestionStats(adminCookie);
    assert(
      statsAfterDelete.total <= statsAfterAnswer.total - 1,
      "Total stats should decrease after bulk delete",
    );

    console.log("Phase 4 product question moderation verification passed");
  } finally {
    if (productId) {
      await prisma.product.updateMany({
        where: {
          id: productId,
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
