"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminSupplierItem } from "@/modules/catalog/contracts/catalog-admin.contract";

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
  filterProducts: string;
  filterAllProducts: string;
  filterWithProducts: string;
  filterWithoutProducts: string;
  sort: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortProductCountDesc: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  taxNumber: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
  productCount: string;
  create: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  loading: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
  validationDeleteBlocked: string;
  importCsv: string;
  exportCsv: string;
};

type Props = {
  items: AdminSupplierItem[];
  labels: Labels;
  canDelete: boolean;
};

type DrawerMode = "create" | "edit";

type SupplierForm = {
  slug: string;
  name: string;
  email: string;
  phone: string;
  taxNumber: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
};

const emptyForm: SupplierForm = {
  slug: "",
  name: "",
  email: "",
  phone: "",
  taxNumber: "",
  defaultPaymentTermDays: "",
  creditLimit: "",
};

export function SupplierDirectoryManager({ items, labels, canDelete }: Props) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [supplierItems, setSupplierItems] = useState(items);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [productFilter, setProductFilter] = useState<"all" | "with_products" | "without_products">("all");
  const [sort, setSort] = useState<"name_asc" | "name_desc" | "product_count_desc">("name_asc");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SupplierForm>(emptyForm);
  const [editForm, setEditForm] = useState<SupplierForm>(emptyForm);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return supplierItems
      .filter((item) => {
        if (statusFilter === "active" && !item.isActive) {
          return false;
        }

        if (statusFilter === "passive" && item.isActive) {
          return false;
        }

        if (productFilter === "with_products" && item.productCount <= 0) {
          return false;
        }

        if (productFilter === "without_products" && item.productCount > 0) {
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
      .sort((left, right) => {
        if (sort === "name_desc") {
          return right.name.localeCompare(left.name, "tr");
        }

        if (sort === "product_count_desc") {
          return right.productCount - left.productCount || left.name.localeCompare(right.name, "tr");
        }

        return left.name.localeCompare(right.name, "tr");
      });
  }, [productFilter, query, sort, statusFilter, supplierItems]);

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;

  function patchActiveField(field: keyof SupplierForm, value: string) {
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

  function openEditDrawer(item: AdminSupplierItem) {
    setError(null);
    setEditingId(item.id);
    setEditForm({
      slug: item.slug,
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      taxNumber: item.taxNumber ?? "",
      defaultPaymentTermDays: item.defaultPaymentTermDays != null ? String(item.defaultPaymentTermDays) : "",
      creditLimit: item.creditLimit != null ? String(item.creditLimit) : "",
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
    const response = await fetch("/api/admin/suppliers", { method: "GET" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.opFailed);
    }

    const payload = (await response.json()) as { items: AdminSupplierItem[] };
    setSupplierItems(payload.items);
  }

  async function submitSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = drawerMode === "edit" ? editForm : createForm;
    if (!form.slug.trim() || !form.name.trim()) {
      setError(labels.validationRequired);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/suppliers/${editingId}` : "/api/admin/suppliers", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          taxNumber: form.taxNumber.trim() || null,
          defaultPaymentTermDays: form.defaultPaymentTermDays.trim() ? Number(form.defaultPaymentTermDays) : null,
          creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : null,
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

  async function deleteSupplier(item: AdminSupplierItem) {
    if (item.productCount > 0) {
      setError(labels.validationDeleteBlocked);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/suppliers/${item.id}`, {
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

  function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === "\"") {
        if (inQuotes && line[index + 1] === "\"") {
          current += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current);
    return values.map((value) => value.trim());
  }

  function toCsvValue(value: string | number | boolean) {
    const normalized = String(value);
    if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
      return `"${normalized.replaceAll("\"", "\"\"")}"`;
    }
    return normalized;
  }

  function exportSuppliers() {
    const header = ["name", "slug", "email", "phone", "taxNumber", "isActive", "productCount"];
    const rows = filteredItems.map((item) => [
      toCsvValue(item.name),
      toCsvValue(item.slug),
      toCsvValue(item.email ?? ""),
      toCsvValue(item.phone ?? ""),
      toCsvValue(item.taxNumber ?? ""),
      toCsvValue(item.isActive),
      toCsvValue(item.productCount),
    ]);

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suppliers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSuppliers(file: File | null) {
    if (!file) {
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        setError("CSV dosyasinda aktarilacak satir bulunamadi.");
        return;
      }

      const headers = parseCsvLine(lines[0]).map((value) => value.toLocaleLowerCase("tr-TR"));

      for (const line of lines.slice(1)) {
        const columns = parseCsvLine(line);
        const row = Object.fromEntries(headers.map((key, index) => [key, columns[index] ?? ""])) as Record<string, string>;

        if (!row.name?.trim() || !row.slug?.trim()) {
          continue;
        }

        const response = await fetch("/api/admin/suppliers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: row.name.trim(),
            slug: row.slug.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            taxNumber: row.taxnumber?.trim() || null,
            isActive: row.isactive?.trim() ? row.isactive.trim().toLocaleLowerCase("tr-TR") !== "false" : true,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? labels.opFailed);
          return;
        }
      }

      await refreshItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
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
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void importSuppliers(event.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" disabled={loading || importing} onClick={() => importFileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {labels.importCsv}
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={exportSuppliers}>
            <Download className="h-4 w-4" />
            {labels.exportCsv}
          </Button>
          <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_220px_220px_220px]">
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
          <Select value={productFilter} onValueChange={(value) => setProductFilter(value as "all" | "with_products" | "without_products")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.filterProducts} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filterAllProducts}</SelectItem>
              <SelectItem value="with_products">{labels.filterWithProducts}</SelectItem>
              <SelectItem value="without_products">{labels.filterWithoutProducts}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as "name_asc" | "name_desc" | "product_count_desc")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.sort} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">{labels.sortNameAsc}</SelectItem>
              <SelectItem value="name_desc">{labels.sortNameDesc}</SelectItem>
              <SelectItem value="product_count_desc">{labels.sortProductCountDesc}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_190px] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
            <span>{labels.name}</span>
            <span>{labels.slug}</span>
            <span>{labels.email}</span>
            <span>{labels.phone}</span>
            <span>{labels.taxNumber}</span>
            <span>{labels.productCount}</span>
            <span className="text-right">İşlem</span>
          </div>

          {filteredItems.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {filteredItems.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_190px] lg:items-center">
                  <div><h3 className="font-medium text-neutral-950">{item.name}</h3></div>
                  <p className="text-sm text-neutral-500">{item.slug}</p>
                  <p className="text-sm text-neutral-500">{item.email ?? "-"}</p>
                  <p className="text-sm text-neutral-500">{item.phone ?? "-"}</p>
                  <p className="text-sm text-neutral-500">{item.taxNumber ?? "-"}</p>
                  <p className="text-sm font-semibold text-neutral-950">{item.productCount}</p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => openEditDrawer(item)}>{labels.edit}</Button>
                    {canDelete ? (
                      <Button type="button" size="sm" variant="destructive" disabled={loading || item.productCount > 0} onClick={() => deleteSupplier(item)}>{labels.delete}</Button>
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

            <form className="grid gap-4 p-5" onSubmit={submitSupplier}>
              <div className="grid gap-2">
                <Label>{labels.slug}</Label>
                <Input value={activeForm.slug} onChange={(event) => patchActiveField("slug", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.name}</Label>
                <Input value={activeForm.name} onChange={(event) => patchActiveField("name", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.email}</Label>
                <Input value={activeForm.email} onChange={(event) => patchActiveField("email", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.phone}</Label>
                <Input value={activeForm.phone} onChange={(event) => patchActiveField("phone", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.taxNumber}</Label>
                <Input value={activeForm.taxNumber} onChange={(event) => patchActiveField("taxNumber", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.defaultPaymentTermDays}</Label>
                <Input type="number" min={0} max={365} value={activeForm.defaultPaymentTermDays} onChange={(event) => patchActiveField("defaultPaymentTermDays", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.creditLimit}</Label>
                <Input type="number" min={0} step="0.01" value={activeForm.creditLimit} onChange={(event) => patchActiveField("creditLimit", event.target.value)} />
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
