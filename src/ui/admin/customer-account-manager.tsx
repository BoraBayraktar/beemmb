"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCustomerAccountItem } from "@/modules/customers/contracts/customer-account.contract";

type Labels = {
  title: string;
  description: string;
  createTitle: string;
  listTitle: string;
  search: string;
  filterStatus: string;
  filterAllStatuses: string;
  filterActive: string;
  filterPassive: string;
  sort: string;
  sortNameAsc: string;
  sortNameDesc: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  taxNumber: string;
  address: string;
  note: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
  status: string;
  create: string;
  save: string;
  edit: string;
  saving: string;
  cancel: string;
  empty: string;
  createFailed: string;
  operationFailed: string;
};

type Props = {
  items: AdminCustomerAccountItem[];
  labels: Labels;
};

type CustomerAccountForm = {
  slug: string;
  name: string;
  email: string;
  phone: string;
  taxNumber: string;
  address: string;
  note: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
  isActive: boolean;
};

const emptyForm: CustomerAccountForm = {
  slug: "",
  name: "",
  email: "",
  phone: "",
  taxNumber: "",
  address: "",
  note: "",
  defaultPaymentTermDays: "",
  creditLimit: "",
  isActive: true,
};

type DrawerMode = "create" | "edit";

export function CustomerAccountManager({ items, labels }: Props) {
  const [customerItems, setCustomerItems] = useState(items);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [sort, setSort] = useState<"name_asc" | "name_desc">("name_asc");
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerAccountForm>(emptyForm);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return [...customerItems]
      .filter((item) => {
        if (statusFilter === "active" && !item.isActive) {
          return false;
        }

        if (statusFilter === "passive" && item.isActive) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return item.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
          || item.slug.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
          || (item.email ?? "").toLocaleLowerCase("tr-TR").includes(normalizedQuery)
          || (item.phone ?? "").toLocaleLowerCase("tr-TR").includes(normalizedQuery)
          || (item.taxNumber ?? "").toLocaleLowerCase("tr-TR").includes(normalizedQuery);
      })
      .sort((left, right) => (
        sort === "name_desc"
          ? right.name.localeCompare(left.name, "tr")
          : left.name.localeCompare(right.name, "tr")
      ));
  }, [customerItems, query, sort, statusFilter]);

  function openCreateDrawer() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
    setDrawerMode("create");
  }

  function openEditDrawer(item: AdminCustomerAccountItem) {
    setError(null);
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      taxNumber: item.taxNumber ?? "",
      address: item.address ?? "",
      note: item.note ?? "",
      defaultPaymentTermDays: item.defaultPaymentTermDays != null ? String(item.defaultPaymentTermDays) : "",
      creditLimit: item.creditLimit != null ? String(item.creditLimit) : "",
      isActive: item.isActive,
    });
    setDrawerMode("edit");
  }

  function closeDrawer() {
    if (pending) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setError(null);
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/customer-accounts", { method: "GET" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.operationFailed);
    }

    const payload = (await response.json()) as { items: AdminCustomerAccountItem[] };
    setCustomerItems(payload.items);
  }

  async function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/customer-accounts/${editingId}` : "/api/admin/customer-accounts", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          defaultPaymentTermDays: form.defaultPaymentTermDays.trim() ? Number(form.defaultPaymentTermDays) : null,
          creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? (drawerMode === "edit" ? labels.operationFailed : labels.createFailed));
        return;
      }

      await refreshItems();
      setForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.operationFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.listTitle}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_220px_220px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "active" | "passive")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.filterStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filterAllStatuses}</SelectItem>
              <SelectItem value="active">{labels.filterActive}</SelectItem>
              <SelectItem value="passive">{labels.filterPassive}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as "name_asc" | "name_desc")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.sort} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">{labels.sortNameAsc}</SelectItem>
              <SelectItem value="name_desc">{labels.sortNameDesc}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_120px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.name}</span>
            <span>{labels.slug}</span>
            <span>{labels.email}</span>
            <span>{labels.phone}</span>
            <span>{labels.taxNumber}</span>
            <span>{labels.status}</span>
            <span className="text-right">{labels.edit}</span>
          </div>

          {filteredItems.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {filteredItems.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_120px] lg:items-start">
                  <div>
                    <h3 className="font-medium text-[color:var(--color-text)]">{item.name}</h3>
                    {item.address ? <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{item.address}</p> : null}
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.slug}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.email ?? "-"}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.phone ?? "-"}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.taxNumber ?? "-"}</p>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{item.isActive ? labels.filterActive : labels.filterPassive}</p>
                  <div className="flex justify-start lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => openEditDrawer(item)}>
                      {labels.edit}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{drawerMode === "edit" ? labels.edit : labels.createTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={pending}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitItem}>
              <div className="grid gap-2">
                <Label>{labels.slug}</Label>
                <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.name}</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.email}</Label>
                <Input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.phone}</Label>
                <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.taxNumber}</Label>
                <Input value={form.taxNumber} onChange={(event) => setForm((prev) => ({ ...prev, taxNumber: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.address}</Label>
                <Textarea value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.defaultPaymentTermDays}</Label>
                <Input type="number" min={0} max={365} value={form.defaultPaymentTermDays} onChange={(event) => setForm((prev) => ({ ...prev, defaultPaymentTermDays: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.creditLimit}</Label>
                <Input type="number" min={0} step="0.01" value={form.creditLimit} onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.note}</Label>
                <Textarea value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} rows={4} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.status}</Label>
                <Select value={form.isActive ? "active" : "passive"} onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value === "active" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{labels.filterActive}</SelectItem>
                    <SelectItem value="passive">{labels.filterPassive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={pending}>
                  {labels.cancel}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? labels.saving : drawerMode === "edit" ? labels.save : labels.create}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
