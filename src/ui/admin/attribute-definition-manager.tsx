"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlugField } from "@/components/ui/slug-field";
import { slugify } from "@/lib/utils";
import type {
  AdminProductAttributeDefinitionItem,
  AdminProductAttributeValueMarketplaceMappingItem,
} from "@/modules/catalog/contracts/catalog-admin.contract";
import { useTrendyolCatalogSearch } from "@/ui/admin/use-trendyol-catalog-search";

type Labels = {
  title: string;
  description: string;
  createTitle: string;
  empty: string;
  slug: string;
  attributeName: string;
  attributeDisplayType: string;
  attributeDisplayText: string;
  attributeDisplayColor: string;
  attributeDisplayNumber: string;
  trendyolId: string;
  trendyolCategorySearch: string;
  trendyolCategorySearchHint: string;
  trendyolAttributeSearchHint: string;
  trendyolValueSearchHint: string;
  trendyolSelected: string;
  variantAxisUsageCount: string;
  moveUp: string;
  moveDown: string;
  create: string;
  save: string;
  edit: string;
  delete: string;
  cancel: string;
  notSpecified: string;
  saving: string;
  search: string;
  importCsv: string;
  exportCsv: string;
  status: string;
  statusActive: string;
  statusArchived: string;
  selectedCount: string;
  valueMappingsTitle: string;
  valueMappingsDescription: string;
  valueMappingsChannel: string;
  valueMappingsManualHint: string;
  localValue: string;
  externalValueId: string;
  externalValueName: string;
  customValue: string;
  channelTrendyol: string;
  channelN11: string;
  channelPazarama: string;
  channelHepsiburada: string;
  unsavedChangesConfirm: string;
};

type TrendyolCategoryOption = {
  id: number;
  path: string;
};

type TrendyolAttributeOption = {
  id: number;
  name: string;
  required: boolean;
  allowCustom: boolean;
  varianter: boolean;
};

type TrendyolAttributeValueOption = {
  id: number;
  name: string;
};

type Props = {
  items: AdminProductAttributeDefinitionItem[];
  valueMappings: AdminProductAttributeValueMarketplaceMappingItem[];
  labels: Labels;
};

type MarketplaceChannel = "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";

type DrawerMode = "create" | "edit";

type FormState = {
  slug: string;
  name: string;
  displayType: AdminProductAttributeDefinitionItem["displayType"];
  trendyolAttributeId: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  slug: "",
  name: "",
  displayType: "TEXT",
  trendyolAttributeId: "",
  isActive: true,
};

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

