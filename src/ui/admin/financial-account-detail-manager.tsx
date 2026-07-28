"use client";

import Link from "next/link";

import { Input } from "@/components/ui/input";
import type { AdminFinancialAccountDetail } from "@/modules/finance/contracts/financial-accounts.contract";

type Labels = {
  back: string;
  title: string;
  description: string;
  accountType: string;
  cash: string;
  bank: string;
  openingBalance: string;
  currentBalance: string;
  transactionCount: string;
  note: string;
  totalIncoming: string;
  totalOutgoing: string;
  netCashFlow: string;
  availableBalance: string;
  movementTitle: string;
  filterDirection: string;
  filterFromDate: string;
  filterToDate: string;
  filterApply: string;
  filterSummaryTitle: string;
  filterSummaryRange: string;
  filterSummaryRecordCount: string;
  filterSummaryAllTime: string;
  filterSummaryDateSeparator: string;
  exportCsv: string;
  filterAllDirections: string;
  filterIncoming: string;
  filterOutgoing: string;
  filterTransfer: string;
  movementDirection: string;
  movementSourceType: string;
  movementCategory: string;
  movementAmount: string;
  movementDate: string;
  movementCounterparty: string;
  movementNote: string;
  movementReference: string;
  notSpecified: string;
  empty: string;
  openReconciliation?: string;
};

type Props = {
  locale: string;
  detail: AdminFinancialAccountDetail;
  accountId: string;
  initialDirection: "all" | "IN" | "OUT" | "TRANSFER";
  initialFromDate: string;
  initialToDate: string;
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDirection(value: AdminFinancialAccountDetail["transactions"][number]["direction"], labels: Labels) {
  if (value === "IN") {
    return labels.totalIncoming;
  }

  if (value === "OUT") {
    return labels.totalOutgoing;
  }

  return "Transfer";
}

function formatDirectionFilter(value: "all" | "IN" | "OUT" | "TRANSFER", labels: Labels) {
  if (value === "IN") {
    return labels.filterIncoming;
  }

  if (value === "OUT") {
    return labels.filterOutgoing;
  }

  if (value === "TRANSFER") {
    return labels.filterTransfer;
  }

  return labels.filterAllDirections;
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll("\"", "\"\"")}"`;
}

export function FinancialAccountDetailManager({ locale, detail, accountId, initialDirection, initialFromDate, initialToDate, labels }: Props) {
  const hasDateRange = initialFromDate || initialToDate;
  const dateRangeLabel = hasDateRange
    ? [initialFromDate ? formatShortDate(initialFromDate) : labels.notSpecified, initialToDate ? formatShortDate(initialToDate) : labels.notSpecified].join(
        ` ${labels.filterSummaryDateSeparator} `,
      )
    : labels.filterSummaryAllTime;

  function exportCsv() {
    const header = [
      labels.movementDate,
      labels.movementDirection,
      labels.movementSourceType,
      labels.movementCategory,
      labels.movementAmount,
      labels.movementCounterparty,
      labels.movementReference,
      labels.movementNote,
    ];
    const rows = detail.transactions.map((item) => [
      item.transactionAt,
      formatDirection(item.direction, labels),
      item.sourceType,
      item.category ?? labels.notSpecified,
      item.amount,
      item.counterpartyName ?? labels.notSpecified,
      item.sourceReferenceId ?? labels.notSpecified,
      item.note ?? item.title,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = [initialDirection, initialFromDate || "all", initialToDate || "all"].join("-");

    link.href = url;
    link.download = `${detail.account.name}-${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <Link href={`/${locale}/admin/finance/bank-cash`} className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline">
          {labels.back}
        </Link>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-neutral-500">{labels.title}</p>
          <h1 className="text-2xl font-semibold text-neutral-950">{detail.account.name}</h1>
          <p className="text-sm text-neutral-600">{labels.description}</p>
          {detail.account.type === "BANK" && labels.openReconciliation ? (
            <Link
              href={`/${locale}/admin/finance/bank-cash/${accountId}/reconciliation`}
              className="inline-flex text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
            >
              {labels.openReconciliation}
            </Link>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.accountType}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{detail.account.type === "CASH" ? labels.cash : labels.bank}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.openingBalance}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{formatMoney(detail.account.openingBalance, detail.account.currency)}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.currentBalance}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{formatMoney(detail.account.currentBalance, detail.account.currency)}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.transactionCount}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{detail.account.transactionCount}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.note}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{detail.account.note ?? labels.notSpecified}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.availableBalance}</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-950">{formatMoney(detail.summary.availableBalance, detail.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.totalIncoming}</p>
          <p className="mt-3 text-2xl font-semibold text-blue-950">{formatMoney(detail.summary.totalIncoming, detail.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.totalOutgoing}</p>
          <p className="mt-3 text-2xl font-semibold text-rose-950">{formatMoney(detail.summary.totalOutgoing, detail.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.netCashFlow}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">{formatMoney(detail.summary.netCashFlow, detail.summary.currency)}</p>
        </article>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">{labels.movementTitle}</h2>
        <form action={`/${locale}/admin/finance/bank-cash/${accountId}`} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            name="direction"
            defaultValue={initialDirection}
            className="h-11 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-white px-4 text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/15"
          >
            <option value="all">{labels.filterAllDirections}</option>
            <option value="IN">{labels.filterIncoming}</option>
            <option value="OUT">{labels.filterOutgoing}</option>
            <option value="TRANSFER">{labels.filterTransfer}</option>
          </select>
          <Input type="date" name="fromDate" defaultValue={initialFromDate} aria-label={labels.filterFromDate} />
          <Input type="date" name="toDate" defaultValue={initialToDate} aria-label={labels.filterToDate} />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-neutral-950 px-4 text-sm font-medium text-white"
          >
            {labels.filterApply}
          </button>
        </form>
        <div className="mt-3 flex justify-start">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-neutral-300 px-4 text-sm font-medium text-neutral-700"
          >
            {labels.exportCsv}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.filterSummaryTitle}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{formatDirectionFilter(initialDirection, labels)}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.filterSummaryRange}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{dateRangeLabel}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.filterSummaryRecordCount}</p>
            <p className="mt-2 text-sm font-semibold text-neutral-950">{detail.transactions.length}</p>
          </article>
        </div>
        <div className="mt-4 space-y-3">
          {detail.transactions.length === 0 ? (
            <article className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
              {labels.empty}
            </article>
          ) : detail.transactions.map((item) => (
            <article key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid gap-2 text-sm text-neutral-700 md:grid-cols-2 xl:grid-cols-4">
                <p>{labels.movementDirection}: {formatDirection(item.direction, labels)}</p>
                <p>{labels.movementSourceType}: {item.sourceType}</p>
                <p>{labels.movementCategory}: {item.category ?? labels.notSpecified}</p>
                <p>{labels.movementAmount}: {formatMoney(item.amount, item.currency)}</p>
                <p>{labels.movementDate}: {formatDate(item.transactionAt)}</p>
                <p>{labels.movementCounterparty}: {item.counterpartyName ?? labels.notSpecified}</p>
                <p>{labels.movementReference}: {item.sourceReferenceId ?? labels.notSpecified}</p>
                <p>{labels.movementNote}: {item.note ?? item.title}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
