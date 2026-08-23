"use client";

import * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";

import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<NumericFormatProps, "value" | "onValueChange" | "customInput" | "getInputRef"> & {
  /** Ondalık nokta olmadan ham sayısal metin, örn. "1234.5" ya da boş string. */
  value: string | number;
  /** Ham sayısal metni ("1234.5" biçiminde) döndürür — form state bu değeri saklamalı. */
  onValueChange: (value: string) => void;
  currencySymbol?: string;
};

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, currencySymbol = "₺", className, ...props }, ref) => (
    <NumericFormat
      getInputRef={ref}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      allowNegative={false}
      prefix={currencySymbol ? `${currencySymbol} ` : undefined}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 px-4 py-2 text-sm text-[color:var(--color-text)] outline-none transition placeholder:text-[color:var(--color-text-muted)]/70 focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/15",
        className,
      )}
      {...props}
    />
  ),
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
