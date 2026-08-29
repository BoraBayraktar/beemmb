"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorToast } from "@/components/ui/toast";
import type {
  AdminBackofficeUserOption,
  AdminExpenseApproverSettingItem,
  AdminExpenseCategoryItem,
} from "@/modules/expense-reports/contracts/expense-settings.contract";

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

export function ExpenseSettingsManager({
  approver,
  candidates,
  categories,
}: {
  approver: AdminExpenseApproverSettingItem | null;
  candidates: AdminBackofficeUserOption[];
  categories: AdminExpenseCategoryItem[];
}) {
  const [approverUserId, setApproverUserId] = useState(approver?.approverUserId ?? "");
  const [notifyEmail, setNotifyEmail] = useState(approver?.notifyEmail ?? "");
  const [approverPending, setApproverPending] = useState(false);
  const [approverSaved, setApproverSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryList, setCategoryList] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryPending, setCategoryPending] = useState(false);

  async function saveApprover() {
    setApproverPending(true);
    setApproverSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/admin/expense-reports/settings/approver", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverUserId, notifyEmail: notifyEmail || null }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Onaycı kaydedilemedi."));
        return;
      }
      setApproverSaved(true);
    } finally {
      setApproverPending(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;

    setCategoryPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/expense-reports/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, sortOrder: categoryList.length }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Kategori eklenemedi."));
        return;
      }
      const payload = await response.json();
      setCategoryList((current) => [...current, payload.item]);
      setNewCategoryName("");
    } finally {
      setCategoryPending(false);
    }
  }

  async function toggleCategory(category: AdminExpenseCategoryItem) {
    setCategoryPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/settings/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, isActive: !category.isActive, sortOrder: category.sortOrder }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Kategori güncellenemedi."));
        return;
      }
      const payload = await response.json();
      setCategoryList((current) => current.map((item) => (item.id === category.id ? payload.item : item)));
    } finally {
      setCategoryPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Onaycı</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Masraf bildirimleri onaya gönderildiğinde bu kişiye bildirim gider.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Onaycı</Label>
            <Select value={approverUserId} onValueChange={setApproverUserId}>
              <SelectTrigger><SelectValue placeholder="Onaycı seçin" /></SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bildirim e-postası (opsiyonel)</Label>
            <Input value={notifyEmail} onChange={(event) => setNotifyEmail(event.target.value)} placeholder="onaycının e-postası farklıysa" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={() => void saveApprover()} disabled={approverPending || !approverUserId}>Onaycıyı Kaydet</Button>
          {approverSaved ? <span className="text-sm text-emerald-600">Kaydedildi.</span> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Harcama Kategorileri</h2>

        <div className="mt-4 space-y-2">
          {categoryList.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[color:var(--color-text)]">{category.name}</span>
                {!category.isActive ? <Badge className="border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)]">Pasif</Badge> : null}
              </div>
              <Button type="button" variant="outline" disabled={categoryPending} onClick={() => void toggleCategory(category)}>
                {category.isActive ? "Pasifleştir" : "Aktifleştir"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Yeni kategori adı" />
          <Button type="button" onClick={() => void addCategory()} disabled={categoryPending || !newCategoryName.trim()}>Ekle</Button>
        </div>
      </section>
    </div>
  );
}
