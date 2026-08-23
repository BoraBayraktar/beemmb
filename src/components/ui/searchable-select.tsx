"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string | null;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  /**
   * Sağlanırsa filtreleme bu component içinde (client-side) yapılmaz —
   * arama metni burada çağrılır ve `options` listesinin çağıran tarafından
   * (örn. debounce'lu bir API isteğiyle) güncellenmesi beklenir.
   */
  onSearchChange?: (query: string) => void;
  /** onSearchChange sağlandığında sunucu tarafı sonuçlar yüklenirken gösterilir. */
  loading?: boolean;
  loadingLabel?: string;
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  onSearchChange,
  loading = false,
  loadingLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isServerFiltered = Boolean(onSearchChange);

  const selected = options.find((item) => item.value === value) ?? null;
  const filteredOptions = useMemo(() => {
    if (isServerFiltered) {
      return options;
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((item) =>
      item.label.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
      || item.description?.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
    );
  }, [options, query, isServerFiltered]);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    onSearchChange?.(nextQuery);
  }

  function handleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        onSearchChange?.(query);
      }
      return next;
    });
  }

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointer);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-neutral-300 bg-white px-3 text-left text-sm text-neutral-950"
      >
        <span className={selected ? "text-neutral-950" : "text-neutral-400"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-xs text-neutral-400">Sec</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
          <Input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10"
            autoFocus
          />
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {loading ? (
              <p className="px-2 py-3 text-sm text-neutral-500">{loadingLabel ?? emptyLabel}</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-neutral-500">{emptyLabel}</p>
            ) : filteredOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onValueChange(item.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-neutral-100"
              >
                <span className="text-sm font-medium text-neutral-950">{item.label}</span>
                {item.description ? (
                  <span className="text-xs text-neutral-500">{item.description}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
