"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminCashTransactionCategory,
  AdminCashTransactionDirection,
  AdminCashTransactionSourceType,
  AdminCashTransactionsResult,
} from "@/modules/finance/contracts/cash-transactions.contract";
import type { AdminFinanceCounterpartyOption } from "@/modules/finance/contracts/counterparty-lookup.contract";

type AccountOption = {
  id: string;
  label: string;
};

type Labels = {
  title: string;
  description: string;
  search: string;
  allDirections: string;
  incoming: string;
  outgoing: string;
  transfer: string;
  refund: string;
  manual: string;
  collection: string;
  payment: string;
  order: string;
  document: string;
  totalIncoming: string;
  totalOutgoing: string;
  netAmount: string;
  transactionCount: string;
  account: string;
  targetAccount: string;
  amount: string;
  transactionDate: string;
  titleField: string;
  sourceType: string;
  category: string;
  note: string;
  counterparty: string;
  counterpartyUnregistered: string;
  counterpartySearch: string;
  counterpartySelectPlaceholder: string;
  counterpartyEmpty: string;
  openLedger: string;
  createTitle: string;
  createAction: string;
  creatingAction: string;
  createSuccess: string;
  createFailed: string;
  empty: string;
  cancel: string;
};

type Props = {
  locale: string;
  result: AdminCashTransactionsResult;
  accountOptions: AccountOption[];
  initialSearch: string;
  initialDirection: "all" | AdminCashTransactionDirection;
  initialAccountId: string;
  labels: Labels;
};

