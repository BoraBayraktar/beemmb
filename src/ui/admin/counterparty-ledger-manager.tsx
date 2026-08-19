"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminCounterpartyLedgerResult } from "@/modules/finance/contracts/counterparty-ledger.contract";

type Labels = {
  back: string;
  counterparty: string;
  openBalance: string;
  movementCount: string;
  collectionOrPaymentCount: string;
  documentCount: string;
  occurredAt: string;
  amount: string;
  runningBalance: string;
  status: string;
  openSource: string;
  openFinanceRoute: string;
  empty: string;
  notSpecified: string;
  defaultPaymentTermSummary: string;
  lastMovementAt: string;
};

type Props = {
  locale: string;
  backHref: string;
  result: AdminCounterpartyLedgerResult;
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

function kindLabel(kind: AdminCounterpartyLedgerResult["items"][number]["kind"]) {
  if (kind === "RECEIVABLE") {
    return "Alacak";
  }

  if (kind === "PAYABLE") {
    return "Borç";
  }

  if (kind === "COLLECTION") {
    return "Tahsilat";
  }

  if (kind === "PAYMENT") {
    return "Ödeme";
  }

  if (kind === "CASH_IN") {
    return "Gelir";
  }

  if (kind === "CASH_OUT") {
    return "Gider";
  }

  return "Belge";
}

export function CounterpartyLedgerManager({ locale, backHref, result, labels }: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href={backHref} className="text-sm font-medium text-[color:var(--color-text-muted)] no-underline hover:text-[color:var(--color-text)]">
            {labels.back}
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{result.summary.counterpartyName}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.counterparty}: {result.summary.counterpartyName}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{result.summary.openBalanceLabel}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{formatMoney(result.summary.openBalanceAmount, result.summary.currency)}</p>
          </article>
          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.defaultPaymentTermSummary}</p>
            <p className="mt-3 text-sm font-semibold text-blue-950">{result.summary.financeTerms.defaultPaymentTermSummary}</p>
            <p className="mt-2 text-sm text-blue-800">{result.summary.financeTerms.collectionOrPaymentDueHint}</p>
            {result.summary.financeTerms.creditLimitSummary ? (
              <p className="mt-2 text-sm text-blue-800">{result.summary.financeTerms.creditLimitSummary}</p>
            ) : null}
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.movementCount}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.movementCount}</p>
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.collectionOrPaymentCount}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.collectionOrPaymentCount}</p>
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.documentCount}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.documentCount}</p>
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.lastMovementAt}</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--color-text)]">
              {result.summary.lastMovementAt ? formatDate(result.summary.lastMovementAt) : labels.notSpecified}
            </p>
          </article>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[120px_1.4fr_180px_150px_150px_1fr] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.status}</span>
            <span>{labels.counterparty}</span>
            <span>{labels.occurredAt}</span>
            <span>{labels.amount}</span>
            <span>{labels.runningBalance}</span>
            <span>{labels.openFinanceRoute}</span>
          </div>
          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            result.items.map((item) => (
              <article key={item.id} className="grid gap-4 border-b border-[color:var(--color-border)] p-4 last:border-b-0 lg:grid-cols-[120px_1.4fr_180px_150px_150px_1fr] lg:items-center">
                <Badge className="w-fit border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)]">{kindLabel(item.kind)}</Badge>
                <div>
                  <p className="font-medium text-[color:var(--color-text)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.status}: {item.statusLabel ?? labels.notSpecified}</p>
                </div>
                <p className="text-sm text-[color:var(--color-text-muted)]">{formatDate(item.occurredAt)}</p>
                <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.amount, item.currency)}</p>
                <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.runningBalance, item.currency)}</p>
                <div className="flex flex-wrap gap-2">
                  {item.financeHref ? (
                    <Link href={item.financeHref} className="text-sm font-medium text-[color:var(--color-text)] no-underline hover:text-[color:var(--color-text)]">
                      {labels.openFinanceRoute}
                    </Link>
                  ) : null}
                  {item.sourceHref ? (
                    <Link href={item.sourceHref} className="text-sm font-medium text-[color:var(--color-text)] no-underline hover:text-[color:var(--color-text)]">
                      {labels.openSource}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
