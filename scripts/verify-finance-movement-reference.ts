import {
  buildFinanceMovementReference,
  buildFinanceTransferReference,
  normalizeFinanceMovementReference,
  parseFinanceMovementReference,
} from "@/modules/finance/services/finance-movement-reference.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const collectionRef = buildFinanceMovementReference("collection", "rec-1");
assert(collectionRef === "collection:rec-1", "collection referansı üretilmelidir.");

const paymentRef = buildFinanceMovementReference("payment", "pay-1");
assert(paymentRef === "payment:pay-1", "payment referansı üretilmelidir.");

const orderRef = buildFinanceMovementReference("order", "ord-1");
assert(orderRef === "order:ord-1", "order referansı üretilmelidir.");

assert(parseFinanceMovementReference(collectionRef).kind === "collection", "collection kind ayrıştırılmalıdır.");
assert(parseFinanceMovementReference(collectionRef).id === "rec-1", "collection id ayrıştırılmalıdır.");

assert(parseFinanceMovementReference("legacy-order-id").kind === null, "Eski düz order id kind üretmemelidir.");
assert(parseFinanceMovementReference("legacy-order-id").id === "legacy-order-id", "Eski düz id geriye dönük okunmalıdır.");

assert(
  normalizeFinanceMovementReference("order:ord-1") === "order:ord-1",
  "Normalize edilmiş order referansı korunmalıdır.",
);

const transferRef = buildFinanceTransferReference({
  sourceAccountId: "acc-src",
  targetAccountId: "acc-dst",
  transactionAtIso: "2026-01-01T00:00:00.000Z",
});
assert(transferRef.startsWith("transfer:"), "Transfer referansı transfer öneki taşımalıdır.");
assert(parseFinanceMovementReference(transferRef).kind === "transfer", "Transfer referansı ayrıştırılabilmelidir.");
assert(
  parseFinanceMovementReference("transfer:acc-src:acc-dst:2026-01-01T00:00:00.000Z").kind === "transfer",
  "Legacy transfer referansı desteklenmelidir.",
);

console.log("verify-finance-movement-reference: ok");
