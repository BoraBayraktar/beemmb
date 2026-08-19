"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminCollectionsResult } from "@/modules/finance/contracts/collections.contract";

type AccountOption = {
  id: string;
  label: string;
};

type Labels = {
  title: string;
  description: string;
  totalPendingAmount: string;
  totalRecordedAmount: string;
  pendingCount: string;
  authorizedCount: string;
  failedCount: string;
  recordedCount: string;
  counterparty: string;
  paymentStatus: string;
  financeStatus: string;
  financeStatusPending: string;
  financeStatusPartial: string;
  financeStatusCompleted: string;
  financeStatusFailed: string;
  orderDate: string;
  amount: string;
  remainingAmount: string;
  recordedCollectionCount: string;
  openDetail: string;
  openSource: string;
  createRecord: string;
  creatingRecord: string;
  createRecordSuccess: string;
  createRecordFailed: string;
  account: string;
  accountRequired: string;
  noResults: string;
};

type Props = {
  result: AdminCollectionsResult;
  accountOptions: AccountOption[];
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

function getFinanceStatus(item: AdminCollectionsResult["items"][number], labels: Labels) {
  if (item.remainingAmount <= 0) {
    return {
      label: labels.financeStatusCompleted,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (item.paymentStatus === "FAILED") {
    return {
      label: labels.financeStatusFailed,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (item.recordedCollectionCount > 0) {
    return {
      label: labels.financeStatusPartial,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: labels.financeStatusPending,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export function CollectionReadinessManager({ result, accountOptions, labels }: Props) {
  const router = useRouter();
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function createCollectionRecord(orderId: string, amount: number) {
    const financialAccountId = selectedAccountIds[orderId] ?? accountOptions[0]?.id ?? "";

    if (!financialAccountId) {
      setMessage(labels.accountRequired);
      return;
    }

    setBusyOrderId(orderId);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/finance/collections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            financialAccountId,
            amount,
            collectedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? labels.createRecordFailed);
        }

        setMessage(labels.createRecordSuccess);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : labels.createRecordFailed);
      } finally {
        setBusyOrderId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text)] shadow-sm">
          {message}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.totalPendingAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-950">{formatMoney(result.summary.totalPendingAmount, result.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.totalRecordedAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-blue-950">{formatMoney(result.summary.totalRecordedAmount, result.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{labels.pendingCount}</p>
          <p className="mt-3 text-2xl font-semibold text-amber-950">{result.summary.pendingCount}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.recordedCount}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.recordedCount}</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.authorizedCount}</p>
          <p className="mt-3 text-2xl font-semibold text-blue-950">{result.summary.authorizedCount}</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.failedCount}</p>
          <p className="mt-3 text-2xl font-semibold text-rose-950">{result.summary.failedCount}</p>
        </article>
      </section>

      <section className="grid gap-3">
        {result.items.length === 0 ? (
          <article className="rounded-3xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-sm text-[color:var(--color-text-muted)] shadow-sm">
            {labels.noResults}
          </article>
        ) : result.items.map((item) => (
          <article key={item.orderId} className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
            {(() => {
              const financeStatus = getFinanceStatus(item, labels);

              return (
                <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{item.orderNumber}</h2>
                <div className="mt-3 grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2 xl:grid-cols-4">
                  <p>{labels.counterparty}: {item.counterpartyName}</p>
                  <p>{labels.paymentStatus}: {item.paymentStatus}</p>
                  <p>
                    {labels.financeStatus}:{" "}
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${financeStatus.className}`}>
                      {financeStatus.label}
                    </span>
                  </p>
                  <p>{labels.orderDate}: {formatDate(item.createdAt)}</p>
                  <p>{labels.amount}: {formatMoney(item.totalAmount, item.currency)}</p>
                  <p>{labels.remainingAmount}: {formatMoney(item.remainingAmount, item.currency)}</p>
                  <p>{labels.recordedCollectionCount}: {item.recordedCollectionCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedAccountIds[item.orderId] ?? accountOptions[0]?.id ?? ""}
                  onChange={(event) => setSelectedAccountIds((current) => ({ ...current, [item.orderId]: event.target.value }))}
                  className="h-10 rounded-xl border border-[color:var(--color-border)] px-3 text-sm text-[color:var(--color-text)]"
                >
                  {accountOptions.length === 0 ? <option value="">{labels.account}</option> : null}
                  {accountOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={item.remainingAmount <= 0 || busyOrderId === item.orderId || isPending}
                  onClick={() => createCollectionRecord(item.orderId, item.remainingAmount)}
                  className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyOrderId === item.orderId ? labels.creatingRecord : labels.createRecord}
                </button>
                <Link href={item.detailHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                  {labels.openDetail}
                </Link>
                <Link href={item.sourceHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                  {labels.openSource}
                </Link>
              </div>
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </div>
  );
}
