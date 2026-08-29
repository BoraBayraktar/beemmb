"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteButton } from "@/ui/admin/confirm-delete-button";
import type { AdminCariItem, CariRole } from "@/modules/cari/contracts/cari.contract";
import { resolveTaxIdentifier } from "@/lib/tax-identifier";
import { formatIbanInput, isValidIban } from "@/lib/iban";

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
  roleLabel: string;
  roleCustomer: string;
  roleSupplier: string;
  roleCarrier: string;
  roleFilterAll: string;
  photo: string;
  uploadPhoto: string;
  uploadingPhoto: string;
  removePhoto: string;
  photoUploadFailed: string;
  email: string;
  phone: string;
  taxNumber: string;
  taxNumberVkn: string;
  taxNumberTckn: string;
  taxIdentifierLabel: string;
  taxNumberVknShort: string;
  taxNumberTcknShort: string;
  taxOffice: string;
  bankSectionTitle: string;
  iban: string;
  bankName: string;
  bankAccountHolder: string;
  contactPersonSectionTitle: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  carrierSectionTitle: string;
  trackingUrlTemplate: string;
  trackingUrlTemplateHint: string;
  trendyolId: string;
  pazaramaId: string;
  hepsiburadaId: string;
  address: string;
  note: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
  status: string;
  create: string;
  save: string;
  edit: string;
  delete: string;
  saving: string;
  cancel: string;
  empty: string;
  createFailed: string;
  operationFailed: string;
  duplicateSlug: string;
  invalidTaxIdentifier: string;
  invalidIban: string;
  roleRequired: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
};

type Props = {
  items: AdminCariItem[];
  labels: Labels;
  canDelete: boolean;
};

type CariForm = {
  slug: string;
  name: string;
  photoUrl: string;
  email: string;
  phone: string;
  taxNumber: string;
  taxOffice: string;
  iban: string;
  bankName: string;
  bankAccountHolder: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  address: string;
  note: string;
  defaultPaymentTermDays: string;
  creditLimit: string;
  isCustomer: boolean;
  isSupplier: boolean;
  isCarrier: boolean;
  isActive: boolean;
  trackingUrlTemplate: string;
  externalCodeTrendyol: string;
  externalCodePazarama: string;
  externalCodeHepsiburada: string;
};

const emptyForm: CariForm = {
  slug: "",
  name: "",
  photoUrl: "",
  email: "",
  phone: "",
  taxNumber: "",
  taxOffice: "",
  iban: "",
  bankName: "",
  bankAccountHolder: "",
  contactPersonName: "",
  contactPersonPhone: "",
  contactPersonEmail: "",
  address: "",
  note: "",
  defaultPaymentTermDays: "",
  creditLimit: "",
  isCustomer: false,
  isSupplier: false,
  isCarrier: false,
  isActive: true,
  trackingUrlTemplate: "",
  externalCodeTrendyol: "",
  externalCodePazarama: "",
  externalCodeHepsiburada: "",
};

function formatEmailInput(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("90")) {
    digits = digits.slice(2);
  }

  if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  const area = digits.slice(0, 3);
  const first = digits.slice(3, 6);
  const second = digits.slice(6, 8);
  const third = digits.slice(8, 10);

  let formatted = area ? `(${area}` : "";
  if (area.length === 3) {
    formatted += ")";
  }
  if (first) {
    formatted += ` ${first}`;
  }
  if (second) {
    formatted += ` ${second}`;
  }
  if (third) {
    formatted += ` ${third}`;
  }

  return formatted;
}

function formatCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d,]/g, "");
  const [wholeRaw, ...decimalParts] = cleaned.split(",");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "");
  const formattedWhole = whole ? Number(whole).toLocaleString("tr-TR") : "";

  if (decimalParts.length === 0) {
    return formattedWhole;
  }

  const decimal = decimalParts.join("").slice(0, 2);
  return `${formattedWhole || "0"},${decimal}`;
}

