"use client";

import Link from "next/link";

import type { AdminCashTransactionDetail } from "@/modules/finance/contracts/cash-transactions.contract";
import { FinanceAllocationSummaryPanel } from "@/ui/admin/finance-allocation-summary";

type Labels = {
  back: string;
  title: string;
  account: string;
  amount: string;
  date: string;
  direction: string;
  sourceType: string;
  counterparty: string;
  note: string;
  openLedger: string;
  allocationTitle: string;
  allocationEmpty: string;
  allocationTarget: string;
  allocationAmount: string;
  allocationMismatch: string;
  notSpecified: string;
  incoming: string;
  outgoing: string;
  transfer: string;
};

type Props = {
  locale: string;
  detail: AdminCashTransactionDetail;
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

export function CashTransactionDetailManager({ locale, detail, labels }: Props) {
  const ledgerHref = detail.customerAccountSlug
    ? `/${locale}/admin/finance/cari/${encodeURIComponent(detail.customerAccountSlug)}`
    : detail.supplierSlug
      ? `/${locale}/admin/finance/cari/${encodeURIComponent(detail.supplierSlug)}`
      : null;

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="border-b border-[color:var(--color-border)] p-5">
        <Link href={`/${locale}/admin/finance/transactions`} className="text-sm font-medium text-[color:var(--color-text-muted)] no-underline hover:text-[color:var(--color-text)]">
          {labels.back}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{detail.title}</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.title}</p>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 md:grid-cols-2">
          <p className="text-sm text-[color:var(--color-text)]">{labels.account}: <span className="font-medium text-[color:var(--color-text)]">{detail.accountName}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.amount}: <span className="font-medium text-[color:var(--color-text)]">{formatMoney(detail.amount, detail.currency)}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.date}: <span className="font-medium text-[color:var(--color-text)]">{formatDate(detail.transactionAt)}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.direction}: <span className="font-medium text-[color:var(--color-text)]">{detail.direction === "IN" ? labels.incoming : detail.direction === "OUT" ? labels.outgoing : labels.transfer}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.sourceType}: <span className="font-medium text-[color:var(--color-text)]">{detail.sourceType}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">
            {labels.counterparty}:{" "}
            {ledgerHref ? (
              <Link href={ledgerHref} className="font-medium text-[color:var(--color-text)] no-underline hover:underline">
                {detail.counterpartyName ?? labels.openLedger}
              </Link>
            ) : (
              <span className="font-medium text-[color:var(--color-text)]">{detail.counterpartyName ?? labels.notSpecified}</span>
            )}
          </p>
          <p className="text-sm text-[color:var(--color-text)] md:col-span-2">{labels.note}: <span className="font-medium text-[color:var(--color-text)]">{detail.note ?? labels.notSpecified}</span></p>
        </div>

        <FinanceAllocationSummaryPanel
          summary={detail.allocationSummary}
          labels={{
            title: labels.allocationTitle,
            empty: labels.allocationEmpty,
            target: labels.allocationTarget,
            amount: labels.allocationAmount,
            mismatch: labels.allocationMismatch,
          }}
        />
      </div>
    </section>
  );
}
