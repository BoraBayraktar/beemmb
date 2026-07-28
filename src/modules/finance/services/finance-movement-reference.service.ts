export type FinanceMovementReferenceKind = "collection" | "payment" | "order" | "transfer" | "document";

const PREFIX = {
  collection: "collection:",
  payment: "payment:",
  order: "order:",
  transfer: "transfer:",
  document: "document:",
} as const;

export function buildFinanceMovementReference(kind: FinanceMovementReferenceKind, id: string) {
  return `${PREFIX[kind]}${id}`;
}

export function buildFinanceTransferReference(args: {
  sourceAccountId: string;
  targetAccountId: string;
  transactionAtIso: string;
}) {
  return buildFinanceMovementReference(
    "transfer",
    `${args.sourceAccountId}:${args.targetAccountId}:${args.transactionAtIso}`,
  );
}

export function parseFinanceMovementReference(value: string | null | undefined): {
  kind: FinanceMovementReferenceKind | null;
  id: string | null;
} {
  if (!value?.trim()) {
    return { kind: null, id: null };
  }

  const normalized = value.trim();
  for (const [kind, prefix] of Object.entries(PREFIX) as Array<[FinanceMovementReferenceKind, string]>) {
    if (normalized.startsWith(prefix)) {
      return {
        kind,
        id: normalized.slice(prefix.length) || null,
      };
    }
  }

  return { kind: null, id: normalized };
}

export function normalizeFinanceMovementReference(value: string | null | undefined) {
  const parsed = parseFinanceMovementReference(value);
  if (!parsed.kind || !parsed.id) {
    return value ?? null;
  }

  return buildFinanceMovementReference(parsed.kind, parsed.id);
}
