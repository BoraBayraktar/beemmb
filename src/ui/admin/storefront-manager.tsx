"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StorefrontItem = {
  id: string;
  section: "HOME_CAMPAIGN" | "HOME_FEATURE";
  variant: "accent" | "soft" | "dark" | "default";
  targetType: "PRODUCT" | "CATEGORY" | null;
  productId: string | null;
  categoryId: string | null;
  productName: string | null;
  categoryName: string | null;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type Labels = {
  title: string;
  createTitle: string;
  edit: string;
  itemTitle: string;
  itemDescription: string;
  section: string;
  variant: string;
  targetType: string;
  targetProduct: string;
  targetCategory: string;
  selectProduct: string;
  selectCategory: string;
  order: string;
  startAt: string;
  endAt: string;
  noDateWindow: string;
  create: string;
  save: string;
  cancel: string;
  delete: string;
  campaigns: string;
  features: string;
  accent: string;
  soft: string;
  dark: string;
  defaultVariant: string;
  validationRequired: string;
  validationTarget: string;
  validationOrder: string;
  validationDateRange: string;
  operationFailed: string;
  loading: string;
  sectionCampaign: string;
  sectionFeature: string;
  variantAccent: string;
  variantSoft: string;
  variantDark: string;
  variantDefault: string;
};

type Props = {
  items: StorefrontItem[];
  productOptions: ProductOption[];
  categoryOptions: CategoryOption[];
  labels: Labels;
  canDelete: boolean;
};

type FormState = {
  section: StorefrontItem["section"];
  variant: StorefrontItem["variant"];
  targetType: "PRODUCT" | "CATEGORY";
  productId: string;
  categoryId: string;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
};

type DrawerMode = "create" | "edit";

const emptyForm: FormState = {
  section: "HOME_CAMPAIGN",
  variant: "accent",
  targetType: "PRODUCT",
  productId: "",
  categoryId: "",
  titleTr: "",
  titleEn: "",
  descriptionTr: "",
  descriptionEn: "",
  sortOrder: "1",
  startsAt: "",
  endsAt: "",
};

function toDateTimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocalInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatWindowDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSectionLabel(section: StorefrontItem["section"], labels: Labels) {
  return section === "HOME_CAMPAIGN" ? labels.sectionCampaign : labels.sectionFeature;
}

function getVariantLabel(variant: StorefrontItem["variant"], labels: Labels) {
  if (variant === "accent") return labels.variantAccent;
  if (variant === "soft") return labels.variantSoft;
  if (variant === "dark") return labels.variantDark;
  return labels.variantDefault;
}

