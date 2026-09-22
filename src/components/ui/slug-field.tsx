"use client";

import { useState } from "react";
import { Link2, Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Örn. "urun/" -- verilirse önizlemede "urun/{slug}" olarak gösterilir. */
  urlPrefix?: string;
  editLabel: string;
  notSpecifiedLabel: string;
  /** true ise doğrudan düzenlenebilir alan gösterilir (örn. slug hâlâ boşsa). */
  startExpanded?: boolean;
};

/**
 * İsimden otomatik türetilen slug alanları için: varsayılan olarak sadece
 * kompakt bir önizleme + "düzenle" bağlantısı gösterir, tam giriş alanı
 * sadece kullanıcı isteyince (SEO/özel URL ihtiyacı gibi) açılır. Bu sayede
 * slug formda her zaman görünen bir alan olmaktan çıkıp "teknik detay"
 * katmanına iner, ama tamamen kaybolmaz.
 */
export function SlugField({
  value,
  onChange,
  label,
  urlPrefix,
  editLabel,
  notSpecifiedLabel,
  startExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(startExpanded || !value.trim());

  if (!expanded) {
    return (
      <div className="grid min-w-0 gap-2">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={editLabel}
          aria-label={editLabel}
          className="flex h-11 w-full min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 text-left transition hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-surface)]"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-text-muted)]" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-[color:var(--color-text-muted)]">
            {urlPrefix ?? ""}
            {value.trim() || notSpecifiedLabel}
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} autoFocus />
    </div>
  );
}
