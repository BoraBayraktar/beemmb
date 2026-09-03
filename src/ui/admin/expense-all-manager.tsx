"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorToast } from "@/components/ui/toast";
import type { AdminExpenseReportDetail, AdminExpenseReportListResult, AdminExpenseReportStatus } from "@/modules/expense-reports/contracts/expense-report.contract";

type FinancialAccountOption = {
  id: string;
  label: string;
};

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

function statusLabel(status: AdminExpenseReportStatus) {
  if (status === "DRAFT") return "Gönderilmedi";
  if (status === "SUBMITTED") return "Onay Bekliyor";
  if (status === "APPROVED") return "Onaylandı";
  return "Reddedildi";
}

function statusBadgeClass(status: AdminExpenseReportStatus) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (status === "SUBMITTED") return "border-sky-200 bg-sky-100 text-sky-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-amber-200 bg-amber-100 text-amber-700";
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function ExpenseAllManager({
  result,
  emptyLabel,
  financialAccountOptions,
}: {
  locale: string;
  result: AdminExpenseReportListResult;
  emptyLabel: string;
  financialAccountOptions: FinancialAccountOption[];
}) {
  const [items, setItems] = useState(result.items);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminExpenseReportStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminExpenseReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reimburseTarget, setReimburseTarget] = useState<AdminExpenseReportListResult["items"][number] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [reimburseSubmitting, setReimburseSubmitting] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        return item.reportNumber.toLocaleLowerCase("tr-TR").includes(query) || item.employeeName.toLocaleLowerCase("tr-TR").includes(query);
      }
      return true;
    });
  }, [items, statusFilter, search]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${id}`);
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf bildirimi yüklenemedi."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
    } finally {
      setDetailLoading(false);
    }
  }

  function openReimburseDialog(item: AdminExpenseReportListResult["items"][number]) {
    setError(null);
    setSelectedAccountId("");
    setReimburseTarget(item);
  }

  async function submitReimbursement() {
    if (!reimburseTarget || !selectedAccountId) {
      return;
    }
    setReimburseSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${reimburseTarget.id}/reimburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialAccountId: selectedAccountId }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf ödemesi kaydedilemedi."));
        return;
      }
      const payload = await response.json();
      setItems((current) => current.map((row) => (row.id === payload.item.id ? { ...row, reimbursedAt: payload.item.reimbursedAt } : row)));
      setReimburseTarget(null);
    } finally {
      setReimburseSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bildirim no veya personel ara" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="DRAFT">Gönderilmedi</SelectItem>
              <SelectItem value="SUBMITTED">Onay Bekliyor</SelectItem>
              <SelectItem value="APPROVED">Onaylandı</SelectItem>
              <SelectItem value="REJECTED">Reddedildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        {filteredItems.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Personel</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Onaycı</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.reportNumber}</td>
                    <td className="px-4 py-3">{item.employeeName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</Badge>
                        {item.status === "APPROVED" && item.reimbursedAt ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Ödendi</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.approverName ?? "-"}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalAmount, item.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {item.status === "APPROVED" && !item.reimbursedAt ? (
                          <Button type="button" onClick={() => openReimburseDialog(item)}>Masrafı Öde</Button>
                        ) : null}
                        <Button type="button" variant="outline" onClick={() => void openDetail(item.id)}>Detay</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{detail ? detail.reportNumber : "Yükleniyor..."}</h2>
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>Kapat</Button>
            </div>

            {detail ? (
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusBadgeClass(detail.status)}>{statusLabel(detail.status)}</Badge>
                  <Badge>{detail.employeeName}</Badge>
                  <span className="font-medium text-[color:var(--color-text)]">{formatCurrency(detail.totalAmount, detail.currency)}</span>
                </div>

                <p><span className="text-[color:var(--color-text-muted)]">Onaycı:</span> {detail.approverName ?? "-"}</p>
                <p><span className="text-[color:var(--color-text-muted)]">Gönderilme:</span> {formatDate(detail.submittedAt)}</p>
                <p><span className="text-[color:var(--color-text-muted)]">Karar:</span> {formatDate(detail.decidedAt)}</p>
                <p><span className="text-[color:var(--color-text-muted)]">Ödeme:</span> {formatDate(detail.reimbursedAt)}</p>
                {detail.decisionNote ? <p><span className="text-[color:var(--color-text-muted)]">Red gerekçesi:</span> {detail.decisionNote}</p> : null}

                <div>
                  <h3 className="font-medium text-[color:var(--color-text)]">Masraflar</h3>
                  <div className="mt-2 space-y-1">
                    {detail.items.map((line) => (
                      <div key={line.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                        <div>
                          <span>{line.vendorName} ({line.categoryName})</span>
                          {line.vatAmount !== null ? (
                            <p className="text-xs text-[color:var(--color-text-muted)]">
                              KDV {formatCurrency(line.vatAmount, line.currency)}{line.vatRate !== null ? ` (%${line.vatRate})` : ""}
                            </p>
                          ) : null}
                        </div>
                        <span className="font-medium">{formatCurrency(line.amount, line.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">Yükleniyor...</p>
            )}
          </div>
        </div>
      ) : null}

      {reimburseTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setReimburseTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Masrafı Öde</h2>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
              {reimburseTarget.reportNumber} • {reimburseTarget.employeeName} • {formatCurrency(reimburseTarget.totalAmount, reimburseTarget.currency)}
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-text)]">Ödemenin yapılacağı hesap</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger><SelectValue placeholder="Kasa/banka hesabı seçin" /></SelectTrigger>
                <SelectContent>
                  {financialAccountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReimburseTarget(null)}>Vazgeç</Button>
              <Button type="button" disabled={!selectedAccountId || reimburseSubmitting} onClick={() => void submitReimbursement()}>
                {reimburseSubmitting ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
