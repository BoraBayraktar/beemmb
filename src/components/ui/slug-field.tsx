"use client";

import { useState } from "react";

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
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
      >
        <span className="truncate">
          {label}: {urlPrefix ?? ""}
          {value.trim() || notSpecifiedLabel}
        </span>
        <span className="shrink-0 font-medium underline underline-offset-4">{editLabel}</span>
      </button>
    );
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
