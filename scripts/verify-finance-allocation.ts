(function verifyFinanceAllocation() {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function splitAmountAcrossDocuments(documents: Array<{ id: string; amount: number }>, paymentAmount: number) {
  let remaining = Number(paymentAmount.toFixed(2));
  const links: Array<{ businessDocumentId: string; amount: number }> = [];

  for (const document of documents) {
    if (remaining <= 0) {
      break;
    }

    const slice = Math.min(remaining, document.amount);
    if (slice <= 0) {
      continue;
    }

    links.push({
      businessDocumentId: document.id,
      amount: slice,
    });
    remaining = Number((remaining - slice).toFixed(2));
  }

  return { links, remaining };
}

const result = splitAmountAcrossDocuments(
  [
    { id: "doc-1", amount: 100 },
    { id: "doc-2", amount: 250 },
  ],
  180,
);

assert(result.links.length === 2, "FIFO eslestirme iki belgeye bolunmelidir.");
assert(result.links[0]?.amount === 100, "Ilk belge tam eslesmelidir.");
assert(result.links[1]?.amount === 80, "Ikinci belge kalan tutari almalidir.");
assert(result.remaining === 0, "Tum tutar dagitilmalidir.");

console.log("verify-finance-allocation: ok");
})();
