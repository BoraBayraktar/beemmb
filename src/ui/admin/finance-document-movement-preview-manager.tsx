import Link from "next/link";

import type { AdminDocumentFinancePreview } from "@/modules/finance/contracts/document-finance-preview.contract";

type Labels = {
  title: string;
  empty: string;
  documentAmount: string;
  allocatedAmount: string;
  openFinanceRoute: string;
  occurredAt: string;
  amount: string;
  backToDocuments: string;
};

type Props = {
  locale: string;
  preview: AdminDocumentFinancePreview;
  labels: Labels;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FinanceDocumentMovementPreviewManager({ locale, preview, labels }: Props) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
        <Link href={`/${locale}/admin/documents`} className="text-sm font-medium text-[color:var(--color-text-muted)] no-underline hover:text-[color:var(--color-text)]">
          {labels.backToDocuments}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{preview.documentNumber}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="text-sm text-[color:var(--color-text)]">
            {labels.documentAmount}:{" "}
            <span className="font-medium text-[color:var(--color-text)]">{formatMoney(preview.documentAmount, preview.currency)}</span>
          </p>
          <p className="text-sm text-[color:var(--color-text)]">
            {labels.allocatedAmount}:{" "}
            <span className="font-medium text-[color:var(--color-text)]">{formatMoney(preview.allocatedAmount, preview.currency)}</span>
          </p>
        </div>
      </div>

      {preview.items.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
      ) : (
        <ul className="space-y-3">
          {preview.items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{formatDate(item.occurredAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(item.amount, item.currency)}</p>
                  {item.financeHref ? (
                    <Link href={item.financeHref} className="text-sm font-medium text-[color:var(--color-text)] underline-offset-2 hover:underline">
                      {labels.openFinanceRoute}
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