export function StorefrontManager({ items, productOptions, categoryOptions, labels, canDelete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;

  function validate(form: FormState) {
    if (!form.titleTr.trim() || !form.descriptionTr.trim()) {
      return labels.validationRequired;
    }

    if (form.targetType === "PRODUCT" && !form.productId) {
      return labels.validationTarget;
    }

    if (form.targetType === "CATEGORY" && !form.categoryId) {
      return labels.validationTarget;
    }

    if (form.startsAt && form.endsAt && new Date(form.endsAt).getTime() < new Date(form.startsAt).getTime()) {
      return labels.validationDateRange;
    }

    const order = Number(form.sortOrder);
    if (Number.isNaN(order) || order < 1) {
      return labels.validationOrder;
    }

    return null;
  }

  function mapPayload(form: FormState) {
    return {
      section: form.section,
      variant: form.variant,
      targetType: form.targetType,
      productId: form.targetType === "PRODUCT" ? form.productId : null,
      categoryId: form.targetType === "CATEGORY" ? form.categoryId : null,
      titleTr: form.titleTr,
      titleEn: form.titleTr,
      descriptionTr: form.descriptionTr,
      descriptionEn: form.descriptionTr,
      sortOrder: Number(form.sortOrder),
      startsAt: fromDateTimeLocalInput(form.startsAt),
      endsAt: fromDateTimeLocalInput(form.endsAt),
    };
  }

  function patchActiveField(field: keyof FormState, value: string) {
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

  function openEditDrawer(item: StorefrontItem) {
    setError(null);
    setEditingId(item.id);
    setEditForm({
      section: item.section,
      variant: item.variant,
      targetType: item.targetType ?? "PRODUCT",
      productId: item.productId ?? "",
      categoryId: item.categoryId ?? "",
      titleTr: item.titleTr,
      titleEn: item.titleTr,
      descriptionTr: item.descriptionTr,
      descriptionEn: item.descriptionTr,
      sortOrder: String(item.sortOrder),
      startsAt: toDateTimeLocalInput(item.startsAt),
      endsAt: toDateTimeLocalInput(item.endsAt),
    });
    setDrawerMode("edit");
  }

  function closeDrawer() {
    if (loading) return;
    setDrawerMode(null);
    setEditingId(null);
    setError(null);
  }

  async function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = drawerMode === "edit" ? editForm : createForm;
    const validationError = validate(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/storefront/items/${editingId}` : "/api/admin/storefront/items", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapPayload(form)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      setCreateForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
      router.refresh();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/storefront/items/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      router.refresh();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Storefront</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.title}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{items.length} Vitrin öğesi yönetiliyor</p>
        </div>
        <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[color:var(--color-border)] p-4 transition-colors hover:border-[color:var(--color-border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
                    {getSectionLabel(item.section, labels)} / {getVariantLabel(item.variant, labels)}
                  </p>
                  <h3 className="mt-2 font-medium text-[color:var(--color-text)]">{item.titleTr}</h3>
                  <p className="mt-1 text-xs font-medium text-[color:var(--color-text-muted)]">
                    {item.targetType === "CATEGORY" ? labels.targetCategory : labels.targetProduct}: {item.categoryName ?? item.productName ?? labels.selectProduct}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                    {labels.startAt}: {formatWindowDate(item.startsAt, "tr") ?? labels.noDateWindow} • {labels.endAt}: {formatWindowDate(item.endsAt, "tr") ?? labels.noDateWindow}
                  </p>
                </div>
                <span className="rounded-full bg-[color:var(--color-bg-soft)] px-2 py-1 text-xs font-medium text-[color:var(--color-text-muted)]">#{item.sortOrder}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[color:var(--color-text-muted)]">{item.descriptionTr}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => openEditDrawer(item)}>
                  {labels.edit}
                </Button>
                {canDelete ? (
                  <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={() => deleteItem(item.id)}>
                    {labels.delete}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Storefront</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitItem}>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{labels.section}</Label>
                  <Select value={activeForm.section} onValueChange={(value) => patchActiveField("section", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOME_CAMPAIGN">{labels.campaigns}</SelectItem>
                      <SelectItem value="HOME_FEATURE">{labels.features}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{labels.variant}</Label>
                  <Select value={activeForm.variant} onValueChange={(value) => patchActiveField("variant", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accent">{labels.accent}</SelectItem>
                      <SelectItem value="soft">{labels.soft}</SelectItem>
                      <SelectItem value="dark">{labels.dark}</SelectItem>
                      <SelectItem value="default">{labels.defaultVariant}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{labels.targetType}</Label>
                  <Select value={activeForm.targetType} onValueChange={(value) => patchActiveField("targetType", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCT">{labels.targetProduct}</SelectItem>
                      <SelectItem value="CATEGORY">{labels.targetCategory}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{activeForm.targetType === "CATEGORY" ? labels.selectCategory : labels.selectProduct}</Label>
                  {activeForm.targetType === "CATEGORY" ? (
                    <Select value={activeForm.categoryId} onValueChange={(value) => patchActiveField("categoryId", value)}>
                      <SelectTrigger><SelectValue placeholder={labels.selectCategory} /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={activeForm.productId} onValueChange={(value) => patchActiveField("productId", value)}>
                      <SelectTrigger><SelectValue placeholder={labels.selectProduct} /></SelectTrigger>
                      <SelectContent>
                        {productOptions.map((product) => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label>{labels.itemTitle}</Label>
                  <Input value={activeForm.titleTr} onChange={(event) => patchActiveField("titleTr", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{labels.itemDescription}</Label>
                <Textarea value={activeForm.descriptionTr} onChange={(event) => patchActiveField("descriptionTr", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{labels.order}</Label>
                <Input type="number" min="1" value={activeForm.sortOrder} onChange={(event) => patchActiveField("sortOrder", event.target.value)} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{labels.startAt}</Label>
                  <Input type="datetime-local" value={activeForm.startsAt} onChange={(event) => patchActiveField("startsAt", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.endAt}</Label>
                  <Input type="datetime-local" value={activeForm.endsAt} onChange={(event) => patchActiveField("endsAt", event.target.value)} />
                </div>
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
