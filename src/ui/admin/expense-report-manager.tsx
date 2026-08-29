"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorToast } from "@/components/ui/toast";
import type {
  AdminExpenseReportDetail,
  AdminExpenseReportListItem,
  AdminExpenseReportListResult,
  AdminExpenseReportStatus,
} from "@/modules/expense-reports/contracts/expense-report.contract";
import type { AdminExpenseCategoryItem } from "@/modules/expense-reports/contracts/expense-settings.contract";
import type { ExpenseOcrExtractionResult } from "@/modules/expense-reports/contracts/expense-ocr.contract";

export type ExpenseReportsCopy = {
  title: string;
  description: string;
  empty: string;
  emptyCta: string;
  create: string;
  statusDraft: string;
  statusSubmitted: string;
  statusApproved: string;
  statusRejected: string;
  total: string;
  itemCount: string;
  addItem: string;
  submit: string;
  submitConfirm: string;
  discardDraft: string;
  dateLabel: string;
  receiptNoLabel: string;
  amountLabel: string;
  currencyLabel: string;
  vendorLabel: string;
  categoryLabel: string;
  descriptionLabel: string;
  photoCapture: string;
  photoUploading: string;
  ocrPrefilled: string;
  ocrFailedManualEntry: string;
  ocrSkipped: string;
  ocrConfidenceLabel: string;
  itemRemove: string;
};

