(function verifyFinanceAllocationLines() {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  type Line = { id: string; lineTotal: number; orderId: string; documentId: string };

  function distributeAmountToLines(args: {
    lines: Line[];
    amount: number;
    orderId: string;
  }) {
    let remaining = Number(args.amount.toFixed(2));
    const links: Array<{ targetType: "BUSINESS_DOCUMENT_LINE" | "ORDER"; lineId?: string; amount: number }> = [];

    for (const line of args.lines) {
      if (remaining <= 0) {
        break;
      }

      const lineAmount = Number(line.lineTotal.toFixed(2));
      if (lineAmount <= 0) {
        continue;
      }

      const slice = Math.min(remaining, lineAmount);
      links.push({
        targetType: "BUSINESS_DOCUMENT_LINE",
        lineId: line.id,
        amount: slice,
      });
      remaining = Number((remaining - slice).toFixed(2));
    }

    if (remaining > 0) {
      links.push({
        targetType: "ORDER",
        amount: remaining,
      });
    }

    return links;
  }

  const fullLineCoverage = distributeAmountToLines({
    lines: [
      { id: "line-1", lineTotal: 60, orderId: "ord-1", documentId: "doc-1" },
      { id: "line-2", lineTotal: 40, orderId: "ord-1", documentId: "doc-1" },
    ],
    amount: 100,
    orderId: "ord-1",
  });

  assert(fullLineCoverage.length === 2, "Tam tutar iki satıra bölünmelidir.");
  assert(fullLineCoverage.every((item) => item.targetType === "BUSINESS_DOCUMENT_LINE"), "Tam tutar satır hedefi kullanmalıdır.");
  assert(
    fullLineCoverage.reduce((sum, item) => sum + item.amount, 0) === 100,
    "Satır dağıtımı tahsilat tutarını korumalıdır.",
  );

  const withOrderRemainder = distributeAmountToLines({
    lines: [{ id: "line-1", lineTotal: 30, orderId: "ord-1", documentId: "doc-1" }],
    amount: 50,
    orderId: "ord-1",
  });

  assert(withOrderRemainder.length === 2, "Kalan tutar ORDER hedefi ile tamamlanmalıdır.");
  assert(withOrderRemainder[0]?.amount === 30, "İlk dilim satır tutarı kadar olmalıdır.");
  assert(withOrderRemainder[1]?.targetType === "ORDER", "Kalan tutar sipariş hedefine yazılmalıdır.");
  assert(withOrderRemainder[1]?.amount === 20, "ORDER kalanı doğru hesaplanmalıdır.");

  console.log("verify-finance-allocation-lines: ok");
})();
