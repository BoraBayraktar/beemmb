"use client";

import Link from "next/link";

import { Input } from "@/components/ui/input";
import type { AdminFinanceDueKpi } from "@/modules/finance/contracts/finance-due.contract";
import type { AdminSupplierPayableSummary } from "@/modules/finance/contracts/payables.contract";

type Labels = {
  title: string;
  description: string;
  search: string;
  noResults: string;
  totalAmount: string;
  documentCount: string;
  draftCount: string;
  lastIssueDate: string;
  viewDetail: string;
  notSpecified: string;
  overdueAmountKpi: string;
  dueWithinDaysKpi: string;
  nearestDueDateKpi: string;
  overdueFilter: string;
  allOpenFilter: string;
  dueStatusOverdue: string;
  dueStatusDueInDays: string;
  dueStatusDueLater: string;
  dueStatusOverdueDays: string;
  dueStatusDueInDaysHint: string;
  dueStatusDueLaterHint: string;
  nearestDueDate: string;
  overdueAmount: string;
};

type Props = {
  locale: string;
  items: AdminSupplierPayableSummary[];
  dueKpi: AdminFinanceDueKpi;
  initialSearch: string;
  overdueOnly: boolean;
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
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function buildFilterHref(locale: string, overdueOnly: boolean, search: string) {
  const params = new URLSearchParams();
  if (overdueOnly) {
    params.set("overdueOnly", "1");
  }
  if (search.trim()) {
    params.set("search", search.trim());
  }
  const query = params.toString();
  return query ? `/${locale}/admin/finance/payables?${query}` : `/${locale}/admin/finance/payables`;
}

function resolveDueHint(document: AdminSupplierPayableSummary["documents"][number], labels: Labels) {
  if (document.isOverdue) {
    return `${labels.dueStatusOverdue}: ${labels.dueStatusOverdueDays.replace("{days}", String(Math.abs(document.daysUntilDue)))}`;
  }

  if (document.daysUntilDue <= 7) {
    return `${labels.dueStatusDueInDays}: ${labels.dueStatusDueInDaysHint.replace("{days}", String(document.daysUntilDue))}`;
  }

  return `${labels.dueStatusDueLater}: ${labels.dueStatusDueLaterHint.replace("{days}", String(document.daysUntilDue))}`;
}

export function SupplierPayablesManager({
  locale,
  items,
  dueKpi,
  initialSearch,
  overdueOnly,
  labels,
}: Props) {
  const dueWithinLabel = labels.dueWithinDaysKpi.replace("{days}", String(dueKpi.dueWithinDaysThreshold));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-neutral-950">{labels.title}</h1>
          <p className="text-sm text-neutral-600">{labels.description}</p>
        </div>
        <form action={`/${locale}/admin/finance/payables`} className="mt-4 space-y-3">
          {overdueOnly ? <input type="hidden" name="overdueOnly" value="1" /> : null}
          <Input
            type="search"
            name="search"
            defaultValue={initialSearch}
            placeholder={labels.search}
          />
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildFilterHref(locale, false, initialSearch)}
            className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${!overdueOnly ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}
          >
            {labels.allOpenFilter}
          </Link>
          <Link
            href={buildFilterHref(locale, true, initialSearch)}
            className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${overdueOnly ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}
          >
            {labels.overdueFilter}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.overdueAmountKpi}</p>
          <p className="mt-3 text-2xl font-semibold text-rose-950">{formatMoney(dueKpi.overdueAmount, dueKpi.currency)}</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{dueWithinLabel}</p>
          <p className="mt-3 text-2xl font-semibold text-amber-950">{formatMoney(dueKpi.dueWithinDaysAmount, dueKpi.currency)}</p>
        </article>
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.nearestDueDateKpi}</p>
          <p className="mt-3 text-lg font-semibold text-neutral-950">
            {dueKpi.nearestDueDate ? formatDate(dueKpi.nearestDueDate) : labels.notSpecified}
          </p>
        </article>
      </section>

      <section className="grid gap-3">
        {items.length === 0 ? (
          <article className="rounded-3xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500 shadow-sm">
            {labels.noResults}
          </article>
        ) : items.map((item) => {
          const overdueDocument = item.documents.find((document) => document.isOverdue) ?? null;

          return (
            <article key={item.supplierKey} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-950">{item.supplierName}</h2>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-700 md:grid-cols-2 xl:grid-cols-4">
                    <p>{labels.totalAmount}: {item.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}</p>
                    <p>{labels.documentCount}: {item.documentCount}</p>
                    <p>{labels.draftCount}: {item.draftCount}</p>
                    <p>{labels.lastIssueDate}: {item.lastIssueDate ? formatDate(item.lastIssueDate) : labels.notSpecified}</p>
                    <p>{labels.nearestDueDate}: {item.nearestDueDate ? formatDate(item.nearestDueDate) : labels.notSpecified}</p>
                    <p>{labels.overdueAmount}: {formatMoney(item.overdueAmount, item.currency)}</p>
                    {overdueDocument ? (
                      <p className="text-rose-700">{resolveDueHint(overdueDocument, labels)}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/admin/finance/payables/${encodeURIComponent(item.supplierKey)}`}
                    className="inline-flex h-10 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700"
                  >
                    {labels.viewDetail}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