function statusLabel(status: AdminExpenseReportStatus, copy: ExpenseReportsCopy) {
  if (status === "DRAFT") return copy.statusDraft;
  if (status === "SUBMITTED") return copy.statusSubmitted;
  if (status === "APPROVED") return copy.statusApproved;
  return copy.statusRejected;
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

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

const emptyItemForm = {
  categoryId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  receiptNo: "",
  amount: "",
  vendorName: "",
  description: "",
};

export function ExpenseReportManager({
  result,
  categories,
  copy,
}: {
  locale: string;
  result: AdminExpenseReportListResult;
  categories: AdminExpenseCategoryItem[];
  copy: ExpenseReportsCopy;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState(result.items);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [detail, setDetail] = useState<AdminExpenseReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [receipt, setReceipt] = useState<{ objectKey: string; url: string; contentType: string; size: number } | null>(null);
  const [ocrResult, setOcrResult] = useState<ExpenseOcrExtractionResult | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  function resetItemForm() {
    setItemForm(emptyItemForm);
    setReceipt(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function refreshList() {
    const response = await fetch("/api/admin/expense-reports?pageSize=50");
    if (response.ok) {
      const payload = await response.json();
      setItems(payload.items ?? []);
    }
  }

  async function createDraftAndOpen() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/expense-reports", { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf bildirimi oluşturulamadı."));
        return;
      }
      const payload = await response.json();
      await refreshList();
      setDetail(payload.item);
      resetItemForm();
    } catch {
      setError("Masraf bildirimi oluşturulamadı.");
    } finally {
      setPending(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    resetItemForm();
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

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPhotoUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/expense-reports/receipt-scan", { method: "POST", body: formData });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Görsel yüklenemedi."));
        return;
      }
      const payload = await response.json();
      setReceipt(payload.receipt);
      setOcrResult(payload.ocr);

      if (payload.ocr?.status === "COMPLETED" && payload.ocr.data) {
        setItemForm((current) => ({
          ...current,
          expenseDate: payload.ocr.data.date ? payload.ocr.data.date.slice(0, 10) : current.expenseDate,
          receiptNo: payload.ocr.data.receiptNo ?? current.receiptNo,
          amount: payload.ocr.data.amount !== null ? String(payload.ocr.data.amount) : current.amount,
          vendorName: payload.ocr.data.vendorName ?? current.vendorName,
        }));
      }
    } catch {
      setError("Görsel yüklenemedi.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function addItem() {
    if (!detail) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: itemForm.categoryId,
          expenseDate: new Date(itemForm.expenseDate).toISOString(),
          receiptNo: itemForm.receiptNo || null,
          amount: Number(itemForm.amount) || 0,
          vendorName: itemForm.vendorName,
          description: itemForm.description || null,
          receiptObjectKey: receipt?.objectKey ?? null,
          receiptUrl: receipt?.url ?? null,
          receiptContentType: receipt?.contentType ?? null,
          receiptSize: receipt?.size ?? null,
          ocrStatus: ocrResult?.status ?? "SKIPPED",
          ocrRawResult: ocrResult?.raw ?? null,
          ocrConfidence: ocrResult?.confidence ?? null,
        }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Harcama kalemi eklenemedi."));
        return;
      }

      const payload = await response.json();
      setDetail(payload.item);
      resetItemForm();
      await refreshList();
    } catch {
      setError("Harcama kalemi eklenemedi.");
    } finally {
      setPending(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!detail) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/items/${itemId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Harcama kalemi silinemedi."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
      await refreshList();
    } finally {
      setPending(false);
    }
  }

  async function submitReport() {
    if (!detail) return;
    if (!window.confirm(copy.submitConfirm)) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/submit`, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf bildirimi gönderilemedi."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function discardDraft() {
    if (!detail) return;
    if (!window.confirm("Bu taslağı silmek istediğinize emin misiniz?")) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Taslak silinemedi."));
        return;
      }
      setDetail(null);
      await refreshList();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h1>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{copy.description}</p>
          </div>
          <Button type="button" onClick={() => void createDraftAndOpen()} disabled={pending}>{copy.create}</Button>
        </div>
      </section>

      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-[color:var(--color-text-muted)]">{copy.empty}</p>
            <Button type="button" onClick={() => void createDraftAndOpen()}>{copy.emptyCta}</Button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">{copy.itemCount}</th>
                    <th className="px-4 py-3">{copy.total}</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: AdminExpenseReportListItem) => (
                    <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.reportNumber}</td>
                      <td className="px-4 py-3"><Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status, copy)}</Badge></td>
                      <td className="px-4 py-3">{item.itemCount}</td>
                      <td className="px-4 py-3">{formatCurrency(item.totalAmount, item.currency)}</td>
                      <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="outline" onClick={() => void openDetail(item.id)}>Detay</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {items.map((item: AdminExpenseReportListItem) => (
                <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[color:var(--color-text)]">{item.reportNumber}</span>
                    <Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status, copy)}</Badge>
                  </div>
                  <p className="mt-1 text-[color:var(--color-text-muted)]">{copy.itemCount}: {item.itemCount}</p>
                  <p className="mt-1 font-medium text-[color:var(--color-text)]">{formatCurrency(item.totalAmount, item.currency)}</p>
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
                  <Badge className={statusBadgeClass(detail.status)}>{statusLabel(detail.status, copy)}</Badge>
                  <span className="font-medium text-[color:var(--color-text)]">{formatCurrency(detail.totalAmount, detail.currency)}</span>
                </div>

                <div>
                  <h3 className="font-medium text-[color:var(--color-text)]">Kalemler</h3>
                  <div className="mt-2 space-y-1">
                    {detail.items.length === 0 ? (
                      <p className="text-xs text-[color:var(--color-text-muted)]">Henüz kalem eklenmedi.</p>
                    ) : (
                      detail.items.map((line) => (
                        <div key={line.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                          <div>
                            <p className="font-medium text-[color:var(--color-text)]">{line.vendorName}</p>
                            <p className="text-xs text-[color:var(--color-text-muted)]">{line.categoryName} • {formatDate(line.expenseDate)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(line.amount, line.currency)}</span>
                            {detail.status === "DRAFT" ? (
                              <Button type="button" variant="ghost" onClick={() => void removeItem(line.id)} disabled={pending}>{copy.itemRemove}</Button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {detail.status === "DRAFT" ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-[color:var(--color-border)] p-4">
                    <h3 className="font-medium text-[color:var(--color-text)]">{copy.addItem}</h3>

                    <div>
                      <Label>{copy.photoCapture}</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        capture="environment"
                        onChange={(event) => void handlePhotoChange(event)}
                        className="mt-1 block w-full text-sm"
                      />
                      {photoUploading ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{copy.photoUploading}</p> : null}
                      {ocrResult?.status === "COMPLETED" ? <p className="mt-1 text-xs text-emerald-600">{copy.ocrPrefilled}</p> : null}
                      {ocrResult?.status === "FAILED" ? <p className="mt-1 text-xs text-amber-600">{copy.ocrFailedManualEntry}</p> : null}
                      {ocrResult?.status === "SKIPPED" ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{copy.ocrSkipped}</p> : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{copy.dateLabel}</Label>
                        <Input type="date" value={itemForm.expenseDate} onChange={(event) => setItemForm((c) => ({ ...c, expenseDate: event.target.value }))} />
                      </div>
                      <div>
                        <Label>{copy.receiptNoLabel}</Label>
                        <Input value={itemForm.receiptNo} onChange={(event) => setItemForm((c) => ({ ...c, receiptNo: event.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{copy.amountLabel}</Label>
                        <MoneyInput value={itemForm.amount} onValueChange={(value) => setItemForm((c) => ({ ...c, amount: value }))} currencySymbol={detail.currency === "TRY" ? "₺" : ""} />
                      </div>
                      <div>
                        <Label>{copy.categoryLabel}</Label>
                        <Select value={itemForm.categoryId} onValueChange={(value) => setItemForm((c) => ({ ...c, categoryId: value }))}>
                          <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>{copy.vendorLabel}</Label>
                      <Input value={itemForm.vendorName} onChange={(event) => setItemForm((c) => ({ ...c, vendorName: event.target.value }))} />
                    </div>

                    <div>
                      <Label>{copy.descriptionLabel}</Label>
                      <Textarea value={itemForm.description} onChange={(event) => setItemForm((c) => ({ ...c, description: event.target.value }))} rows={2} />
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      disabled={pending || !itemForm.categoryId || !itemForm.vendorName || !itemForm.amount}
                      onClick={() => void addItem()}
                    >
                      Ekle
                    </Button>
                  </div>
                ) : null}

                {detail.status === "DRAFT" ? (
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void submitReport()} disabled={pending || detail.items.length === 0}>{copy.submit}</Button>
                    <Button type="button" variant="outline" onClick={() => void discardDraft()} disabled={pending}>{copy.discardDraft}</Button>
                  </div>
                ) : null}

                {detail.decisionNote ? (
                  <p className="rounded-xl border border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-text-muted)]">{detail.decisionNote}</p>
                ) : null}
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
