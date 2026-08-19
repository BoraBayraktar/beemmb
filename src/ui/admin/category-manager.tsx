"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrendyolCatalogSearch } from "@/ui/admin/use-trendyol-catalog-search";

type Category = {
  id: string;
  slug: string;
  name: string;
  trendyolCategoryId: number | null;
  pazaramaCategoryId: string | null;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
};

type ParentCategoryOption = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};

type Labels = {
  title: string;
  marketplaceNote: string;
  createTitle: string;
  listTitle: string;
  search: string;
  allParents: string;
  slug: string;
  name: string;
  productCount: string;
  trendyolId: string;
  trendyolSearch: string;
  trendyolSearchHint: string;
  trendyolSelected: string;
  pazaramaId: string;
  pazaramaSearch: string;
  pazaramaSearchHint: string;
  pazaramaSelected: string;
  parentCategory: string;
  filterProducts: string;
  filterAllProducts: string;
  filterWithProducts: string;
  filterWithoutProducts: string;
  sort: string;
  sortUpdatedDesc: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortProductCountDesc: string;
  rootCategoriesOnly: string;
  noParent: string;
  page: string;
  prev: string;
  next: string;
  save: string;
  create: string;
  edit: string;
  delete: string;
  cancel: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
  validationDeleteBlocked: string;
  loading: string;
  importCsv: string;
  exportCsv: string;
};

