"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorToast } from "@/components/ui/toast";
import type { AdminExpenseReportDetail, AdminExpenseReportListResult } from "@/modules/expense-reports/contracts/expense-report.contract";

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function ExpenseApprovalsManager({
  result,
  emptyLabel,
  approveLabel,
  rejectLabel,
  rejectNoteLabel,
  rejectNoteRequiredLabel,
}: {
  locale: string;
  result: AdminExpenseReportListResult;
  emptyLabel: string;
  approveLabel: string;
  rejectLabel: string;
  rejectNoteLabel: string;
  rejectNoteRequiredLabel: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(result.items);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [detail, setDetail] = useState<AdminExpenseReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectNoteOpen, setRejectNoteOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  async function refreshList() {
    const response = await fetch("/api/admin/expense-reports/approvals?pageSize=50");
    if (response.ok) {
      const payload = await response.json();
      setItems(payload.items ?? []);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    setRejectNoteOpen(false);
    setRejectNote("");
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

  async function approve() {
    if (!detail) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/approve`, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Onaylama başarısız oldu."));
        return;
      }
      setDetail(null);
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function reject() {
    if (!detail) return;
    if (!rejectNote.trim()) {
      setError(rejectNoteRequiredLabel);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote: rejectNote }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Reddetme başarısız oldu."));
        return;
      }
      setDetail(null);
      setRejectNoteOpen(false);
      setRejectNote("");
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Personel</th>
                    <th className="px-4 py-3">Masraf</th>
                    <th className="px-4 py-3">Tutar</th>
                    <th className="px-4 py-3">Gönderilme</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.reportNumber}</td>
                      <td className="px-4 py-3">{item.employeeName}</td>
                      <td className="px-4 py-3">{item.itemCount}</td>
                      <td className="px-4 py-3">{formatCurrency(item.totalAmount, item.currency)}</td>
                      <td className="px-4 py-3">{formatDate(item.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="outline" onClick={() => void openDetail(item.id)}>Detay</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[color:var(--color-text)]">{item.reportNumber}</span>
                    <Badge>{item.employeeName}</Badge>
                  </div>
                  <p className="mt-1 font-medium text-[color:var(--color-text)]">{formatCurrency(item.totalAmount, item.currency)}</p>
                  <p className="mt-1 text-[color:var(--color-text-muted)]">Gönderilme: {formatDate(item.submittedAt)}</p>
                  <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void openDetail(item.id)}>Detay</Button>
                </article>
              ))}
            </div>
          </>
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
              <div className="mt-4 space-y-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{detail.employeeName}</Badge>
                  <span className="font-medium text-[color:var(--color-text)]">{formatCurrency(detail.totalAmount, detail.currency)}</span>
                </div>

                {detail.note ? <p className="text-[color:var(--color-text-muted)]">{detail.note}</p> : null}

                <div>
                  <h3 className="font-medium text-[color:var(--color-text)]">Masraflar</h3>
                  <div className="mt-2 space-y-1">
                    {detail.items.map((line) => (
                      <div key={line.id} className="rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-[color:var(--color-text)]">{line.vendorName}</p>
                          <span className="font-medium">{formatCurrency(line.amount, line.currency)}</span>
                        </div>
                        <p className="text-xs text-[color:var(--color-text-muted)]">{line.categoryName} • {formatDate(line.expenseDate)} • {line.receiptNo ?? "Fiş no yok"}</p>
                        {line.receiptUrl ? (
                          <a href={line.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[color:var(--color-brand)] underline">
                            Fiş görselini görüntüle
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {rejectNoteOpen ? (
                  <div className="space-y-2 rounded-2xl border border-dashed border-[color:var(--color-border)] p-4">
                    <Label>{rejectNoteLabel}</Label>
                    <Textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} rows={3} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => void reject()} disabled={pending}>{rejectLabel}</Button>
                      <Button type="button" variant="ghost" onClick={() => setRejectNoteOpen(false)}>Vazgeç</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void approve()} disabled={pending}>{approveLabel}</Button>
                    <Button type="button" variant="outline" onClick={() => setRejectNoteOpen(true)} disabled={pending}>{rejectLabel}</Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">Yükleniyor...</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
