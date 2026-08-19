import type { AdminInventoryPayableSummary } from "@/modules/finance/contracts/inventory-payable-summary.contract";

type Labels = {
  title: string;
  linkedDocumentCount: string;
  totalLineQuantity: string;
  documentNumber: string;
  inventoryTransaction: string;
  lineQuantity: string;
  openInventory: string;
  empty: string;
  notSpecified: string;
};

type Props = {
  summary: AdminInventoryPayableSummary;
  labels: Labels;
};

export function FinanceInventoryPayableSummaryPanel({ summary, labels }: Props) {
  return (
    <details className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
      <summary className="cursor-pointer text-lg font-semibold text-[color:var(--color-text)]">{labels.title}</summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <p className="text-sm text-[color:var(--color-text)]">
          {labels.linkedDocumentCount}:{" "}
          <span className="font-medium text-[color:var(--color-text)]">{summary.linkedDocumentCount}</span>
        </p>
        <p className="text-sm text-[color:var(--color-text)]">
          {labels.totalLineQuantity}:{" "}
          <span className="font-medium text-[color:var(--color-text)]">{summary.totalLineQuantity}</span>
        </p>
      </div>
      {summary.documents.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {summary.documents.map((document) => (
            <li key={document.documentId} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text)]">
              <p className="font-semibold text-[color:var(--color-text)]">{labels.documentNumber}: {document.documentNumber}</p>
              <p className="mt-1">
                {labels.inventoryTransaction}:{" "}
                {document.inventoryTransactionNumber ?? labels.notSpecified}
                {document.inventoryTransactionType ? ` • ${document.inventoryTransactionType}` : ""}
              </p>
              <p className="mt-1">
                {labels.lineQuantity}: {document.lineQuantityTotal}
              </p>
              {document.inventoryHref ? (
                <a href={document.inventoryHref} className="mt-2 inline-flex text-sm font-medium text-[color:var(--color-text)] underline-offset-2 hover:underline">
                  {labels.openInventory}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