type Props = {
  initialResult: {
    items: Category[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  parentCandidates: ParentCategoryOption[];
  labels: Labels;
  canDelete: boolean;
};

type DrawerMode = "create" | "edit";

type CategoryForm = {
  slug: string;
  name: string;
  trendyolCategoryId: string;
  pazaramaCategoryId: string;
  parentId: string;
};

type TrendyolCategoryOption = {
  id: number;
  name: string;
  path: string;
  leaf: boolean;
};

type PazaramaCategoryOption = {
  id: string;
  name: string;
  path: string;
  leaf: boolean;
};

const emptyForm: CategoryForm = {
  slug: "",
  name: "",
  trendyolCategoryId: "",
  pazaramaCategoryId: "",
  parentId: "",
};

function mapPayload(form: CategoryForm) {
  return {
    slug: form.slug,
    name: form.name,
    trendyolCategoryId: form.trendyolCategoryId.trim() ? Number(form.trendyolCategoryId) : null,
    pazaramaCategoryId: form.pazaramaCategoryId.trim() || null,
    parentId: form.parentId.trim() ? form.parentId : null,
  };
}

export function CategoryManager({ initialResult, parentCandidates, labels, canDelete }: Props) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState(initialResult);
  const [query, setQuery] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [rootOnly, setRootOnly] = useState(false);
  const [hasProducts, setHasProducts] = useState<"all" | "with_products" | "without_products">("all");
  const [sort, setSort] = useState<"updated_desc" | "name_asc" | "name_desc" | "product_count_desc">("updated_desc");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CategoryForm>(emptyForm);
  const [editForm, setEditForm] = useState<CategoryForm>(emptyForm);
  const trendyolCategorySearch = useTrendyolCatalogSearch<TrendyolCategoryOption>({
    endpoint: "/api/admin/integrations/marketplaces/trendyol/catalog/categories",
    enabled: Boolean(drawerMode),
  });
  const pazaramaCategorySearch = useTrendyolCatalogSearch<PazaramaCategoryOption>({
    endpoint: "/api/admin/integrations/marketplaces/pazarama/catalog/categories",
    enabled: Boolean(drawerMode),
  });

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;

  const candidateById = useMemo(() => {
    return new Map(parentCandidates.map((item) => [item.id, item]));
  }, [parentCandidates]);

  const getCategoryBreadcrumb = useCallback((categoryId: string) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let cursor: string | null = categoryId;

    while (cursor) {
      if (visited.has(cursor)) {
        break;
      }

      visited.add(cursor);

      const node = candidateById.get(cursor);
      if (!node) {
        break;
      }

      path.unshift(node.name);
      cursor = node.parentId;
    }

    return path.join(" > ");
  }, [candidateById]);

  const getCategoryDepth = useCallback((categoryId: string) => {
    let depth = 0;
    const visited = new Set<string>();
    let cursor: string | null = categoryId;

    while (cursor) {
      if (visited.has(cursor)) {
        break;
      }

      visited.add(cursor);

      const node = candidateById.get(cursor);
      if (!node || !node.parentId) {
        break;
      }

      depth += 1;
      cursor = node.parentId;
    }

    return depth;
  }, [candidateById]);

  const getParentBreadcrumb = (category: Category) => {
    if (!category.parentId) {
      return labels.noParent;
    }

    const path: string[] = [];
    const visited = new Set<string>();
    let cursor: string | null = category.parentId;

    while (cursor) {
      if (visited.has(cursor)) {
        break;
      }

      visited.add(cursor);

      const node = candidateById.get(cursor);
      if (!node) {
        break;
      }

      path.unshift(node.name);
      cursor = node.parentId;
    }

    if (path.length === 0) {
      return category.parentName ?? labels.noParent;
    }

    return path.join(" > ");
  };

  const parentSelectOptions = useMemo(() => {
    return parentCandidates
      .map((item) => ({
        ...item,
        depth: getCategoryDepth(item.id),
        label: getCategoryBreadcrumb(item.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [getCategoryBreadcrumb, getCategoryDepth, parentCandidates]);

  function patchActiveField(field: keyof CategoryForm, value: string) {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({ ...prev, [field]: value }));
      return;
    }

    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm(form: CategoryForm) {
    if (!form.slug.trim() || !form.name.trim()) {
      return labels.validationRequired;
    }

    return null;
  }

  async function fetchCategories(nextQuery: string, page: number) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) {
      params.set("search", nextQuery.trim());
    }
    if (selectedParentId.trim()) {
      params.set("parentId", selectedParentId);
    }
    if (rootOnly) {
      params.set("rootOnly", "true");
    }
    if (hasProducts !== "all") {
      params.set("hasProducts", hasProducts);
    }
    if (sort !== "updated_desc") {
      params.set("sort", sort);
    }
    params.set("page", String(page));
    params.set("pageSize", String(result.pageSize));

    const response = await fetch(`/api/admin/categories?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.opFailed);
    }

    const payload = (await response.json()) as typeof initialResult;
    setResult(payload);
  }

  function openCreateDrawer() {
    setError(null);
    setEditingId(null);
    setCreateForm(emptyForm);
    trendyolCategorySearch.clear();
    pazaramaCategorySearch.clear();
    setDrawerMode("create");
  }

  function openEditDrawer(category: Category) {
    setError(null);
    setEditingId(category.id);
    setEditForm({
      slug: category.slug,
      name: category.name,
      trendyolCategoryId: category.trendyolCategoryId ? String(category.trendyolCategoryId) : "",
      pazaramaCategoryId: category.pazaramaCategoryId ?? "",
      parentId: category.parentId ?? "",
    });
    trendyolCategorySearch.setQuery(category.name);
    trendyolCategorySearch.setItems([]);
    pazaramaCategorySearch.setQuery(category.name);
    pazaramaCategorySearch.setItems([]);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetchCategories(query, 1)
        .catch((caughtError) => {
          setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasProducts, labels.opFailed, query, rootOnly, selectedParentId, sort]);

  async function goToPage(nextPage: number) {
    setLoading(true);
    setError(null);

    try {
      await fetchCategories(query, nextPage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = drawerMode === "edit" ? editForm : createForm;
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mapPayload(form)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setCreateForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
      await fetchCategories(query, result.page);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (category.productCount > 0) {
      setError(labels.validationDeleteBlocked);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      await fetchCategories(query, Math.min(result.page, Math.max(1, result.totalPages)));
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

  function toCsvValue(value: string | number) {
    const normalized = String(value);
    if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
      return `"${normalized.replaceAll("\"", "\"\"")}"`;
    }
    return normalized;
  }

  function exportCategories() {
    const header = ["name", "slug", "trendyolCategoryId", "parentSlug", "productCount"];
    const rows = result.items.map((category) => {
      const parentSlug = category.parentId ? parentCandidates.find((item) => item.id === category.parentId)?.slug ?? "" : "";
      return [
        toCsvValue(category.name),
        toCsvValue(category.slug),
        toCsvValue(category.trendyolCategoryId ?? ""),
        toCsvValue(parentSlug),
        toCsvValue(category.productCount),
      ];
    });

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCategories(file: File | null) {
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
      const parentSlugMap = new Map(
        parentCandidates.map((item) => [item.slug.toLocaleLowerCase("tr-TR"), item.id]),
      );

      for (const line of lines.slice(1)) {
        const columns = parseCsvLine(line);
        const row = Object.fromEntries(headers.map((key, index) => [key, columns[index] ?? ""])) as Record<string, string>;

        if (!row.name?.trim() || !row.slug?.trim()) {
          continue;
        }

        const parentSlug = row.parentslug?.trim().toLocaleLowerCase("tr-TR") ?? "";
        const response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: row.name.trim(),
            slug: row.slug.trim(),
            trendyolCategoryId: row.trendyolcategoryid?.trim() ? Number(row.trendyolcategoryid) : null,
            parentId: parentSlug ? parentSlugMap.get(parentSlug) ?? null : null,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? labels.opFailed);
          return;
        }
      }

      await fetchCategories(query, result.page);
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
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.listTitle}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{result.total} kategori listeleniyor</p>
          <p className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{labels.marketplaceNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void importCategories(event.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" disabled={loading || importing} onClick={() => importFileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {labels.importCsv}
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={exportCategories}>
            <Download className="h-4 w-4" />
            {labels.exportCsv}
          </Button>
          <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_220px_200px_220px_auto]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
          <Select value={selectedParentId || "__all__"} onValueChange={(value) => setSelectedParentId(value === "__all__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder={labels.allParents} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{labels.allParents}</SelectItem>
              {parentSelectOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {`${"-- ".repeat(item.depth)}${item.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hasProducts} onValueChange={(value) => setHasProducts(value as "all" | "with_products" | "without_products")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.filterProducts} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filterAllProducts}</SelectItem>
              <SelectItem value="with_products">{labels.filterWithProducts}</SelectItem>
              <SelectItem value="without_products">{labels.filterWithoutProducts}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as "updated_desc" | "name_asc" | "name_desc" | "product_count_desc")}>
            <SelectTrigger>
              <SelectValue placeholder={labels.sort} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">{labels.sortUpdatedDesc}</SelectItem>
              <SelectItem value="name_asc">{labels.sortNameAsc}</SelectItem>
              <SelectItem value="name_desc">{labels.sortNameDesc}</SelectItem>
              <SelectItem value="product_count_desc">{labels.sortProductCountDesc}</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-text)]">
            <input type="checkbox" checked={rootOnly} onChange={(event) => setRootOnly(event.target.checked)} />
            {labels.rootCategoriesOnly}
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[1fr_1fr_120px_120px_1fr_120px_190px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.name}</span>
            <span>{labels.slug}</span>
            <span>{labels.trendyolId}</span>
            <span>{labels.pazaramaId}</span>
            <span>{labels.parentCategory}</span>
            <span>{labels.productCount}</span>
            <span className="text-right">Islem</span>
          </div>

          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {result.items.map((category) => (
                <article key={category.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_120px_120px_1fr_120px_190px] lg:items-center">
                  <div>
                    <h3 className="font-medium text-[color:var(--color-text)]">{category.name}</h3>
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{category.slug}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{category.trendyolCategoryId ?? "-"}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{category.pazaramaCategoryId ?? "-"}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{getParentBreadcrumb(category)}</p>
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">{category.productCount}</p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => openEditDrawer(category)}>{labels.edit}</Button>
                    {canDelete ? (
                      <Button type="button" size="sm" variant="destructive" disabled={loading || category.productCount > 0} onClick={() => deleteCategory(category)}>{labels.delete}</Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={result.page <= 1 || loading} onClick={() => goToPage(Math.max(1, result.page - 1))}>{labels.prev}</Button>
          <span className="text-sm text-[color:var(--color-text-muted)]">{labels.page} {result.page}/{result.totalPages}</span>
          <Button type="button" variant="secondary" disabled={result.page >= result.totalPages || loading} onClick={() => goToPage(Math.min(result.totalPages, result.page + 1))}>{labels.next}</Button>
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitCategory}>
              <div className="grid gap-2">
                <Label>{labels.slug}</Label>
                <Input value={activeForm.slug} onChange={(event) => patchActiveField("slug", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.pazaramaId}</Label>
                <Input
                  value={pazaramaCategorySearch.query}
                  onChange={(event) => pazaramaCategorySearch.setQuery(event.target.value)}
                  placeholder={labels.pazaramaSearch}
                  disabled={loading}
                />
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                  {activeForm.pazaramaCategoryId ? (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                      <span className="text-[color:var(--color-text)]">{labels.pazaramaSelected}: {activeForm.pazaramaCategoryId}</span>
                      <button type="button" className="text-xs font-medium text-rose-600" onClick={() => patchActiveField("pazaramaCategoryId", "")}>
                        {labels.delete}
                      </button>
                    </div>
                  ) : null}
                  {pazaramaCategorySearch.busy ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.loading}</p>
                  ) : pazaramaCategorySearch.items.length === 0 ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.pazaramaSearchHint}</p>
                  ) : (
                    <div className="grid gap-1">
                      {pazaramaCategorySearch.items.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            patchActiveField("pazaramaCategoryId", option.id);
                            pazaramaCategorySearch.setQuery(option.path);
                            pazaramaCategorySearch.setItems([]);
                          }}
                          className="rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-left text-sm transition hover:bg-cyan-50"
                        >
                          <span className="font-medium text-[color:var(--color-text)]">{option.path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.name}</Label>
                <Input value={activeForm.name} onChange={(event) => patchActiveField("name", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.trendyolId}</Label>
                <Input
                  value={trendyolCategorySearch.query}
                  onChange={(event) => trendyolCategorySearch.setQuery(event.target.value)}
                  placeholder={labels.trendyolSearch}
                  disabled={loading}
                />
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                  {activeForm.trendyolCategoryId ? (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                      <span className="text-[color:var(--color-text)]">{labels.trendyolSelected}: {activeForm.trendyolCategoryId}</span>
                      <button type="button" className="text-xs font-medium text-rose-600" onClick={() => patchActiveField("trendyolCategoryId", "")}>
                        {labels.delete}
                      </button>
                    </div>
                  ) : null}
                  {trendyolCategorySearch.busy ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.loading}</p>
                  ) : trendyolCategorySearch.items.length === 0 ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.trendyolSearchHint}</p>
                  ) : (
                    <div className="grid gap-1">
                      {trendyolCategorySearch.items.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            patchActiveField("trendyolCategoryId", String(option.id));
                            trendyolCategorySearch.setQuery(option.path);
                            trendyolCategorySearch.setItems([]);
                          }}
                          className="rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-left text-sm transition hover:bg-cyan-50"
                        >
                          <span className="font-medium text-[color:var(--color-text)]">{option.path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.parentCategory}</Label>
                <Select
                  value={activeForm.parentId || "__none__"}
                  onValueChange={(value) => patchActiveField("parentId", value === "__none__" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={labels.noParent} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{labels.noParent}</SelectItem>
                    {parentSelectOptions
                      .filter((item) => (drawerMode === "edit" ? item.id !== editingId : true))
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {`${"-- ".repeat(item.depth)}${item.label}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-[color:var(--color-border)] pt-5">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>{labels.cancel}</Button>
                <Button type="submit" disabled={loading}>{loading ? labels.loading : activeSubmit}</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
