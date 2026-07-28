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
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <Link href={`/${locale}/admin/documents`} className="text-sm font-medium text-neutral-500 no-underline hover:text-neutral-950">
          {labels.backToDocuments}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{labels.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{preview.documentNumber}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="text-sm text-neutral-700">
            {labels.documentAmount}:{" "}
            <span className="font-medium text-neutral-950">{formatMoney(preview.documentAmount, preview.currency)}</span>
          </p>
          <p className="text-sm text-neutral-700">
            {labels.allocatedAmount}:{" "}
            <span className="font-medium text-neutral-950">{formatMoney(preview.allocatedAmount, preview.currency)}</span>
          </p>
        </div>
      </div>

      {preview.items.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">{labels.empty}</p>
      ) : (
        <ul className="space-y-3">
          {preview.items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-950">{item.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatDate(item.occurredAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{formatMoney(item.amount, item.currency)}</p>
                  {item.financeHref ? (
                    <Link href={item.financeHref} className="text-sm font-medium text-neutral-700 underline-offset-2 hover:underline">
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
