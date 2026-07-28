"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  AdminNegotiableInstrumentDetail,
  AdminNegotiableInstrumentsResult,
} from "@/modules/finance/contracts/negotiable-instrument.contract";
import type { NegotiableInstrumentCopy } from "@/modules/finance/services/negotiable-instrument-copy.resolver";
import {
  formatNegotiableInstrumentDirection,
  formatNegotiableInstrumentStatus,
  formatNegotiableInstrumentType,
} from "@/modules/finance/services/negotiable-instrument-copy.resolver";

type AccountOption = { id: string; label: string };

type Props = {
  locale: string;
  mode: "list" | "detail";
  result?: AdminNegotiableInstrumentsResult;
  detail?: AdminNegotiableInstrumentDetail;
  accountOptions?: AccountOption[];
  initialSearch?: string;
  initialDirection?: string;
  initialStatus?: string;
  initialOverdueOnly?: boolean;
  copy: NegotiableInstrumentCopy;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function NegotiableInstrumentsManager({
  locale,
  mode,
  result,
  detail,
  accountOptions = [],
  initialSearch = "",
  initialDirection = "all",
  initialStatus = "all",
  initialOverdueOnly = false,
  copy,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [financialAccountId, setFinancialAccountId] = useState(detail?.financialAccountId ?? accountOptions[0]?.id ?? "");

  const [createForm, setCreateForm] = useState({
    instrumentNumber: "",
    instrumentType: "CHECK",
    direction: "RECEIVABLE",
    amount: "",
    dueDate: "",
    counterpartyName: "",
    note: "",
  });

  const listHref = `/${locale}/admin/finance/instruments`;

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (initialSearch) params.set("search", initialSearch);
    if (initialDirection !== "all") params.set("direction", initialDirection);
    if (initialStatus !== "all") params.set("status", initialStatus);
    if (initialOverdueOnly) params.set("overdueOnly", "1");
    return params.toString();
  }, [initialDirection, initialOverdueOnly, initialSearch, initialStatus]);

  async function submitCreate() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/finance/negotiable-instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentNumber: createForm.instrumentNumber,
          instrumentType: createForm.instrumentType,
          direction: createForm.direction,
          amount: Number(createForm.amount),
          dueDate: createForm.dueDate,
          counterpartyKind: "UNREGISTERED",
          counterpartyName: createForm.counterpartyName,
          note: createForm.note || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Kayıt oluşturulamadı.");
      }

      setShowCreate(false);
      router.push(`/${locale}/admin/finance/instruments/${payload.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kayıt oluşturulamadı.");
    } finally {
      setPending(false);
    }
  }

  async function applyLifecycle(action: "collect" | "pay" | "bounce" | "cancel") {
    if (!detail) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/finance/negotiable-instruments/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentId: detail.id,
          action,
          financialAccountId: action === "collect" || action === "pay" ? financialAccountId : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Durum güncellenemedi.");
      }

      router.refresh();
    } catch (lifecycleError) {
      setError(lifecycleError instanceof Error ? lifecycleError.message : "Durum güncellenemedi.");
    } finally {
      setPending(false);
    }
  }

  if (mode === "detail" && detail) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{copy.detailTitle}</h1>
            <p className="text-muted-foreground">{detail.instrumentNumber}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={listHref}>{copy.detailBack}</Link>
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{copy.fieldType}</p>
            <p>{formatNegotiableInstrumentType(detail.instrumentType, copy)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.fieldDirection}</p>
            <p>{formatNegotiableInstrumentDirection(detail.direction, copy)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.colStatus}</p>
            <p>{formatNegotiableInstrumentStatus(detail.status, copy)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.fieldAmount}</p>
            <p>{formatMoney(detail.amount, detail.currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.fieldDueDate}</p>
            <p>{formatDate(detail.dueDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.colCounterparty}</p>
            <p>{detail.counterpartyName ?? "—"}</p>
          </div>
          {detail.endorserName ? (
            <div>
              <p className="text-sm text-muted-foreground">{copy.fieldEndorser}</p>
              <p>{detail.endorserName}</p>
            </div>
          ) : null}
          {detail.note ? (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">{copy.fieldNote}</p>
              <p>{detail.note}</p>
            </div>
          ) : null}
          {detail.cashTransactionHref ? (
            <div className="md:col-span-2">
              <Link className="text-sm font-medium text-primary underline-offset-2 hover:underline" href={detail.cashTransactionHref}>
                {copy.openCashTransaction}
              </Link>
            </div>
          ) : null}
        </div>

        {detail.allowedActions.length > 0 ? (
          <div className="space-y-3 rounded-lg border p-4">
            {(detail.allowedActions.includes("collect") || detail.allowedActions.includes("pay")) && (
              <div className="max-w-sm space-y-2">
                <p className="text-sm font-medium">{copy.financialAccount}</p>
                <Select value={financialAccountId} onValueChange={setFinancialAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy.financialAccount} />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {detail.allowedActions.includes("collect") ? (
                <Button disabled={pending} onClick={() => applyLifecycle("collect")}>
                  {copy.lifecycleCollect}
                </Button>
              ) : null}
              {detail.allowedActions.includes("pay") ? (
                <Button disabled={pending} onClick={() => applyLifecycle("pay")}>
                  {copy.lifecyclePay}
                </Button>
              ) : null}
              {detail.allowedActions.includes("bounce") ? (
                <Button variant="destructive" disabled={pending} onClick={() => applyLifecycle("bounce")}>
                  {copy.lifecycleBounce}
                </Button>
              ) : null}
              {detail.allowedActions.includes("cancel") ? (
                <Button variant="outline" disabled={pending} onClick={() => applyLifecycle("cancel")}>
                  {copy.lifecycleCancel}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const summary = result?.summary;
  const items = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="text-muted-foreground">{copy.description}</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>{copy.createAction}</Button>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{copy.summaryPortfolio}</p>
            <p className="text-lg font-semibold">{summary.portfolioCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{copy.summaryOverdue}</p>
            <p className="text-lg font-semibold">{summary.overdueCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{copy.summaryReceivable}</p>
            <p className="text-lg font-semibold">{formatMoney(summary.receivablePortfolioAmount, summary.currency)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{copy.summaryPayable}</p>
            <p className="text-lg font-semibold">{formatMoney(summary.payablePortfolioAmount, summary.currency)}</p>
          </div>
        </div>
      ) : null}

      <form
        className="flex flex-wrap gap-3"
        action={listHref}
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(filterQuery ? `${listHref}?${filterQuery}` : listHref);
        }}
      >
        <Input
          name="search"
          placeholder={copy.search}
          defaultValue={initialSearch}
          className="max-w-xs"
          onChange={(event) => {
            const params = new URLSearchParams(window.location.search);
            if (event.target.value) params.set("search", event.target.value);
            else params.delete("search");
            router.push(params.toString() ? `${listHref}?${params.toString()}` : listHref);
          }}
        />
      </form>

      {showCreate ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium">{copy.createTitle}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={copy.fieldNumber}
              value={createForm.instrumentNumber}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, instrumentNumber: event.target.value }))}
            />
            <Select
              value={createForm.instrumentType}
              onValueChange={(value) => setCreateForm((prev) => ({ ...prev, instrumentType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECK">{copy.typeCheck}</SelectItem>
                <SelectItem value="PROMISSORY_NOTE">{copy.typePromissoryNote}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={createForm.direction}
              onValueChange={(value) => setCreateForm((prev) => ({ ...prev, direction: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEIVABLE">{copy.directionReceivable}</SelectItem>
                <SelectItem value="PAYABLE">{copy.directionPayable}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={copy.fieldAmount}
              value={createForm.amount}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <Input
              type="date"
              value={createForm.dueDate}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <Input
              placeholder={copy.fieldCounterpartyName}
              value={createForm.counterpartyName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, counterpartyName: event.target.value }))}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={pending} onClick={submitCreate}>
            {copy.createAction}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">{copy.colNumber}</th>
              <th className="px-3 py-2">{copy.colType}</th>
              <th className="px-3 py-2">{copy.colDirection}</th>
              <th className="px-3 py-2">{copy.colStatus}</th>
              <th className="px-3 py-2">{copy.colAmount}</th>
              <th className="px-3 py-2">{copy.colDueDate}</th>
              <th className="px-3 py-2">{copy.colCounterparty}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  {copy.emptyList}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link className="font-medium underline-offset-2 hover:underline" href={item.detailHref}>
                      {item.instrumentNumber}
                    </Link>
                    {item.isOverdue ? <span className="ml-2 text-xs text-destructive">{copy.overdueBadge}</span> : null}
                  </td>
                  <td className="px-3 py-2">{formatNegotiableInstrumentType(item.instrumentType, copy)}</td>
                  <td className="px-3 py-2">{formatNegotiableInstrumentDirection(item.direction, copy)}</td>
                  <td className="px-3 py-2">{formatNegotiableInstrumentStatus(item.status, copy)}</td>
                  <td className="px-3 py-2">{formatMoney(item.amount, item.currency)}</td>
                  <td className="px-3 py-2">{formatDate(item.dueDate)}</td>
                  <td className="px-3 py-2">{item.counterpartyName ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
