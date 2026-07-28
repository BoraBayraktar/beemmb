import type { AdminCounterpartyLedgerMovementKind } from "@/modules/finance/contracts/counterparty-ledger.contract";

export type CounterpartyLedgerPerspective = "customer" | "supplier";

export function resolveCounterpartySignedAmount(
  kind: AdminCounterpartyLedgerMovementKind,
  amount: number,
  perspective: CounterpartyLedgerPerspective,
) {
  if (perspective === "customer") {
    if (kind === "RECEIVABLE" || kind === "DOCUMENT") {
      return amount;
    }

    if (kind === "COLLECTION" || kind === "CASH_IN") {
      return -amount;
    }

    if (kind === "CASH_OUT") {
      return amount;
    }

    return 0;
  }

  if (kind === "PAYABLE" || kind === "DOCUMENT") {
    return amount;
  }

  if (kind === "PAYMENT" || kind === "CASH_OUT") {
    return -amount;
  }

  if (kind === "CASH_IN") {
    return -amount;
  }

  return 0;
}

export function attachCounterpartyRunningBalances<
  T extends { id: string; occurredAt: string; signedAmount: number },
>(items: T[]) {
  const ascending = [...items].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  let running = 0;

  const balanceById = new Map<string, number>();
  for (const item of ascending) {
    running = Number((running + item.signedAmount).toFixed(2));
    balanceById.set(item.id, running);
  }

  return items.map((item) => ({
    ...item,
    runningBalance: balanceById.get(item.id) ?? 0,
  }));
}
