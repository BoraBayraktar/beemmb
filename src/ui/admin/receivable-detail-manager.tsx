import Link from "next/link";

import type { AdminReceivableDetail } from "@/modules/finance/contracts/receivables.contract";

type Labels = {
  title: string;
  description: string;
  paymentStatus: string;
  totalAmount: string;
  itemCount: string;
  orderDate: string;
  latestDocument: string;
  backToList: string;
  openOrder: string;
  notSpecified: string;
  documentsTitle: string;
  openCollection: string;
  financeDocumentMovementPreviewOpen: string;
  counterpartyFinanceHint: string | null;
};

type Props = {
  locale: string;
  item: AdminReceivableDetail;
  labels: Labels;
};

function formatPaymentStatus(value: AdminReceivableDetail["paymentStatus"]) {
  if (value === "AUTHORIZED") {
    return "Provizyonlu";
  }

  if (value === "FAILED") {
    return "Başarısız ödeme";
  }

  return "Bekleyen ödeme";
}

export function ReceivableDetailManager({ locale, item, labels }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{item.orderNumber}</h1>
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/admin/finance/receivables`} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
              {labels.backToList}
            </Link>
            <Link href={`/${locale}/admin/orders/${item.orderId}`} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
              {labels.openOrder}
            </Link>
            <Link href={`/${locale}/admin/finance/collections/${item.orderId}`} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
              {labels.openCollection}
            </Link>
          </div>
        </div>
      </section>

      {labels.counterpartyFinanceHint ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-900">{labels.counterpartyFinanceHint}</p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.totalAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-950">{item.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.paymentStatus}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{formatPaymentStatus(item.paymentStatus)}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.itemCount}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{item.itemCount}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.orderDate}</p>
          <p className="mt-3 text-sm font-semibold text-[color:var(--color-text)]">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
        </article>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.title}</h2>
        <div className="mt-4 grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
          <p>{labels.paymentStatus}: {formatPaymentStatus(item.paymentStatus)}</p>
          <p>{labels.totalAmount}: {item.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}</p>
          <p>{labels.itemCount}: {item.itemCount}</p>
          <p>{labels.latestDocument}: {item.latestDocument?.documentNumber ?? labels.notSpecified}</p>
          <p>{labels.orderDate}: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
          <p>{labels.title}: {item.counterpartyName}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.documentsTitle}</h2>
        {item.documents.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">{labels.notSpecified}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {item.documents.map((document) => (
              <li key={document.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text)]">
                <p className="font-semibold text-[color:var(--color-text)]">{document.documentNumber}</p>
                <p className="mt-1">
                  {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(document.issueDate))}
                  {" • "}
                  {(document.totalAmount ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {document.currency}
                </p>
                <Link
                  href={`/${locale}/admin/finance/business-documents/${document.id}/movements`}
                  className="mt-2 inline-flex text-sm font-medium text-[color:var(--color-text)] underline-offset-2 hover:underline"
                >
                  {labels.financeDocumentMovementPreviewOpen}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