export function AttributeDefinitionManager({ items, valueMappings, labels }: Props) {
  const router = useRouter();
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const draftSnapshotRef = useRef<string>("");
  const [selectedMappingChannel, setSelectedMappingChannel] = useState<MarketplaceChannel>("TRENDYOL");
  const [mappingRows, setMappingRows] = useState(valueMappings);
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, {
    externalAttributeValueId: string;
    externalAttributeValueName: string;
    customAttributeValue: string;
  }>>(() => Object.fromEntries(valueMappings.map((item) => [item.id, {
    externalAttributeValueId: item.externalAttributeValueId ? String(item.externalAttributeValueId) : "",
    externalAttributeValueName: item.externalAttributeValueName ?? "",
    customAttributeValue: item.customAttributeValue ?? "",
  }])));
  const [attributeCategoryId, setAttributeCategoryId] = useState("");
  const [trendyolAttributeOptions, setTrendyolAttributeOptions] = useState<TrendyolAttributeOption[]>([]);
  const [trendyolAttributeLookupBusy, setTrendyolAttributeLookupBusy] = useState(false);
  const [mappingCategoryId, setMappingCategoryId] = useState("");
  const [trendyolValueOptionsByMappingId, setTrendyolValueOptionsByMappingId] = useState<Record<string, TrendyolAttributeValueOption[]>>({});
  const attributeCategorySearch = useTrendyolCatalogSearch<TrendyolCategoryOption>({
    endpoint: "/api/admin/integrations/marketplaces/trendyol/catalog/categories",
    enabled: Boolean(drawerMode),
  });
  const mappingCategorySearch = useTrendyolCatalogSearch<TrendyolCategoryOption>({
    endpoint: "/api/admin/integrations/marketplaces/trendyol/catalog/categories",
  });
  const selectedChannelLabel = selectedMappingChannel === "TRENDYOL"
    ? labels.channelTrendyol
    : labels.channelN11;

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.slug, item.displayType].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalized)),
    );
  }, [items, searchQuery]);

  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  useEffect(() => {
    if (!attributeCategoryId) {
      return;
    }

    let cancelled = false;

    async function loadAttributes() {
      setTrendyolAttributeLookupBusy(true);

      try {
        const response = await fetch(`/api/admin/integrations/marketplaces/trendyol/catalog/attributes?categoryId=${encodeURIComponent(attributeCategoryId)}`);

        if (!response.ok) {
          setTrendyolAttributeOptions([]);
          return;
        }

        const payload = await response.json() as { items: TrendyolAttributeOption[] };
        if (!cancelled) {
          setTrendyolAttributeOptions(payload.items);
        }
      } finally {
        if (!cancelled) {
          setTrendyolAttributeLookupBusy(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      cancelled = true;
    };
  }, [attributeCategoryId]);

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  function openCreateDrawer() {
    resetMessages();
    setEditingId(null);
    setForm(EMPTY_FORM);
    attributeCategorySearch.clear();
    setAttributeCategoryId("");
    setTrendyolAttributeOptions([]);
    draftSnapshotRef.current = JSON.stringify(EMPTY_FORM);
    setDrawerMode("create");
  }

  function openEditDrawer(item: AdminProductAttributeDefinitionItem) {
    resetMessages();
    setEditingId(item.id);
    const initialForm: FormState = {
      slug: item.slug,
      name: item.name,
      displayType: item.displayType,
      trendyolAttributeId: item.trendyolAttributeId ? String(item.trendyolAttributeId) : "",
      isActive: item.isActive,
    };
    setForm(initialForm);
    attributeCategorySearch.clear();
    setAttributeCategoryId("");
    setTrendyolAttributeOptions([]);
    draftSnapshotRef.current = JSON.stringify(initialForm);
    setDrawerMode("edit");
  }

  function hasUnsavedDraftChanges() {
    return draftSnapshotRef.current !== JSON.stringify(form);
  }

  function closeDrawer() {
    if (pending) {
      return;
    }

    if (hasUnsavedDraftChanges() && !window.confirm(labels.unsavedChangesConfirm)) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMappingDraft(id: string, key: "externalAttributeValueId" | "externalAttributeValueName" | "customAttributeValue", value: string) {
    setMappingDrafts((prev) => ({
      ...prev,
      [id]: {
        externalAttributeValueId: prev[id]?.externalAttributeValueId ?? "",
        externalAttributeValueName: prev[id]?.externalAttributeValueName ?? "",
        customAttributeValue: prev[id]?.customAttributeValue ?? "",
        [key]: value,
      },
    }));
  }

  async function loadMappingValueOptions(item: AdminProductAttributeValueMarketplaceMappingItem) {
    const definition = items.find((candidate) => candidate.id === item.attributeDefinitionId);

    if (!mappingCategoryId || !definition?.trendyolAttributeId) {
      setError(labels.trendyolValueSearchHint);
      return;
    }

    setPending(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/trendyol/catalog/attribute-values?categoryId=${encodeURIComponent(mappingCategoryId)}&attributeId=${definition.trendyolAttributeId}`);

      if (!response.ok) {
        setError(labels.trendyolValueSearchHint);
        return;
      }

      const payload = await response.json() as { items: TrendyolAttributeValueOption[] };
      setTrendyolValueOptionsByMappingId((prev) => ({ ...prev, [item.id]: payload.items }));
    } finally {
      setPending(false);
    }
  }

  async function refreshMappings(channel = selectedMappingChannel) {
    const response = await fetch(`/api/admin/product-attributes/value-mappings?channel=${encodeURIComponent(channel)}`);
    if (!response.ok) {
      throw new Error(`${channel} deger eslemeleri yenilenemedi.`);
    }

    const payload = await response.json() as { items: AdminProductAttributeValueMarketplaceMappingItem[] };
    setMappingRows(payload.items);
    setMappingDrafts(Object.fromEntries(payload.items.map((item) => [item.id, {
      externalAttributeValueId: item.externalAttributeValueId ? String(item.externalAttributeValueId) : "",
      externalAttributeValueName: item.externalAttributeValueName ?? "",
      customAttributeValue: item.customAttributeValue ?? "",
    }])));
  }

  async function saveMapping(item: AdminProductAttributeValueMarketplaceMappingItem) {
    const draft = mappingDrafts[item.id] ?? {
      externalAttributeValueId: "",
      externalAttributeValueName: "",
      customAttributeValue: "",
    };

    setPending(true);
    resetMessages();

    try {
      const response = await fetch("/api/admin/product-attributes/value-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributeDefinitionId: item.attributeDefinitionId,
          channel: selectedMappingChannel,
          localValue: item.localValue,
          externalAttributeValueId: draft.externalAttributeValueId.trim() ? Number(draft.externalAttributeValueId) : null,
          externalAttributeValueName: draft.externalAttributeValueName.trim() || null,
          customAttributeValue: draft.customAttributeValue.trim() || null,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `${selectedChannelLabel} deger eslemesi kaydedilemedi.`);
        return;
      }

      await refreshMappings();
      setSuccess(`${selectedChannelLabel} deger eslemesi kaydedildi.`);
      router.refresh();
    } catch {
      setError(`${selectedChannelLabel} deger eslemesi kaydedilemedi.`);
    } finally {
      setPending(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredItems.some((item) => item.id === id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredItems.map((item) => item.id)])));
  }

  async function submitForm() {
    setPending(true);
    resetMessages();

    try {
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        displayType: form.displayType,
        trendyolAttributeId: form.trendyolAttributeId.trim() ? Number(form.trendyolAttributeId) : null,
        ...(drawerMode === "create" ? { sortOrder: items.length } : {}),
        isActive: form.isActive,
      };

      const response = await fetch(
        drawerMode === "edit" && editingId ? `/api/admin/product-attributes/${editingId}` : "/api/admin/product-attributes",
        {
          method: drawerMode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "Ozellik tanimi kaydedilemedi.");
        return;
      }

      setDrawerMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch {
      setError("Ozellik tanimi kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  async function deleteItems(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    setPending(true);
    resetMessages();

    try {
      for (const id of ids) {
        const response = await fetch(`/api/admin/product-attributes/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(body?.message ?? "Ozellik tanimi silinemedi.");
          setPending(false);
          return;
        }
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      if (editingId && ids.includes(editingId)) {
        setDrawerMode(null);
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      router.refresh();
    } catch {
      setError("Ozellik tanimi silinemedi.");
    } finally {
      setPending(false);
    }
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((entry) => entry.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updates = reordered
      .map((entry, position) => ({ id: entry.id, sortOrder: position, changed: entry.sortOrder !== position }))
      .filter((entry) => entry.changed);

    if (updates.length === 0) {
      return;
    }

    setPending(true);
    resetMessages();

    try {
      const responses = await Promise.all(
        updates.map((update) =>
          fetch(`/api/admin/product-attributes/${update.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: update.sortOrder }),
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        setError("Siralama guncellenemedi.");
        return;
      }

      router.refresh();
    } catch {
      setError("Siralama guncellenemedi.");
    } finally {
      setPending(false);
    }
  }

  function exportCsv() {
    resetMessages();
    const header = ["name", "slug", "displayType", "trendyolAttributeId", "sortOrder", "isActive", "productCount"];
    const rows = items.map((item) => [
      toCsvValue(item.name),
      toCsvValue(item.slug),
      toCsvValue(item.displayType),
      toCsvValue(item.trendyolAttributeId ?? ""),
      toCsvValue(item.sortOrder),
      toCsvValue(item.isActive),
      toCsvValue(item.productCount),
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-attribute-definitions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File | null) {
    if (!file) {
      return;
    }

    setImporting(true);
    resetMessages();

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

      const header = parseCsvLine(lines[0]).map((value) => value.toLocaleLowerCase("tr-TR"));
      const createdRows: string[] = [];

      for (const line of lines.slice(1)) {
        const columns = parseCsvLine(line);
        const row = Object.fromEntries(header.map((key, index) => [key, columns[index] ?? ""])) as Record<string, string>;

        if (!row.name?.trim() || !row.slug?.trim()) {
          continue;
        }

        const response = await fetch("/api/admin/product-attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name.trim(),
            slug: row.slug.trim(),
            displayType: row.displaytype === "COLOR" || row.displaytype === "NUMBER" ? row.displaytype : "TEXT",
            trendyolAttributeId: row.trendyolattributeid?.trim() ? Number(row.trendyolattributeid) : null,
            sortOrder: Number(row.sortorder || "0"),
            isActive: row.isactive ? row.isactive.toLowerCase() !== "false" : true,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(body?.message ?? "CSV ici aktarma tamamlanamadi.");
          return;
        }

        createdRows.push(row.name.trim());
      }

      setSuccess(`${createdRows.length} ozellik tanimi ice aktarildi.`);
      router.refresh();
    } catch {
      setError("CSV ici aktarma tamamlanamadi.");
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
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.createTitle}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void importCsv(event.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={importing || pending} onClick={() => importFileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {labels.importCsv}
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={exportCsv}>
            <Download className="h-4 w-4" />
            {labels.exportCsv}
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending || selectedIds.length === 0} onClick={() => void deleteItems(selectedIds)}>
            <Trash2 className="h-4 w-4" />
            {labels.delete} ({selectedIds.length})
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" />
            {labels.create}
          </Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{success}</p> : null}

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={labels.search}
            className="w-full max-w-md"
          />
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {labels.selectedCount}: {selectedIds.length}
          </p>
        </div>

        <div className="grid gap-3 lg:hidden">
          {filteredItems.length === 0 ? (
            <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-text-muted)]">
              {labels.empty}
            </article>
          ) : (
            filteredItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    aria-label={item.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[color:var(--color-text)]">{item.name}</h3>
                      <span
                        className={
                          item.isActive
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-[color:var(--color-bg-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-muted)]"
                        }
                      >
                        {item.isActive ? labels.statusActive : labels.statusArchived}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--color-text-muted)]">
                      <p>{labels.attributeDisplayType}: {item.displayType}</p>
                      <p>{labels.trendyolId}: {item.trendyolAttributeId ?? "-"}</p>
                      <p>{labels.variantAxisUsageCount}: {item.productCount}</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          disabled={pending || Boolean(searchQuery.trim()) || items.findIndex((entry) => entry.id === item.id) === 0}
                          onClick={() => void moveItem(item.id, "up")}
                          aria-label={labels.moveUp}
                          title={labels.moveUp}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          disabled={pending || Boolean(searchQuery.trim()) || items.findIndex((entry) => entry.id === item.id) === items.length - 1}
                          onClick={() => void moveItem(item.id, "down")}
                          aria-label={labels.moveDown}
                          title={labels.moveDown}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => openEditDrawer(item)}>
                        <Pencil className="h-4 w-4" />
                        {labels.edit}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={() => void deleteItems([item.id])}>
                        <Trash2 className="h-4 w-4" />
                        {labels.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[color:var(--color-border)] lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--color-border)] text-sm">
              <thead className="bg-[color:var(--color-bg-soft)] text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">
                    <span className="sr-only">{labels.moveUp}</span>
                  </th>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label={labels.selectedCount} />
                  </th>
                  <th className="px-4 py-3">{labels.attributeName}</th>
                  <th className="px-4 py-3">{labels.attributeDisplayType}</th>
                  <th className="px-4 py-3">{labels.trendyolId}</th>
                  <th className="px-4 py-3">{labels.variantAxisUsageCount}</th>
                  <th className="px-4 py-3">{labels.status}</th>
                  <th className="px-4 py-3 text-right">{labels.save}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-[color:var(--color-text-muted)]">
                      {labels.empty}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[color:var(--color-bg-soft)]/80">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            disabled={pending || Boolean(searchQuery.trim()) || items.findIndex((entry) => entry.id === item.id) === 0}
                            onClick={() => void moveItem(item.id, "up")}
                            aria-label={labels.moveUp}
                            title={labels.moveUp}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            disabled={pending || Boolean(searchQuery.trim()) || items.findIndex((entry) => entry.id === item.id) === items.length - 1}
                            onClick={() => void moveItem(item.id, "down")}
                            aria-label={labels.moveDown}
                            title={labels.moveDown}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          aria-label={item.name}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.name}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-muted)]">{item.displayType}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-muted)]">{item.trendyolAttributeId ?? "-"}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-muted)]">{item.productCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            item.isActive
                              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "rounded-full bg-[color:var(--color-bg-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-muted)]"
                          }
                        >
                          {item.isActive ? labels.statusActive : labels.statusArchived}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => openEditDrawer(item)}>
                            <Pencil className="h-4 w-4" />
                            {labels.edit}
                          </Button>
                          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void deleteItems([item.id])}>
                            <Trash2 className="h-4 w-4" />
                            {labels.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.valueMappingsTitle}</h3>
              <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.valueMappingsDescription}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => void refreshMappings()}>
              {labels.search}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-cyan-200 bg-[color:var(--color-surface)] p-3">
            <div className="grid gap-2 md:max-w-xs">
              <Label>{labels.valueMappingsChannel}</Label>
              <Select
                value={selectedMappingChannel}
                onValueChange={(value) => {
                  const nextChannel = value as MarketplaceChannel;
                  setSelectedMappingChannel(nextChannel);
                  setMappingCategoryId("");
                  setTrendyolValueOptionsByMappingId({});
                  resetMessages();
                  void refreshMappings(nextChannel);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRENDYOL">{labels.channelTrendyol}</SelectItem>
                  <SelectItem value="N11">{labels.channelN11}</SelectItem>
                  <SelectItem value="PAZARAMA">{labels.channelPazarama}</SelectItem>
                  <SelectItem value="HEPSIBURADA">{labels.channelHepsiburada}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedMappingChannel === "TRENDYOL" ? (
              <>
                <Label>{labels.trendyolCategorySearch}</Label>
                <Input
                  value={mappingCategorySearch.query}
                  onChange={(event) => {
                    mappingCategorySearch.setQuery(event.target.value);
                    setMappingCategoryId("");
                    setTrendyolValueOptionsByMappingId({});
                  }}
                  placeholder={labels.trendyolCategorySearch}
                  disabled={pending}
                />
                {mappingCategoryId ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm">
                    <span className="text-cyan-800">{labels.trendyolSelected}: {mappingCategoryId}</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-rose-600"
                      onClick={() => {
                        setMappingCategoryId("");
                        setTrendyolValueOptionsByMappingId({});
                      }}
                    >
                      {labels.delete}
                    </button>
                  </div>
                ) : null}
                {mappingCategorySearch.busy ? (
                  <p className="text-sm text-[color:var(--color-text-muted)]">{labels.saving}</p>
                ) : mappingCategorySearch.items.length === 0 ? (
                  <p className="text-sm text-[color:var(--color-text-muted)]">{labels.trendyolCategorySearchHint}</p>
                ) : (
                  <div className="grid max-h-52 gap-1 overflow-y-auto">
                    {mappingCategorySearch.items.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setMappingCategoryId(String(option.id));
                          mappingCategorySearch.setQuery(option.path);
                          mappingCategorySearch.setItems([]);
                          setTrendyolValueOptionsByMappingId({});
                        }}
                        className="rounded-lg bg-[color:var(--color-bg-soft)] px-3 py-2 text-left text-sm transition hover:bg-cyan-50"
                      >
                        {option.path}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {labels.valueMappingsManualHint}
              </p>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-cyan-200 bg-[color:var(--color-surface)]">
            {mappingRows.length === 0 ? (
              <p className="p-4 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
            ) : (
              <div className="divide-y divide-[color:var(--color-border)]">
                {mappingRows.map((item) => {
                  const definition = items.find((candidate) => candidate.id === item.attributeDefinitionId);
                  const draft = mappingDrafts[item.id] ?? {
                    externalAttributeValueId: "",
                    externalAttributeValueName: "",
                    customAttributeValue: "",
                  };
                  const canLoadTrendyolValues = selectedMappingChannel === "TRENDYOL" && Boolean(mappingCategoryId && definition?.trendyolAttributeId);
                  const valueLookupHint = selectedMappingChannel !== "TRENDYOL"
                    ? labels.valueMappingsManualHint
                    : !mappingCategoryId
                      ? labels.trendyolCategorySearchHint
                      : !definition?.trendyolAttributeId
                        ? labels.trendyolAttributeSearchHint
                        : labels.trendyolValueSearchHint;

                  return (
                    <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1.3fr_1fr_1fr_110px] lg:items-end">
                      <div>
                        <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.attributeName}</p>
                        <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{item.attributeName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.localValue}</p>
                        <p className="mt-1 text-sm text-[color:var(--color-text)]">{item.localValue}</p>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">{labels.externalValueId}</Label>
                        {selectedMappingChannel === "TRENDYOL" ? (
                          <>
                            <Button type="button" variant="secondary" size="sm" disabled={pending || !canLoadTrendyolValues} onClick={() => void loadMappingValueOptions(item)}>
                              {labels.search}
                            </Button>
                            {(trendyolValueOptionsByMappingId[item.id] ?? []).length > 0 ? (
                              <div className="max-h-44 overflow-y-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-2">
                                {trendyolValueOptionsByMappingId[item.id].map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-[color:var(--color-surface)]"
                                    onClick={() => {
                                      updateMappingDraft(item.id, "externalAttributeValueId", String(option.id));
                                      updateMappingDraft(item.id, "externalAttributeValueName", option.name);
                                      setTrendyolValueOptionsByMappingId((prev) => ({ ...prev, [item.id]: [] }));
                                    }}
                                  >
                                    {option.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[color:var(--color-text-muted)]">
                                {draft.externalAttributeValueId ? `${labels.trendyolSelected}: ${draft.externalAttributeValueId}` : valueLookupHint}
                              </p>
                            )}
                          </>
                        ) : (
                          <Input
                            value={draft.externalAttributeValueId}
                            onChange={(event) => updateMappingDraft(item.id, "externalAttributeValueId", event.target.value)}
                            placeholder={labels.externalValueId}
                          />
                        )}
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">{labels.externalValueName}</Label>
                        <Input
                          value={draft.externalAttributeValueName}
                          onChange={(event) => updateMappingDraft(item.id, "externalAttributeValueName", event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">{labels.customValue}</Label>
                        <Input
                          value={draft.customAttributeValue}
                          onChange={(event) => updateMappingDraft(item.id, "customAttributeValue", event.target.value)}
                        />
                      </div>
                      <Button type="button" size="sm" disabled={pending} onClick={() => void saveMapping(item)}>
                        {labels.save}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl sm:max-w-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-text)] sm:text-xl">
                  {drawerMode === "create" ? labels.createTitle : `${labels.edit}: ${form.name || labels.attributeName}`}
                </h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={pending}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:px-5">
              <div className="grid gap-2">
                <Label>{labels.attributeName}</Label>
                <Input
                  value={form.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setForm((prev) => {
                      // Slug, kullanıcı elle özelleştirmediği sürece isimden otomatik türetilir.
                      const slugWasAutoDerived = !prev.slug.trim() || prev.slug.trim() === slugify(prev.name);
                      return { ...prev, name: nextName, slug: slugWasAutoDerived ? slugify(nextName) : prev.slug };
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <SlugField
                  value={form.slug}
                  onChange={(value) => updateForm("slug", value)}
                  label={labels.slug}
                  editLabel={labels.edit}
                  notSpecifiedLabel={labels.notSpecified}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.attributeDisplayType}</Label>
                <Select value={form.displayType} onValueChange={(value) => updateForm("displayType", value as FormState["displayType"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">{labels.attributeDisplayText}</SelectItem>
                    <SelectItem value="COLOR">{labels.attributeDisplayColor}</SelectItem>
                    <SelectItem value="NUMBER">{labels.attributeDisplayNumber}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{labels.trendyolId}</Label>
                <Input
                  value={attributeCategorySearch.query}
                  onChange={(event) => attributeCategorySearch.setQuery(event.target.value)}
                  placeholder={labels.trendyolCategorySearch}
                  disabled={pending}
                />
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                  {form.trendyolAttributeId ? (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                      <span className="text-[color:var(--color-text)]">{labels.trendyolSelected}: {form.trendyolAttributeId}</span>
                      <button type="button" className="text-xs font-medium text-rose-600" onClick={() => updateForm("trendyolAttributeId", "")}>
                        {labels.delete}
                      </button>
                    </div>
                  ) : null}
                  {!attributeCategoryId ? (
                    <>
                      {attributeCategorySearch.busy ? (
                        <p className="text-sm text-[color:var(--color-text-muted)]">{labels.saving}</p>
                      ) : attributeCategorySearch.items.length === 0 ? (
                        <p className="text-sm text-[color:var(--color-text-muted)]">{labels.trendyolCategorySearchHint}</p>
                      ) : (
                        <div className="grid gap-1">
                          {attributeCategorySearch.items.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setAttributeCategoryId(String(option.id));
                                attributeCategorySearch.setQuery(option.path);
                                attributeCategorySearch.setItems([]);
                              }}
                              className="rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-left text-sm transition hover:bg-cyan-50"
                            >
                              {option.path}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : trendyolAttributeLookupBusy ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.saving}</p>
                  ) : trendyolAttributeOptions.length === 0 ? (
                    <p className="text-sm text-[color:var(--color-text-muted)]">{labels.trendyolAttributeSearchHint}</p>
                  ) : (
                    <div className="grid gap-1">
                      {trendyolAttributeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => updateForm("trendyolAttributeId", String(option.id))}
                          className="rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-left text-sm transition hover:bg-cyan-50"
                        >
                          <span className="font-medium text-[color:var(--color-text)]">{option.name}</span>
                          <span className="ml-2 text-xs text-[color:var(--color-text-muted)]">
                            {option.required ? "Zorunlu" : "Opsiyonel"}{option.varianter ? " - Varyant" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm("isActive", event.target.checked)}
                />
                {labels.statusActive}
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--color-border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={closeDrawer} disabled={pending}>
                {labels.cancel}
              </Button>
              <Button type="button" className="w-full sm:w-auto" onClick={() => void submitForm()} disabled={pending}>
                {pending ? labels.saving : drawerMode === "create" ? labels.create : labels.save}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