const ALL_ACCOUNTS = "__all_accounts__";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildFilterHref(locale: string, direction: "all" | AdminCashTransactionDirection, search: string, accountId: string) {
  const params = new URLSearchParams();
  if (direction !== "all") {
    params.set("direction", direction);
  }
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (accountId) {
    params.set("accountId", accountId);
  }
  const query = params.toString();
  return query ? `/${locale}/admin/finance/transactions?${query}` : `/${locale}/admin/finance/transactions`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSourceTypeLabel(sourceType: AdminCashTransactionSourceType, labels: Labels) {
  switch (sourceType) {
    case "REFUND":
      return labels.refund;
    case "TRANSFER":
      return labels.transfer;
    case "COLLECTION":
      return labels.collection;
    case "PAYMENT":
      return labels.payment;
    case "ORDER":
      return labels.order;
    case "DOCUMENT":
      return labels.document;
    default:
      return labels.manual;
  }
}

function getDirectionClassName(direction: AdminCashTransactionDirection) {
  if (direction === "IN") {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }

  if (direction === "OUT") {
    return "border-rose-200 bg-rose-100 text-rose-700";
  }

  return "border-blue-200 bg-blue-100 text-blue-700";
}

export function CashTransactionsManager({
  locale,
  result,
  accountOptions,
  initialSearch,
  initialDirection,
  initialAccountId,
  labels,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState(initialAccountId || ALL_ACCOUNTS);
  const [form, setForm] = useState({
    accountId: initialAccountId || accountOptions[0]?.id || "",
    targetAccountId: "",
    direction: "IN" as AdminCashTransactionDirection,
    sourceType: "MANUAL" as AdminCashTransactionSourceType,
    category: "GENERAL_INCOME" as AdminCashTransactionCategory,
    amount: "",
    title: "",
    note: "",
    cariId: "",
    counterpartyName: "",
    useUnregisteredCounterparty: false,
  });
  const [counterpartySearch, setCounterpartySearch] = useState("");
  const [counterpartyOptions, setCounterpartyOptions] = useState<AdminFinanceCounterpartyOption[]>([]);
  const [counterpartyLoading, setCounterpartyLoading] = useState(false);

  useEffect(() => {
    if (!drawerOpen || form.direction === "TRANSFER" || form.useUnregisteredCounterparty) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setCounterpartyLoading(true);
      try {
        const response = await fetch(`/api/admin/finance/counterparties?search=${encodeURIComponent(counterpartySearch)}`);
        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { items: AdminFinanceCounterpartyOption[] };
        setCounterpartyOptions(payload.items ?? []);
      } finally {
        setCounterpartyLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [counterpartySearch, drawerOpen, form.direction, form.useUnregisteredCounterparty]);

  function resetForm() {
    setForm((current) => ({
      ...current,
      accountId: initialAccountId || accountOptions[0]?.id || "",
      targetAccountId: "",
      direction: "IN",
      sourceType: "MANUAL",
      category: "GENERAL_INCOME",
      amount: "",
      title: "",
      note: "",
      cariId: "",
      counterpartyName: "",
      useUnregisteredCounterparty: false,
    }));
    setCounterpartySearch("");
    setCounterpartyOptions([]);
  }

  function openCreateDrawer() {
    setMessage(null);
    resetForm();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (isPending) {
      return;
    }

    setDrawerOpen(false);
  }

  function submitTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch("/api/admin/finance/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: form.accountId,
            targetAccountId: form.targetAccountId || undefined,
            direction: form.direction,
            sourceType: form.sourceType,
            category: form.category,
            amount: Number(form.amount || "0"),
            title: form.title,
            note: form.note.trim() || null,
            cariId: form.useUnregisteredCounterparty ? null : form.cariId || null,
            counterpartyName: form.useUnregisteredCounterparty ? form.counterpartyName.trim() || null : null,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? labels.createFailed);
        }

        resetForm();
        setMessage(labels.createSuccess);
        setDrawerOpen(false);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : labels.createFailed);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.title}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
        <Button type="button" onClick={openCreateDrawer}>
          {labels.createTitle}
        </Button>
      </div>

      <div className="p-5">
        <form action={`/${locale}/admin/finance/transactions`} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px_auto]">
          <Input type="search" name="search" defaultValue={initialSearch} placeholder={labels.search} />
          <input type="hidden" name="accountId" value={filterAccountId === ALL_ACCOUNTS ? "" : filterAccountId} />
          <Select value={filterAccountId} onValueChange={setFilterAccountId}>
            <SelectTrigger>
              <SelectValue placeholder={labels.account} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ACCOUNTS}>{labels.account}</SelectItem>
              {accountOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            {labels.search}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={buildFilterHref(locale, "all", initialSearch, initialAccountId)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialDirection === "all" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.allDirections}</Link>
          <Link href={buildFilterHref(locale, "IN", initialSearch, initialAccountId)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialDirection === "IN" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.incoming}</Link>
          <Link href={buildFilterHref(locale, "OUT", initialSearch, initialAccountId)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialDirection === "OUT" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.outgoing}</Link>
          <Link href={buildFilterHref(locale, "TRANSFER", initialSearch, initialAccountId)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialDirection === "TRANSFER" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.transfer}</Link>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text)] shadow-sm">{message}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.totalIncoming}</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-950">{formatMoney(result.summary.totalIncoming, result.summary.currency)}</p>
          </article>
          <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.totalOutgoing}</p>
            <p className="mt-3 text-2xl font-semibold text-rose-950">{formatMoney(result.summary.totalOutgoing, result.summary.currency)}</p>
          </article>
          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.netAmount}</p>
            <p className="mt-3 text-2xl font-semibold text-blue-950">{formatMoney(result.summary.netAmount, result.summary.currency)}</p>
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.transactionCount}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.transactionCount}</p>
          </article>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[120px_1.2fr_1fr_150px_170px_1fr_1fr] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.allDirections}</span>
            <span>{labels.titleField}</span>
            <span>{labels.account}</span>
            <span>{labels.amount}</span>
            <span>{labels.transactionDate}</span>
            <span>{labels.counterparty}</span>
            <span>{labels.note}</span>
          </div>
          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : result.items.map((item) => (
            <article key={item.id} className="grid gap-4 border-b border-[color:var(--color-border)] p-4 last:border-b-0 lg:grid-cols-[120px_1.2fr_1fr_150px_170px_1fr_1fr] lg:items-center">
              <div>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getDirectionClassName(item.direction)}`}>
                  {item.direction === "IN" ? labels.incoming : item.direction === "OUT" ? labels.outgoing : labels.transfer}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-[color:var(--color-text)]">
                  <Link href={`/${locale}/admin/finance/transactions/${item.id}`} className="text-[color:var(--color-text)] no-underline hover:underline">
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{getSourceTypeLabel(item.sourceType, labels)}</p>
              </div>
              <p className="text-sm text-[color:var(--color-text-muted)]">{item.accountName}</p>
              <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.amount, item.currency)}</p>
              <p className="text-sm text-[color:var(--color-text-muted)]">{formatDate(item.transactionAt)}</p>
              <div className="text-sm text-[color:var(--color-text-muted)]">
                {item.customerAccountSlug ? (
                  <Link href={`/${locale}/admin/finance/cari/${encodeURIComponent(item.customerAccountSlug)}`} className="text-[color:var(--color-text)] no-underline hover:text-[color:var(--color-text)]">
                    {item.counterpartyName ?? labels.openLedger}
                  </Link>
                ) : item.supplierSlug ? (
                  <Link href={`/${locale}/admin/finance/cari/${encodeURIComponent(item.supplierSlug)}`} className="text-[color:var(--color-text)] no-underline hover:text-[color:var(--color-text)]">
                    {item.counterpartyName ?? labels.openLedger}
                  </Link>
                ) : (
                  item.counterpartyName ?? "-"
                )}
              </div>
              <p className="text-sm text-[color:var(--color-text-muted)]">{item.note ?? "-"}</p>
            </article>
          ))}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{labels.createTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={isPending}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitTransaction}>
              {message ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p> : null}
              <div className="grid gap-2">
                <Label>{labels.account}</Label>
                <Select value={form.accountId} onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={labels.account} />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{labels.allDirections}</Label>
                <Select
                  value={form.direction}
                  onValueChange={(value) => {
                    const nextDirection = value as AdminCashTransactionDirection;
                    setForm((current) => ({
                      ...current,
                      direction: nextDirection,
                      sourceType: nextDirection === "TRANSFER" ? "TRANSFER" : nextDirection === "OUT" ? current.sourceType : "MANUAL",
                      category: nextDirection === "TRANSFER" ? "TRANSFER" : nextDirection === "IN" ? "GENERAL_INCOME" : current.sourceType === "REFUND" ? "REFUND" : "GENERAL_EXPENSE",
                      cariId: "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">{labels.incoming}</SelectItem>
                    <SelectItem value="OUT">{labels.outgoing}</SelectItem>
                    <SelectItem value="TRANSFER">{labels.transfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{labels.sourceType}</Label>
                <Select
                  value={form.sourceType}
                  onValueChange={(value) => {
                    const nextSourceType = value as AdminCashTransactionSourceType;
                    setForm((current) => ({
                      ...current,
                      sourceType: nextSourceType,
                      category: nextSourceType === "REFUND" ? "REFUND" : nextSourceType === "TRANSFER" ? "TRANSFER" : current.direction === "IN" ? "GENERAL_INCOME" : current.category === "REFUND" ? "GENERAL_EXPENSE" : current.category,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={labels.sourceType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">{labels.manual}</SelectItem>
                    <SelectItem value="REFUND">{labels.refund}</SelectItem>
                    <SelectItem value="TRANSFER">{labels.transfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.direction === "OUT" ? (
                <div className="grid gap-2">
                  <Label>{labels.category}</Label>
                  <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value as AdminCashTransactionCategory }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.category} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL_EXPENSE">{labels.category}</SelectItem>
                      <SelectItem value="MARKETPLACE_COMMISSION">Pazaryeri komisyonu</SelectItem>
                      <SelectItem value="SHIPPING_EXPENSE">Kargo gideri</SelectItem>
                      <SelectItem value="SERVICE_FEE">Hizmet bedeli</SelectItem>
                      <SelectItem value="REFUND">{labels.refund}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {form.direction === "TRANSFER" ? (
                <div className="grid gap-2">
                  <Label>{labels.targetAccount}</Label>
                  <Select value={form.targetAccountId} onValueChange={(value) => setForm((current) => ({ ...current, targetAccountId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.targetAccount} />
                    </SelectTrigger>
                    <SelectContent>
                      {accountOptions
                        .filter((option) => option.id !== form.accountId)
                        .map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label>{labels.amount}</Label>
                <MoneyInput value={form.amount} onValueChange={(value) => setForm((current) => ({ ...current, amount: value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.titleField}</Label>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.counterparty}</Label>
                {form.direction !== "TRANSFER" ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                      <Checkbox
                        checked={form.useUnregisteredCounterparty}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          setForm((current) => ({
                            ...current,
                            useUnregisteredCounterparty: isChecked,
                            cariId: "",
                            counterpartyName: isChecked ? current.counterpartyName : "",
                          }));
                        }}
                      />
                      {labels.counterpartyUnregistered}
                    </label>
                    {form.useUnregisteredCounterparty ? (
                      <Input value={form.counterpartyName} onChange={(event) => setForm((current) => ({ ...current, counterpartyName: event.target.value }))} placeholder={labels.counterpartyUnregistered} />
                    ) : (
                      <SearchableSelect
                        value={form.cariId}
                        onValueChange={(value) => setForm((current) => ({ ...current, cariId: value }))}
                        options={counterpartyOptions.map((option) => ({
                          value: option.id,
                          label: option.label,
                          description: option.slug,
                        }))}
                        placeholder={labels.counterpartySelectPlaceholder}
                        searchPlaceholder={labels.counterpartySearch}
                        emptyLabel={labels.counterpartyEmpty}
                        onSearchChange={setCounterpartySearch}
                        loading={counterpartyLoading}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--color-text-muted)]">{labels.transfer}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>{labels.note}</Label>
                <Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} rows={3} />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={isPending}>
                  {labels.cancel}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? labels.creatingAction : labels.createAction}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
