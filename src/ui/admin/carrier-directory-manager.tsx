"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminCarrierCompanyItem } from "@/modules/catalog/contracts/catalog-admin.contract";

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
  taxNumber: string;
  trackingUrlTemplate: string;
  trackingUrlTemplateHint: string;
  trendyolId: string;
  pazaramaId: string;
  hepsiburadaId: string;
  orderCount: string;
  create: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  loading: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
};

type Props = {
  items: AdminCarrierCompanyItem[];
  labels: Labels;
  canDelete: boolean;
};

type DrawerMode = "create" | "edit";

type CarrierForm = {
  slug: string;
  name: string;
  taxNumber: string;
  trackingUrlTemplate: string;
  externalCodeTrendyol: string;
  externalCodePazarama: string;
  externalCodeHepsiburada: string;
};

const emptyForm: CarrierForm = {
  slug: "",
  name: "",
  taxNumber: "",
  trackingUrlTemplate: "",
  externalCodeTrendyol: "",
  externalCodePazarama: "",
  externalCodeHepsiburada: "",
};

export function CarrierDirectoryManager({ items, labels, canDelete }: Props) {
  const [carrierItems, setCarrierItems] = useState(items);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [sort, setSort] = useState<"name_asc" | "name_desc">("name_asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CarrierForm>(emptyForm);
  const [editForm, setEditForm] = useState<CarrierForm>(emptyForm);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return carrierItems
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
          || item.slug.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
      })
      .sort((left, right) => (sort === "name_desc"
        ? right.name.localeCompare(left.name, "tr")
        : left.name.localeCompare(right.name, "tr")));
  }, [carrierItems, query, sort, statusFilter]);

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;

  function patchActiveField(field: keyof CarrierForm, value: string) {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({ ...prev, [field]: value }));
      return;
    }

    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreateDrawer() {
    setError(null);
    setEditingId(null);
    setCreateForm(emptyForm);
    setDrawerMode("create");
  }

  function openEditDrawer(item: AdminCarrierCompanyItem) {
    setError(null);
    setEditingId(item.id);
    setEditForm({
      slug: item.slug,
      name: item.name,
      taxNumber: item.taxNumber ?? "",
      trackingUrlTemplate: item.trackingUrlTemplate ?? "",
      externalCodeTrendyol: item.externalCodeTrendyol ? String(item.externalCodeTrendyol) : "",
      externalCodePazarama: item.externalCodePazarama ?? "",
      externalCodeHepsiburada: item.externalCodeHepsiburada ?? "",
    });
    setDrawerMode("edit");
  }

  function closeDrawer() {
    if (loading) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setError(null);
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/carriers", { method: "GET" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.opFailed);
    }

    const payload = (await response.json()) as { items: AdminCarrierCompanyItem[] };
    setCarrierItems(payload.items);
  }

  async function submitCarrier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = drawerMode === "edit" ? editForm : createForm;
    if (!form.slug.trim() || !form.name.trim()) {
      setError(labels.validationRequired);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/carriers/${editingId}` : "/api/admin/carriers", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          taxNumber: form.taxNumber.trim() || null,
          trackingUrlTemplate: form.trackingUrlTemplate.trim() || null,
          externalCodeTrendyol: form.externalCodeTrendyol.trim() ? Number(form.externalCodeTrendyol) : null,
          externalCodePazarama: form.externalCodePazarama.trim() || null,
          externalCodeHepsiburada: form.externalCodeHepsiburada.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      await refreshItems();
      setCreateForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCarrier(item: AdminCarrierCompanyItem) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/carriers/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      await refreshItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{labels.listTitle}</h2>
          <p className="mt-1 text-sm text-neutral-500">{labels.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_220px_220px]">
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

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="hidden grid-cols-[1fr_1fr_110px_110px_110px_120px_190px] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
            <span>{labels.name}</span>
            <span>{labels.slug}</span>
            <span>{labels.trendyolId}</span>
            <span>{labels.pazaramaId}</span>
            <span>{labels.hepsiburadaId}</span>
            <span>{labels.orderCount}</span>
            <span className="text-right">İşlem</span>
          </div>

          {filteredItems.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {filteredItems.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_110px_110px_110px_120px_190px] lg:items-center">
                  <div>
                    <h3 className="font-medium text-neutral-950">{item.name}</h3>
                    {!item.isActive ? (
                      <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                        {labels.filterPassive}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-neutral-500">{item.slug}</p>
                  <p className="text-sm text-neutral-500">{item.externalCodeTrendyol ?? "-"}</p>
                  <p className="text-sm text-neutral-500">{item.externalCodePazarama ?? "-"}</p>
                  <p className="text-sm text-neutral-500">{item.externalCodeHepsiburada ?? "-"}</p>
                  <p className="text-sm font-semibold text-neutral-950">{item.orderCount}</p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => openEditDrawer(item)}>{labels.edit}</Button>
                    {canDelete ? (
                      <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={() => deleteCarrier(item)}>{labels.delete}</Button>
                    ) : null}
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
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitCarrier}>
              <div className="grid gap-2">
                <Label>{labels.slug}</Label>
                <Input value={activeForm.slug} onChange={(event) => patchActiveField("slug", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.name}</Label>
                <Input value={activeForm.name} onChange={(event) => patchActiveField("name", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.taxNumber}</Label>
                <Input value={activeForm.taxNumber} onChange={(event) => patchActiveField("taxNumber", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.trackingUrlTemplate}</Label>
                <Input value={activeForm.trackingUrlTemplate} onChange={(event) => patchActiveField("trackingUrlTemplate", event.target.value)} placeholder="https://kargo.example.com/takip?kod={trackingNumber}" />
                <p className="text-xs text-neutral-500">{labels.trackingUrlTemplateHint}</p>
              </div>
              <div className="grid gap-2">
                <Label>{labels.trendyolId}</Label>
                <Input type="number" min={1} value={activeForm.externalCodeTrendyol} onChange={(event) => patchActiveField("externalCodeTrendyol", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.pazaramaId}</Label>
                <Input value={activeForm.externalCodePazarama} onChange={(event) => patchActiveField("externalCodePazarama", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.hepsiburadaId}</Label>
                <Input value={activeForm.externalCodeHepsiburada} onChange={(event) => patchActiveField("externalCodeHepsiburada", event.target.value)} />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>
                  {labels.cancel}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? labels.loading : activeSubmit}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
