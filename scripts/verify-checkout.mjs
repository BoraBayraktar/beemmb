import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.APP_URL || "http://localhost:3001";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readAggregateStock(productId) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      stock: true,
      inventoryItem: {
        select: {
          inventoryLevels: {
            where: {
              warehouse: {
                isActive: true,
              },
            },
            select: {
              onHand: true,
              reserved: true,
            },
          },
        },
      },
    },
  });

  assert(product, "Product missing while reading aggregate stock");

  const levels = product.inventoryItem?.inventoryLevels ?? [];
  const aggregateStock = levels.length > 0
    ? levels.reduce((sum, level) => sum + Math.max(0, level.onHand - level.reserved), 0)
    : product.stock;

  return {
    summaryStock: product.stock,
    aggregateStock,
  };
}

async function main() {
  let product = await prisma.product.findFirst({
    where: {
      deleted: false,
      stock: {
        gte: 2,
      },
    },
    select: {
      id: true,
      stock: true,
      price: true,
      currency: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  let createdProductId = null;

  if (!product) {
    const unique = Date.now();
    const created = await prisma.product.create({
      data: {
        tenantId: "tenant-beemmb-platform",
        slug: `checkout-verify-${unique}`,
        sku: `checkout-verify-sku-${unique}`,
        name: "Checkout Verify Product",
        description: "Temporary product for checkout verification",
        price: 149.9,
        compareAtPrice: 179.9,
        stock: 5,
        currency: "TRY",
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      },
      select: {
        id: true,
        stock: true,
        price: true,
        currency: true,
      },
    });

    product = created;
    createdProductId = created.id;
  }

  const initialStock = product.stock;
  let createdOrderNumber = null;

  try {
    const quoteResponse = await fetch(`${baseUrl}/api/commerce/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: [{ productId: product.id, quantity: 1 }],
      }),
    });

    assert(quoteResponse.status === 200, `Quote expected 200, got ${quoteResponse.status}`);
    const quotePayload = await quoteResponse.json();

    assert(Array.isArray(quotePayload.lines), "Quote payload should include lines");
    assert(quotePayload.lines.length === 1, "Quote payload should include one line");
    assert(quotePayload.lines[0].inStock === true, "Quote line should be in stock");

    const checkoutResponse = await fetch(`${baseUrl}/api/commerce/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: [{ productId: product.id, quantity: 1 }],
      }),
    });

    assert(checkoutResponse.status === 201, `Checkout expected 201, got ${checkoutResponse.status}`);
    const checkoutPayload = await checkoutResponse.json();
    assert(checkoutPayload.orderNumber, "Checkout should return order number");
    assert(typeof checkoutPayload.discountTotal === "number", "Checkout should return discountTotal");
    assert(typeof checkoutPayload.total === "number", "Checkout should return total");
    assert(checkoutPayload.total === checkoutPayload.subtotal - checkoutPayload.discountTotal, "Checkout total should match subtotal-discount");
    createdOrderNumber = checkoutPayload.orderNumber;

    const savedOrder = await prisma.order.findUnique({
      where: {
        orderNumber: checkoutPayload.orderNumber,
      },
      include: {
        items: true,
        paymentStatusHistory: true,
      },
    });

    assert(savedOrder, "Checkout should persist order");
    assert(savedOrder.items.length >= 1, "Persisted order should include at least one item");
    assert(savedOrder.paymentStatus === "PENDING", "Checkout should initialize payment status");
    assert(savedOrder.paymentStatusHistory.length >= 1, "Checkout should persist payment status history");

    const afterCheckout = await readAggregateStock(product.id);
    assert(afterCheckout.summaryStock === initialStock - 1, "Checkout should sync summary stock by 1");
    assert(afterCheckout.aggregateStock === initialStock - 1, "Checkout should decrement aggregate stock by 1");
    assert(afterCheckout.summaryStock === afterCheckout.aggregateStock, "Checkout should keep summary and aggregate stock aligned");

    const outOfStockResponse = await fetch(`${baseUrl}/api/commerce/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: [{ productId: product.id, quantity: initialStock + 1 }],
      }),
    });

    assert(outOfStockResponse.status === 409, `Insufficient stock expected 409, got ${outOfStockResponse.status}`);

    console.log("Checkout integration verification passed");
  } finally {
    if (createdOrderNumber) {
      await prisma.order.updateMany({
        where: {
          orderNumber: createdOrderNumber,
        },
        data: {
          deleted: true,
          deletedDate: new Date(),
          deletedUserId: "integration-test-cleanup",
        },
      });
    }

    await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        stock: initialStock,
        ...(createdProductId
          ? {
              deleted: true,
              deletedDate: new Date(),
              deletedUserId: "integration-test-cleanup",
            }
          : {}),
      },
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
