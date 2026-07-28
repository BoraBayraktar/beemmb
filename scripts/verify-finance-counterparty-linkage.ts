import {
  buildFinanceMovementReference,
  parseFinanceMovementReference,
} from "@/modules/finance/services/finance-movement-reference.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const kinds = ["collection", "payment", "order", "transfer"] as const;

for (const kind of kinds) {
  const reference = buildFinanceMovementReference(kind, "abc123");
  const parsed = parseFinanceMovementReference(reference);
  assert(parsed.kind === kind, `${kind} referansı round-trip olmalıdır.`);
  assert(parsed.id === "abc123", `${kind} id round-trip olmalıdır.`);
}

assert(
  parseFinanceMovementReference(buildFinanceMovementReference("transfer", "a:b:2026-01-01")).id === "a:b:2026-01-01",
  "transfer referansında id içinde ':' korunmalıdır.",
);

console.log("verify-finance-counterparty-linkage: ok");
