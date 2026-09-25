"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VariantBulkPriceField, VariantBulkPriceMode } from "@/ui/admin/product-variant-bulk";

export type VariantBulkDialogMode = "price" | "stock" | "delete";

export type VariantBulkDialogLabels = {
  cancel: string;
  variantPriceOverride: string;
  variantPurchasePriceOverride: string;
  variantCompareAtPriceOverride: string;
  variantBulkSelectedCount: string;
  variantBulkPriceTitle: string;
  variantBulkPriceField: string;
  variantBulkPriceMode: string;
  variantBulkPriceModeSet: string;
  variantBulkPriceModePercent: string;
  variantBulkPriceModeAmount: string;
  variantBulkPriceModeClear: string;
  variantBulkPriceModePercentHint: string;
  variantBulkPriceModeAmountHint: string;
  variantBulkPriceModeClearHint: string;
  variantBulkValue: string;
  variantBulkStockTitle: string;
  variantBulkStockHint: string;
  variantBulkDeleteTitle: string;
  variantBulkDeleteHint: string;
  variantBulkDeleteConfirm: string;
  variantBulkApply: string;
  variantBulkInvalidValue: string;
};

type ProductVariantBulkDialogProps = {
  mode: VariantBulkDialogMode | null;
  selectedCount: number;
  labels: VariantBulkDialogLabels;
  onClose: () => void;
  onApplyPrice: (args: { field: VariantBulkPriceField; mode: VariantBulkPriceMode; value: number }) => void;
  onApplyStock: (stock: number) => void;
  onConfirmDelete: () => void;
};

/**
 * Toplu fiyat/stok/silme onayi. Her acilista temiz state icin cagiran taraf
 * `key` ile yeniden mount eder.
 */
export function ProductVariantBulkDialog({
  mode,
  selectedCount,
  labels,
  onClose,
  onApplyPrice,
  onApplyStock,
  onConfirmDelete,
}: ProductVariantBulkDialogProps) {
  const [priceField, setPriceField] = useState<VariantBulkPriceField>("priceOverride");
  const [priceMode, setPriceMode] = useState<VariantBulkPriceMode>("set");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedSummary = `${selectedCount} ${labels.variantBulkSelectedCount}`;
  const priceModeHint = priceMode === "percent"
    ? labels.variantBulkPriceModePercentHint
    : priceMode === "amount"
      ? labels.variantBulkPriceModeAmountHint
      : priceMode === "clear"
        ? labels.variantBulkPriceModeClearHint
        : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Dialog portal ile render edilse de React olaylari bilesen agacinda kabarcik
    // yapar; durdurulmazsa drawer'daki urun formunun submit'i (Kaydet) tetiklenir.
    event.stopPropagation();

    if (mode === "delete") {
      onConfirmDelete();
      return;
    }

    if (mode === "price") {
      if (priceMode === "clear") {
        onApplyPrice({ field: priceField, mode: priceMode, value: 0 });
        return;
      }

      const numeric = Number(value.replace(",", "."));
      const invalid = !value.trim()
        || !Number.isFinite(numeric)
        || (priceMode === "set" && numeric < 0)
        || (priceMode === "percent" && numeric <= -100);
      if (invalid) {
        setError(labels.variantBulkInvalidValue);
        return;
      }
      onApplyPrice({ field: priceField, mode: priceMode, value: numeric });
      return;
    }

    if (mode === "stock") {
      const numeric = Number(value);
      if (!value.trim() || !Number.isInteger(numeric) || numeric < 0) {
        setError(labels.variantBulkInvalidValue);
        return;
      }
      onApplyStock(numeric);
    }
  }

  const title = mode === "price"
    ? labels.variantBulkPriceTitle
    : mode === "stock"
      ? labels.variantBulkStockTitle
      : labels.variantBulkDeleteTitle;

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{selectedSummary}</DialogDescription>
          </DialogHeader>

          {mode === "price" ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>{labels.variantBulkPriceField}</Label>
                <Select value={priceField} onValueChange={(next) => setPriceField(next as VariantBulkPriceField)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priceOverride">{labels.variantPriceOverride}</SelectItem>
                    <SelectItem value="purchasePriceOverride">{labels.variantPurchasePriceOverride}</SelectItem>
                    <SelectItem value="compareAtPriceOverride">{labels.variantCompareAtPriceOverride}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{labels.variantBulkPriceMode}</Label>
                <Select
                  value={priceMode}
                  onValueChange={(next) => {
                    setPriceMode(next as VariantBulkPriceMode);
                    setError(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">{labels.variantBulkPriceModeSet}</SelectItem>
                    <SelectItem value="percent">{labels.variantBulkPriceModePercent}</SelectItem>
                    <SelectItem value="amount">{labels.variantBulkPriceModeAmount}</SelectItem>
                    <SelectItem value="clear">{labels.variantBulkPriceModeClear}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {priceMode !== "clear" ? (
                <div className="grid gap-2">
                  <Label htmlFor="variant-bulk-price-value">{labels.variantBulkValue}</Label>
                  <Input
                    id="variant-bulk-price-value"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={priceMode === "set" ? "0" : undefined}
                    value={value}
                    onChange={(event) => {
                      setValue(event.target.value);
                      setError(null);
                    }}
                    autoFocus
                  />
                </div>
              ) : null}
              {priceModeHint ? <p className="text-xs text-[color:var(--color-text-muted)]">{priceModeHint}</p> : null}
            </div>
          ) : null}

          {mode === "stock" ? (
            <div className="grid gap-2">
              <Label htmlFor="variant-bulk-stock-value">{labels.variantBulkValue}</Label>
              <Input
                id="variant-bulk-stock-value"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
                autoFocus
              />
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{labels.variantBulkStockHint}</p>
            </div>
          ) : null}

          {mode === "delete" ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.variantBulkDeleteHint}</p>
          ) : null}

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button type="submit" variant={mode === "delete" ? "destructive" : "default"}>
              {mode === "delete" ? labels.variantBulkDeleteConfirm : labels.variantBulkApply}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
