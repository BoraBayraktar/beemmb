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
    ? `/${locale}/admin/finance/customers/${encodeURIComponent(detail.customerAccountSlug)}`
    : detail.supplierSlug
      ? `/${locale}/admin/finance/suppliers/${encodeURIComponent(detail.supplierSlug)}`
      : null;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <Link href={`/${locale}/admin/finance/transactions`} className="text-sm font-medium text-neutral-500 no-underline hover:text-neutral-950">
          {labels.back}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{detail.title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{labels.title}</p>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-2">
          <p className="text-sm text-neutral-700">{labels.account}: <span className="font-medium text-neutral-950">{detail.accountName}</span></p>
          <p className="text-sm text-neutral-700">{labels.amount}: <span className="font-medium text-neutral-950">{formatMoney(detail.amount, detail.currency)}</span></p>
          <p className="text-sm text-neutral-700">{labels.date}: <span className="font-medium text-neutral-950">{formatDate(detail.transactionAt)}</span></p>
          <p className="text-sm text-neutral-700">{labels.direction}: <span className="font-medium text-neutral-950">{detail.direction === "IN" ? labels.incoming : detail.direction === "OUT" ? labels.outgoing : labels.transfer}</span></p>
          <p className="text-sm text-neutral-700">{labels.sourceType}: <span className="font-medium text-neutral-950">{detail.sourceType}</span></p>
          <p className="text-sm text-neutral-700">
            {labels.counterparty}:{" "}
            {ledgerHref ? (
              <Link href={ledgerHref} className="font-medium text-neutral-950 no-underline hover:underline">
                {detail.counterpartyName ?? labels.openLedger}
              </Link>
            ) : (
              <span className="font-medium text-neutral-950">{detail.counterpartyName ?? labels.notSpecified}</span>
            )}
          </p>
          <p className="text-sm text-neutral-700 md:col-span-2">{labels.note}: <span className="font-medium text-neutral-950">{detail.note ?? labels.notSpecified}</span></p>
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
