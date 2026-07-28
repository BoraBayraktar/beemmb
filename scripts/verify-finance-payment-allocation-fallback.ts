(function verifyFinancePaymentAllocationFallback() {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  type Document = { id: string; totalAmount: number | null };

  function distributeAmountToDocuments(documents: Document[], paymentAmount: number) {
    let remaining = Number(paymentAmount.toFixed(2));
    const links: Array<{ businessDocumentId: string; amount: number }> = [];

    for (const document of documents) {
      if (remaining <= 0) {
        break;
      }

      const documentAmount = Number((document.totalAmount ?? 0).toFixed(2));
      if (documentAmount <= 0) {
        continue;
      }

      const slice = Math.min(remaining, documentAmount);
      links.push({
        businessDocumentId: document.id,
        amount: slice,
      });
      remaining = Number((remaining - slice).toFixed(2));
    }

    return { links, remaining };
  }

  const result = distributeAmountToDocuments(
    [
      { id: "doc-1", totalAmount: 100 },
      { id: "doc-2", totalAmount: 250 },
    ],
    180,
  );

  assert(result.links.length === 2, "Belge FIFO eslestirmesi iki belgeye bolunmelidir.");
  assert(result.links[0]?.amount === 100, "Ilk belge tam eslesmelidir.");
  assert(result.links[1]?.amount === 80, "Ikinci belge kalan tutari almalidir.");
  assert(result.remaining === 0, "Odeme belge dagitiminda tum tutar eslesmelidir.");

  console.log("verify-finance-payment-allocation-fallback: ok");
})();
