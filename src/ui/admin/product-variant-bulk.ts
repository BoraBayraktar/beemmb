/**
 * Varyant listesindeki toplu islemlerin saf hesaplari. Hepsi yalnizca drawer'daki
 * local draft'i donusturur; DB'ye yazim mevcut Kaydet akisiyla olur.
 */

export type VariantBulkPriceField = "priceOverride" | "purchasePriceOverride" | "compareAtPriceOverride";
export type VariantBulkPriceMode = "set" | "percent" | "amount" | "clear";

type BulkEditableVariant = {
  priceOverride: string;
  purchasePriceOverride: string;
  compareAtPriceOverride: string;
  stockOverride: string;
  salesEnabled: boolean;
  isDefault: boolean;
};

export type VariantBulkResult<T> = {
  variants: T[];
  updatedCount: number;
  skippedCount: number;
};

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Yuzde/tutar modunda baz, varyantin kendi override'i; yoksa urun seviyesindeki
 * fiyattir (varyant o fiyati miras aldigi icin). Baz yoksa varyant atlanir.
 */
export function applyVariantBulkPrice<T extends BulkEditableVariant>(args: {
  variants: T[];
  selectedIndexes: ReadonlySet<number>;
  field: VariantBulkPriceField;
  mode: VariantBulkPriceMode;
  value: number;
  productFallbackPrice: string;
}): VariantBulkResult<T> {
  const fallback = parseOptionalNumber(args.productFallbackPrice);
  let updatedCount = 0;
  let skippedCount = 0;

  const variants = args.variants.map((variant, index) => {
    if (!args.selectedIndexes.has(index)) {
      return variant;
    }

    if (args.mode === "clear") {
      updatedCount += 1;
      return { ...variant, [args.field]: "" };
    }

    if (args.mode === "set") {
      updatedCount += 1;
      return { ...variant, [args.field]: String(roundPrice(args.value)) };
    }

    const base = parseOptionalNumber(variant[args.field]) ?? fallback;
    if (base === null) {
      skippedCount += 1;
      return variant;
    }

    const next = args.mode === "percent" ? base * (1 + args.value / 100) : base + args.value;
    updatedCount += 1;
    return { ...variant, [args.field]: String(Math.max(0, roundPrice(next))) };
  });

  return { variants, updatedCount, skippedCount };
}

export function applyVariantBulkStock<T extends BulkEditableVariant>(
  variants: T[],
  selectedIndexes: ReadonlySet<number>,
  stock: number,
): VariantBulkResult<T> {
  return {
    variants: variants.map((variant, index) => (selectedIndexes.has(index) ? { ...variant, stockOverride: String(stock) } : variant)),
    updatedCount: selectedIndexes.size,
    skippedCount: 0,
  };
}

export function applyVariantBulkSales<T extends BulkEditableVariant>(
  variants: T[],
  selectedIndexes: ReadonlySet<number>,
  salesEnabled: boolean,
): VariantBulkResult<T> {
  return {
    variants: variants.map((variant, index) => (selectedIndexes.has(index) ? { ...variant, salesEnabled } : variant)),
    updatedCount: selectedIndexes.size,
    skippedCount: 0,
  };
}

/**
 * Varsayilan varyant silinirse kalan ilk varyant varsayilan olur; urunun
 * varsayilansiz kalmasi magaza tarafinda ilk secimi belirsizlestirir.
 */
export function removeVariantsBulk<T extends BulkEditableVariant & { sortOrder: string }>(
  variants: T[],
  selectedIndexes: ReadonlySet<number>,
): VariantBulkResult<T> {
  const removedDefault = variants.some((variant, index) => selectedIndexes.has(index) && variant.isDefault);
  const remaining = variants
    .filter((_, index) => !selectedIndexes.has(index))
    .map((variant, index) => ({ ...variant, sortOrder: String(index) }));

  if (removedDefault && remaining.length > 0 && !remaining.some((variant) => variant.isDefault)) {
    remaining[0] = { ...remaining[0], isDefault: true };
  }

  return { variants: remaining, updatedCount: variants.length - remaining.length, skippedCount: 0 };
}