function formatCurrencyDisplay(value: number): string {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyValue(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

type DrawerMode = "create" | "edit";
type RoleFilter = "all" | CariRole;

export function CariManager({ items, labels, canDelete }: Props) {
  const [cariItems, setCariItems] = useState(items);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [sort, setSort] = useState<"name_asc" | "name_desc">("name_asc");
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CariForm>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const taxIdentifierResolution = useMemo(() => resolveTaxIdentifier(form.taxNumber), [form.taxNumber]);
  const taxNumberLabel = taxIdentifierResolution.status === "valid"
    ? (taxIdentifierResolution.type === "vkn" ? labels.taxNumberVkn : labels.taxNumberTckn)
    : labels.taxIdentifierLabel;
  const showTaxOfficeField = taxIdentifierResolution.status === "valid" && taxIdentifierResolution.type === "vkn";

  const roleFilters: Array<{ value: RoleFilter; label: string }> = [
    { value: "all", label: labels.roleFilterAll },
    { value: "CUSTOMER", label: labels.roleCustomer },
    { value: "SUPPLIER", label: labels.roleSupplier },
    { value: "CARRIER", label: labels.roleCarrier },
  ];

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return [...cariItems]
      .filter((item) => {
        if (roleFilter === "CUSTOMER" && !item.isCustomer) {
          return false;
        }
        if (roleFilter === "SUPPLIER" && !item.isSupplier) {
          return false;
        }
        if (roleFilter === "CARRIER" && !item.isCarrier) {
          return false;
        }

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
  }, [cariItems, query, roleFilter, sort, statusFilter]);

  function roleBadges(item: AdminCariItem) {
    const roles: string[] = [];
    if (item.isCustomer) roles.push(labels.roleCustomer);
    if (item.isSupplier) roles.push(labels.roleSupplier);
    if (item.isCarrier) roles.push(labels.roleCarrier);
    return roles.join(" / ");
  }

  function taxIdentifierBadgeLabel(item: AdminCariItem) {
    if (!item.taxNumber) {
      return null;
    }

    const resolution = resolveTaxIdentifier(item.taxNumber);
    if (resolution.status !== "valid") {
      return null;
    }

    return resolution.type === "vkn" ? labels.taxNumberVknShort : labels.taxNumberTcknShort;
  }

  function openCreateDrawer() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDrawerMode("create");
  }

  function openEditDrawer(item: AdminCariItem) {
    setError(null);
    setEditingId(item.id);
    setPhotoFile(null);
    setForm({
      slug: item.slug,
      name: item.name,
      photoUrl: item.photoUrl ?? "",
      email: item.email ? formatEmailInput(item.email) : "",
      phone: item.phone ? formatPhoneNumber(item.phone) : "",
      taxNumber: item.taxNumber ?? "",
      taxOffice: item.taxOffice ?? "",
      iban: item.iban ? formatIbanInput(item.iban) : "",
      bankName: item.bankName ?? "",
      bankAccountHolder: item.bankAccountHolder ?? "",
      contactPersonName: item.contactPersonName ?? "",
      contactPersonPhone: item.contactPersonPhone ? formatPhoneNumber(item.contactPersonPhone) : "",
      contactPersonEmail: item.contactPersonEmail ? formatEmailInput(item.contactPersonEmail) : "",
      address: item.address ?? "",
      note: item.note ?? "",
      defaultPaymentTermDays: item.defaultPaymentTermDays != null ? String(item.defaultPaymentTermDays) : "",
      creditLimit: item.creditLimit != null ? formatCurrencyDisplay(item.creditLimit) : "",
      isCustomer: item.isCustomer,
      isSupplier: item.isSupplier,
      isCarrier: item.isCarrier,
      isActive: item.isActive,
      trackingUrlTemplate: item.carrierProfile?.trackingUrlTemplate ?? "",
      externalCodeTrendyol: item.carrierProfile?.externalCodeTrendyol ? String(item.carrierProfile.externalCodeTrendyol) : "",
      externalCodePazarama: item.carrierProfile?.externalCodePazarama ?? "",
      externalCodeHepsiburada: item.carrierProfile?.externalCodeHepsiburada ?? "",
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
    setPhotoPreviewOpen(false);
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/cari", { method: "GET" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.operationFailed);
    }

    const payload = (await response.json()) as { items: AdminCariItem[] };
    setCariItems(payload.items);
  }

  async function uploadPhoto() {
    if (!photoFile) {
      return;
    }

    setPhotoUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      if (form.slug.trim()) {
        formData.append("slug", form.slug.trim());
      }

      const response = await fetch("/api/admin/uploads/cari-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.photoUploadFailed);
        return;
      }

      const payload = (await response.json()) as { item?: { url?: string } };
      const uploadedUrl = payload.item?.url;

      if (!uploadedUrl) {
        setError(labels.photoUploadFailed);
        return;
      }

      setForm((prev) => ({ ...prev, photoUrl: uploadedUrl }));
      setPhotoFile(null);
      if (photoFileInputRef.current) {
        photoFileInputRef.current.value = "";
      }
    } catch {
      setError(labels.photoUploadFailed);
    } finally {
      setPhotoUploading(false);
    }
  }

  function removePhoto() {
    setForm((prev) => ({ ...prev, photoUrl: "" }));
    setPhotoFile(null);
    setPhotoPreviewOpen(false);
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = "";
    }
  }

  async function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedSlug = form.slug.trim().toLocaleLowerCase("tr-TR");
    const hasDuplicateSlug = cariItems.some((item) => (
      item.id !== editingId && item.slug.trim().toLocaleLowerCase("tr-TR") === normalizedSlug
    ));

    if (hasDuplicateSlug) {
      setError(labels.duplicateSlug);
      return;
    }

    if (!form.isCustomer && !form.isSupplier && !form.isCarrier) {
      setError(labels.roleRequired);
      return;
    }

    if (form.taxNumber.trim() && taxIdentifierResolution.status !== "valid") {
      setError(labels.invalidTaxIdentifier);
      return;
    }

    if (form.iban.trim() && !isValidIban(form.iban)) {
      setError(labels.invalidIban);
      return;
    }

    setPending(true);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/cari/${editingId}` : "/api/admin/cari", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxOffice: showTaxOfficeField ? form.taxOffice : null,
          defaultPaymentTermDays: form.defaultPaymentTermDays.trim() ? Number(form.defaultPaymentTermDays) : null,
          creditLimit: form.creditLimit.trim() ? parseCurrencyValue(form.creditLimit) : null,
          externalCodeTrendyol: form.externalCodeTrendyol.trim() ? Number(form.externalCodeTrendyol) : null,
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

  async function deleteItem(item: AdminCariItem) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/cari/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      await refreshItems();
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

        <div className="mb-4 flex flex-wrap gap-2">
          {roleFilters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRoleFilter(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                roleFilter === option.value
                  ? "border-[color:var(--color-text)] bg-[color:var(--color-text)] text-[color:var(--color-surface)]"
                  : "border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

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
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_170px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.name}</span>
            <span>{labels.slug}</span>
            <span>{labels.roleLabel}</span>
            <span>{labels.email}</span>
            <span>{labels.taxIdentifierLabel}</span>
            <span>{labels.status}</span>
            <span className="text-right">{labels.edit}</span>
          </div>

          {filteredItems.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {filteredItems.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_120px_170px] lg:items-start">
                  <div>
                    <h3 className="font-medium text-[color:var(--color-text)]">{item.name}</h3>
                    {item.address ? <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{item.address}</p> : null}
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.slug}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{roleBadges(item)}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.email ?? "-"}</p>
                  <p className="flex items-center gap-1.5 text-sm text-[color:var(--color-text-muted)]">
                    {item.taxNumber ? (
                      <>
                        {taxIdentifierBadgeLabel(item) ? (
                          <Badge variant="secondary" className="shrink-0">{taxIdentifierBadgeLabel(item)}</Badge>
                        ) : null}
                        {item.taxNumber}
                      </>
                    ) : (
                      "-"
                    )}
                  </p>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{item.isActive ? labels.filterActive : labels.filterPassive}</p>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => openEditDrawer(item)}>
                      {labels.edit}
                    </Button>
                    {canDelete ? (
                      <ConfirmDeleteButton
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onConfirm={() => deleteItem(item)}
                        title={labels.deleteConfirmTitle}
                        description={labels.deleteConfirmDescription}
                        confirmLabel={labels.delete}
                        cancelLabel={labels.cancel}
                      >
                        {labels.delete}
                      </ConfirmDeleteButton>
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
              {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
              <div className="grid gap-2">
                <Label>{labels.roleLabel}</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={form.isCustomer}
                      onChange={(event) => setForm((prev) => ({ ...prev, isCustomer: event.target.checked }))}
                    />
                    {labels.roleCustomer}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={form.isSupplier}
                      onChange={(event) => setForm((prev) => ({ ...prev, isSupplier: event.target.checked }))}
                    />
                    {labels.roleSupplier}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={form.isCarrier}
                      onChange={(event) => setForm((prev) => ({ ...prev, isCarrier: event.target.checked }))}
                    />
                    {labels.roleCarrier}
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.slug}</Label>
                <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.name}</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>{labels.photo}</Label>
                <div className="flex items-center gap-3">
                  {form.photoUrl ? (
                    <button type="button" onClick={() => setPhotoPreviewOpen(true)} aria-label={labels.photo}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photoUrl} alt="" className="h-16 w-16 cursor-zoom-in rounded-lg border border-[color:var(--color-border)] object-cover transition hover:opacity-80" />
                    </button>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border)] text-xs text-[color:var(--color-text-muted)]">
                      {labels.photo}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="secondary" disabled={!photoFile || photoUploading} onClick={uploadPhoto}>
                        {photoUploading ? labels.uploadingPhoto : labels.uploadPhoto}
                      </Button>
                      {form.photoUrl ? (
                        <Button type="button" size="sm" variant="outline" onClick={removePhoto}>
                          {labels.removePhoto}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.email}</Label>
                <Input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="ornek@firma.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: formatEmailInput(event.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.phone}</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(5XX) XXX XX XX"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: formatPhoneNumber(event.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{taxNumberLabel}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={11}
                  value={form.taxNumber}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
                    const resolution = resolveTaxIdentifier(digits);
                    setForm((prev) => ({
                      ...prev,
                      taxNumber: digits,
                      taxOffice: resolution.status === "valid" && resolution.type === "vkn" ? prev.taxOffice : "",
                    }));
                  }}
                />
              </div>
              {showTaxOfficeField ? (
                <div className="grid gap-2">
                  <Label>{labels.taxOffice}</Label>
                  <Input value={form.taxOffice} onChange={(event) => setForm((prev) => ({ ...prev, taxOffice: event.target.value }))} />
                </div>
              ) : null}
              <p className="mt-2 border-t border-[color:var(--color-border)] pt-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
                {labels.bankSectionTitle}
              </p>
              <div className="grid gap-2">
                <Label>{labels.iban}</Label>
                <Input
                  inputMode="text"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={form.iban}
                  onChange={(event) => setForm((prev) => ({ ...prev, iban: formatIbanInput(event.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.bankName}</Label>
                <Input value={form.bankName} onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.bankAccountHolder}</Label>
                <Input value={form.bankAccountHolder} onChange={(event) => setForm((prev) => ({ ...prev, bankAccountHolder: event.target.value }))} />
              </div>
              <p className="mt-2 border-t border-[color:var(--color-border)] pt-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
                {labels.contactPersonSectionTitle}
              </p>
              <div className="grid gap-2">
                <Label>{labels.contactPersonName}</Label>
                <Input value={form.contactPersonName} onChange={(event) => setForm((prev) => ({ ...prev, contactPersonName: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.contactPersonPhone}</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(5XX) XXX XX XX"
                  value={form.contactPersonPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactPersonPhone: formatPhoneNumber(event.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.contactPersonEmail}</Label>
                <Input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="ornek@firma.com"
                  value={form.contactPersonEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactPersonEmail: formatEmailInput(event.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.address}</Label>
                <Textarea value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.defaultPaymentTermDays}</Label>
                <Input
                  inputMode="numeric"
                  value={form.defaultPaymentTermDays}
                  onChange={(event) => setForm((prev) => ({ ...prev, defaultPaymentTermDays: event.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.creditLimit}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-[color:var(--color-text-muted)]">₺</span>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    className="pl-8"
                    value={form.creditLimit}
                    onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: formatCurrencyInput(event.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.note}</Label>
                <Textarea value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} rows={4} />
              </div>

              {form.isCarrier ? (
                <>
                  <p className="mt-2 border-t border-[color:var(--color-border)] pt-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
                    {labels.carrierSectionTitle}
                  </p>
                  <div className="grid gap-2">
                    <Label>{labels.trackingUrlTemplate}</Label>
                    <Input
                      value={form.trackingUrlTemplate}
                      onChange={(event) => setForm((prev) => ({ ...prev, trackingUrlTemplate: event.target.value }))}
                      placeholder="https://kargo.example.com/takip?kod={trackingNumber}"
                    />
                    <p className="text-xs text-[color:var(--color-text-muted)]">{labels.trackingUrlTemplateHint}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.trendyolId}</Label>
                    <Input type="number" min={1} value={form.externalCodeTrendyol} onChange={(event) => setForm((prev) => ({ ...prev, externalCodeTrendyol: event.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.pazaramaId}</Label>
                    <Input value={form.externalCodePazarama} onChange={(event) => setForm((prev) => ({ ...prev, externalCodePazarama: event.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.hepsiburadaId}</Label>
                    <Input value={form.externalCodeHepsiburada} onChange={(event) => setForm((prev) => ({ ...prev, externalCodeHepsiburada: event.target.value }))} />
                  </div>
                </>
              ) : null}

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

      {photoPreviewOpen && form.photoUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" onClick={() => setPhotoPreviewOpen(false)}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-6 top-6 text-white hover:text-white"
            onClick={() => setPhotoPreviewOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.photoUrl}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
