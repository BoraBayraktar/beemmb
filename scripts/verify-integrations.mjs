import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  const integrationServiceSource = readFileSync(join(process.cwd(), "src/modules/integration/services/integration.service.ts"), "utf8");
  assert(integrationServiceSource.includes("BANK_SANDBOX"), "Integration servisi PF9 BANK_SANDBOX kanalını içermelidir.");
  assert(integrationServiceSource.includes("financeBankIntegrationService"), "Integration servisi banka finans entegrasyonunu tetiklemelidir.");

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.user.upsert({
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
      tenantId: "tenant-beemmb-platform",
      email: "admin@beemmb.local",
      name: "Admin User",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  const adminCookie = await login("admin@beemmb.local", "Admin123!");

  const unique = Date.now();
  const createProductResponse = await authFetch("/api/admin/products", adminCookie, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: `integration-verify-${unique}`,
      sku: `integration-verify-sku-${unique}`,
      name: "Integration Verify Product",
      description: "Temporary product for integration verification",
      price: 199,
      compareAtPrice: 219,
      stock: 5,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    }),
  });

  assert(createProductResponse.status === 201, `Create product expected 201, got ${createProductResponse.status}`);
  const productPayload = await createProductResponse.json();
  const productId = productPayload?.item?.id;
  assert(productId, "Create product should return id");

  try {
    const enqueueOkResponse = await authFetch("/api/admin/integrations/jobs", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "TRENDYOL",
        jobType: "PRODUCT_SYNC",
        entityType: "PRODUCT",
        entityIds: [productId],
      }),
    });

    assert(enqueueOkResponse.status === 201, `Enqueue expected 201, got ${enqueueOkResponse.status}`);
    const enqueueOkPayload = await enqueueOkResponse.json();
    assert(enqueueOkPayload.accepted === 1, "Expected one accepted integration job");

    const enqueueDuplicateResponse = await authFetch("/api/admin/integrations/jobs", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "TRENDYOL",
        jobType: "PRODUCT_SYNC",
        entityType: "PRODUCT",
        entityIds: [productId],
      }),
    });

    assert(enqueueDuplicateResponse.status === 201, `Duplicate enqueue expected 201, got ${enqueueDuplicateResponse.status}`);
    const enqueueDuplicatePayload = await enqueueDuplicateResponse.json();
    assert(enqueueDuplicatePayload.deduplicated === 1, "Duplicate enqueue should be deduplicated");

    const enqueueFailResponse = await authFetch("/api/admin/integrations/jobs", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "N11",
        jobType: "STOCK_SYNC",
        entityType: "PRODUCT",
        entityIds: [productId],
        maxAttempts: 1,
        payload: {
          forceFail: true,
        },
      }),
    });

    assert(enqueueFailResponse.status === 201, `Fail enqueue expected 201, got ${enqueueFailResponse.status}`);

    const processOne = await authFetch("/api/admin/integrations/worker", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 20 }),
    });
    assert(processOne.status === 200, `Process queue expected 200, got ${processOne.status}`);

    const jobsAfterProcess = await authFetch("/api/admin/integrations/jobs?page=1&pageSize=20", adminCookie);
    assert(jobsAfterProcess.status === 200, `Job list expected 200, got ${jobsAfterProcess.status}`);
    const jobsPayload = await jobsAfterProcess.json();

    const successJob = jobsPayload.items.find((item) => item.channel === "TRENDYOL" && item.jobType === "PRODUCT_SYNC" && item.entityId === productId);
    assert(successJob, "Expected trendyol product sync job in list");
    assert(successJob.status === "SUCCESS", "Expected trendyol product sync job to be success");

    const deadJob = jobsPayload.items.find((item) => item.channel === "N11" && item.jobType === "STOCK_SYNC" && item.entityId === productId);
    assert(deadJob, "Expected n11 stock sync job in list");
    assert(deadJob.status === "DEAD_LETTER", "Expected n11 stock sync to move dead-letter");

    const deadLettersResponse = await authFetch("/api/admin/integrations/dead-letters", adminCookie);
    assert(deadLettersResponse.status === 200, `Dead letter list expected 200, got ${deadLettersResponse.status}`);
    const deadLettersPayload = await deadLettersResponse.json();
    const deadLetter = deadLettersPayload.items.find((item) => item.jobId === deadJob.id);
    assert(deadLetter, "Expected dead-letter record for failed integration job");

    const retryResponse = await authFetch(`/api/admin/integrations/dead-letters/${deadJob.id}/retry`, adminCookie, {
      method: "POST",
    });
    assert(retryResponse.status === 200, `Retry dead letter expected 200, got ${retryResponse.status}`);

    const processAfterRetry = await authFetch("/api/admin/integrations/worker", adminCookie, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 20 }),
    });
    assert(processAfterRetry.status === 200, `Process queue after retry expected 200, got ${processAfterRetry.status}`);

    const finalJobsResponse = await authFetch("/api/admin/integrations/jobs?page=1&pageSize=20", adminCookie);
    const finalJobsPayload = await finalJobsResponse.json();
    const retriedJob = finalJobsPayload.items.find((item) => item.id === deadJob.id);
    assert(retriedJob.status === "SUCCESS", "Retried dead-letter job should become success");

    console.log("Integrations verification passed");
  } finally {
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
