(function verifyFinanceInventoryPayableSummary() {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  const documents = [
    {
      id: "doc-1",
      documentNumber: "BLG-1",
      inventoryTransactionId: "tx-1",
      inventoryTransactionNumber: "STK-1",
      lines: [{ quantity: 2 }, { quantity: 3 }],
    },
    {
      id: "doc-2",
      documentNumber: "BLG-2",
      inventoryTransactionId: null,
      inventoryTransactionNumber: null,
      lines: [{ quantity: 1 }],
    },
  ];

  const linkedDocumentCount = documents.filter((document) => document.inventoryTransactionId || document.inventoryTransactionNumber).length;
  const totalLineQuantity = documents.reduce(
    (sum, document) => sum + document.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );

  assert(linkedDocumentCount === 1, "Envanter baglantili belge sayisi dogru hesaplanmalidir.");
  assert(totalLineQuantity === 6, "Toplam satir miktari dogru hesaplanmalidir.");

  console.log("verify-finance-inventory-payable-summary: ok");
})();
