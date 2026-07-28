"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminFinanceReportDetail } from "@/modules/finance/contracts/reports.contract";

type Labels = {
  primaryValue: string;
  secondaryValue: string;
};

type Props = {
  report: AdminFinanceReportDetail;
  labels: Labels;
  serverExportHref?: string;
  exportCsvLabel?: string;
};

function formatMetricValue(value: number, currency?: string) {
  if (!currency) {
    return value.toLocaleString("tr-TR");
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveToneClass(tone: "neutral" | "success" | "warning") {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-neutral-200 bg-white text-neutral-950";
}

export function FinanceReportDetailManager({ report, labels, serverExportHref, exportCsvLabel }: Props) {
  const reportTable = report.table ?? null;
  const [tableQuery, setTableQuery] = useState("");
  const [activeColumnKey, setActiveColumnKey] = useState<string>("all");
  const [exactFilterColumnKey, setExactFilterColumnKey] = useState<string>("all");
  const [exactFilterValue, setExactFilterValue] = useState<string>("all");
  const [rangeFilterColumnKey, setRangeFilterColumnKey] = useState<string>("all");
  const [rangeMinValue, setRangeMinValue] = useState("");
  const [rangeMaxValue, setRangeMaxValue] = useState("");
  const [dateStartValue, setDateStartValue] = useState("");
  const [dateEndValue, setDateEndValue] = useState("");
  const [sortKey, setSortKey] = useState<string>("default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const normalizedQuery = tableQuery.trim().toLocaleLowerCase("tr-TR");

  const rangeFilterColumn = reportTable?.columns.find((column) => column.key === rangeFilterColumnKey) ?? null;
  const rangeFilterMode = useMemo<"none" | "date" | "number">(() => {
    if (!reportTable || !rangeFilterColumn || rangeFilterColumnKey === "all") {
      return "none";
    }

    const samples = reportTable.rows
      .map((row) => (row.cells[rangeFilterColumnKey] ?? "").trim())
      .filter((value) => value.length > 0)
      .slice(0, 8);

    if (samples.length === 0) {
      return "none";
    }

    const normalizedSamples = samples.map((value) => value.toLocaleLowerCase("tr-TR"));
    const dateLikeCount = normalizedSamples.filter((value) => (
      value.includes("oca")
      || value.includes("şub")
      || value.includes("mar")
      || value.includes("nis")
      || value.includes("may")
      || value.includes("haz")
      || value.includes("tem")
      || value.includes("ağu")
      || value.includes("eyl")
      || value.includes("eki")
      || value.includes("kas")
      || value.includes("ara")
    )).length;

    if (dateLikeCount >= Math.max(1, Math.floor(samples.length / 2))) {
      return "date";
    }

    return "number";
  }, [rangeFilterColumn, rangeFilterColumnKey, reportTable]);

  const exactFilterOptions = useMemo(() => {
    if (!reportTable || exactFilterColumnKey === "all") {
      return [];
    }

    return Array.from(new Set(
      reportTable.rows
        .map((row) => row.cells[exactFilterColumnKey] ?? "")
        .filter((value) => value.trim().length > 0),
    )).sort((left, right) => left.localeCompare(right, "tr"));
  }, [exactFilterColumnKey, reportTable]);
  const filteredTableRows = useMemo(() => {
    if (!reportTable) {
      return [];
    }

    const exactFilteredRows = exactFilterColumnKey !== "all" && exactFilterValue !== "all"
      ? reportTable.rows.filter((row) => (row.cells[exactFilterColumnKey] ?? "") === exactFilterValue)
      : reportTable.rows;

    const rangeFilteredRows = rangeFilterColumnKey === "all" || !rangeFilterColumn
      ? exactFilteredRows
      : exactFilteredRows.filter((row) => {
          const rawValue = (row.cells[rangeFilterColumnKey] ?? "").trim();
          if (!rawValue) {
            return true;
          }

          if (rangeFilterMode === "date") {
            const parsedDate = Date.parse(rawValue);
            if (Number.isNaN(parsedDate)) {
              return true;
            }

            const startMs = dateStartValue ? Date.parse(`${dateStartValue}T00:00:00`) : null;
            const endMs = dateEndValue ? Date.parse(`${dateEndValue}T23:59:59`) : null;

            if (startMs !== null && parsedDate < startMs) {
              return false;
            }

            if (endMs !== null && parsedDate > endMs) {
              return false;
            }

            return true;
          }

          if (rangeFilterMode === "number") {
            const parsedNumber = Number(rawValue.replaceAll(".", "").replace(",", ".").replace(/[^\d.-]/g, ""));
            if (!Number.isFinite(parsedNumber)) {
              return true;
            }

            const minNumber = rangeMinValue.trim() ? Number(rangeMinValue.replace(",", ".")) : null;
            const maxNumber = rangeMaxValue.trim() ? Number(rangeMaxValue.replace(",", ".")) : null;

            if (minNumber !== null && Number.isFinite(minNumber) && parsedNumber < minNumber) {
              return false;
            }

            if (maxNumber !== null && Number.isFinite(maxNumber) && parsedNumber > maxNumber) {
              return false;
            }

            return true;
          }

          return true;
        });

    const searchedRows = !normalizedQuery
      ? rangeFilteredRows
      : rangeFilteredRows.filter((row) => {
          if (activeColumnKey !== "all") {
            const scopedValue = row.cells[activeColumnKey] ?? "";
            return scopedValue.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
          }

          return Object.values(row.cells).some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery));
        });

    if (sortKey === "default") {
      return searchedRows;
    }

    return [...searchedRows].sort((left, right) => {
      const leftValue = (left.cells[sortKey] ?? "").trim();
      const rightValue = (right.cells[sortKey] ?? "").trim();
      const leftNumber = Number(leftValue.replaceAll(".", "").replace(",", ".").replace(/[^\d.-]/g, ""));
      const rightNumber = Number(rightValue.replaceAll(".", "").replace(",", ".").replace(/[^\d.-]/g, ""));

      const result = Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftValue !== "" && rightValue !== ""
        ? leftNumber - rightNumber
        : leftValue.localeCompare(rightValue, "tr");

      return sortDirection === "asc" ? result : -result;
    });
  }, [
    activeColumnKey,
    dateEndValue,
    dateStartValue,
    exactFilterColumnKey,
    exactFilterValue,
    normalizedQuery,
    rangeFilterColumn,
    rangeFilterColumnKey,
    rangeFilterMode,
    rangeMaxValue,
    rangeMinValue,
    reportTable,
    sortDirection,
    sortKey,
  ]);

  function escapeCsvValue(value: string) {
    if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
      return `"${value.replaceAll("\"", "\"\"")}"`;
    }

    return value;
  }

  function exportTableCsv() {
    if (!reportTable || filteredTableRows.length === 0) {
      return;
    }

    const header = reportTable.columns.map((column) => escapeCsvValue(column.label)).join(",");
    const rows = filteredTableRows.map((row) => (
      reportTable.columns.map((column) => escapeCsvValue(row.cells[column.key] ?? "-")).join(",")
    ));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = report.title.toLocaleLowerCase("tr-TR").replaceAll(/[^a-z0-9]+/g, "-");

    link.href = url;
    link.download = `${slug || "finans-raporu"}-detay.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950">{report.title}</h1>
          <p className="text-sm text-neutral-600">{report.description}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {report.metrics.map((metric) => (
          <article key={metric.label} className={`rounded-3xl border p-5 shadow-sm ${resolveToneClass(metric.tone)}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold">{formatMetricValue(metric.value, metric.currency)}</p>
            <p className="mt-2 text-sm opacity-80">{metric.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {report.rows.map((row) => {
            const content = (
              <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-neutral-950">{row.label}</h2>
                  <p className="text-sm text-neutral-600">{row.supportingText}</p>
                </div>
                <div className="flex flex-col gap-2 text-sm md:items-end">
                  <span className="font-medium text-neutral-950">
                    {labels.primaryValue}: {formatMetricValue(row.primaryValue, row.primaryCurrency)}
                  </span>
                  {row.secondaryValue !== undefined ? (
                    <span className="text-neutral-600">
                      {labels.secondaryValue}: {formatMetricValue(row.secondaryValue, row.secondaryCurrency)}
                    </span>
                  ) : null}
                </div>
              </div>
            );

            if (!row.href) {
              return <div key={row.id}>{content}</div>;
            }

            return (
              <Link key={row.id} href={row.href} className="block transition hover:-translate-y-0.5">
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      {reportTable && reportTable.rows.length > 0 ? (
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-neutral-950">{reportTable.title}</h2>
              <p className="text-sm text-neutral-600">{reportTable.description}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_auto]">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Metin Arama</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Aranacak alan</label>
                    <Select value={activeColumnKey} onValueChange={setActiveColumnKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Arama alanı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm kolonlarda ara</SelectItem>
                        {reportTable.columns.map((column) => (
                          <SelectItem key={`filter-${column.key}`} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Arama metni</label>
                    <Input
                      type="search"
                      value={tableQuery}
                      onChange={(event) => setTableQuery(event.target.value)}
                      placeholder="Ürün, varyant, SKU veya tedarikçi ara"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Kesin Filtre</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Filtre uygulanacak alan</label>
                    <Select
                      value={exactFilterColumnKey}
                      onValueChange={(value) => {
                        setExactFilterColumnKey(value);
                        setExactFilterValue("all");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filtre alanı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Filtre kullanma</SelectItem>
                        {reportTable.columns.map((column) => (
                          <SelectItem key={`exact-filter-${column.key}`} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">
                      {exactFilterColumnKey === "all"
                        ? "Önce filtre alanı seç"
                        : `"${reportTable.columns.find((column) => column.key === exactFilterColumnKey)?.label ?? "Alan"}" değeri`}
                    </label>
                    <Select
                      value={exactFilterValue}
                      onValueChange={setExactFilterValue}
                      disabled={exactFilterColumnKey === "all" || exactFilterOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kolon değeri" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm değerler</SelectItem>
                        {exactFilterOptions.map((option) => (
                          <SelectItem key={`exact-filter-value-${option}`} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Sıralama</p>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Sıralanacak alan</label>
                    <Select value={sortKey} onValueChange={setSortKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sıralama kolonu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Varsayılan sıra</SelectItem>
                        {reportTable.columns.map((column) => (
                          <SelectItem key={`sort-${column.key}`} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Sıra yönü</label>
                    <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as "asc" | "desc")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sıra yönü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Azalan</SelectItem>
                        <SelectItem value="asc">Artan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 xl:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Aralık Filtresi</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600">Aralık uygulanacak alan</label>
                    <Select
                      value={rangeFilterColumnKey}
                      onValueChange={(value) => {
                        setRangeFilterColumnKey(value);
                        setRangeMinValue("");
                        setRangeMaxValue("");
                        setDateStartValue("");
                        setDateEndValue("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aralık alanı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Aralık filtresi kullanma</SelectItem>
                        {reportTable.columns.map((column) => (
                          <SelectItem key={`range-filter-${column.key}`} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {rangeFilterMode === "date" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          {rangeFilterColumn?.label ?? "Tarih"} başlangıcı
                        </label>
                        <Input type="date" value={dateStartValue} onChange={(event) => setDateStartValue(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          {rangeFilterColumn?.label ?? "Tarih"} bitişi
                        </label>
                        <Input type="date" value={dateEndValue} onChange={(event) => setDateEndValue(event.target.value)} />
                      </div>
                    </div>
                  ) : rangeFilterMode === "number" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          {rangeFilterColumn?.label ?? "Tutar"} minimum
                        </label>
                        <Input type="number" inputMode="decimal" value={rangeMinValue} onChange={(event) => setRangeMinValue(event.target.value)} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          {rangeFilterColumn?.label ?? "Tutar"} maksimum
                        </label>
                        <Input type="number" inputMode="decimal" value={rangeMaxValue} onChange={(event) => setRangeMaxValue(event.target.value)} placeholder="0" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
                      Önce tarih veya sayısal bir kolon seç.
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  Görünen satır: {filteredTableRows.length}/{reportTable.rows.length}
                </p>
                {serverExportHref ? (
                  <Button asChild variant="outline" disabled={filteredTableRows.length === 0}>
                    <a href={serverExportHref}>
                      <Download className="mr-2 h-4 w-4" />
                      {exportCsvLabel ?? "CSV dışa aktar"}
                    </a>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={exportTableCsv} disabled={filteredTableRows.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    {exportCsvLabel ?? "CSV dışa aktar"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  {reportTable.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 font-medium ${column.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredTableRows.map((row) => {
                  const content = reportTable.columns.map((column) => (
                    <td
                      key={`${row.id}-${column.key}`}
                      className={`px-4 py-3 text-neutral-700 ${column.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {row.cells[column.key] ?? "-"}
                    </td>
                  ));

                  if (!row.href) {
                    return <tr key={row.id}>{content}</tr>;
                  }

                  return (
                    <tr key={row.id} className="transition hover:bg-neutral-50">
                      {reportTable.columns.map((column) => (
                        <td
                          key={`${row.id}-${column.key}`}
                          className={`px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                        >
                          <Link href={row.href as string} className="block text-neutral-700 no-underline">
                            {row.cells[column.key] ?? "-"}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden">
            {filteredTableRows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid gap-2">
                  {reportTable.columns.map((column) => (
                    <div key={`${row.id}-mobile-${column.key}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-neutral-500">{column.label}</span>
                      {row.href ? (
                        <Link href={row.href} className="text-right font-medium text-neutral-900 no-underline">
                          {row.cells[column.key] ?? "-"}
                        </Link>
                      ) : (
                        <span className="text-right font-medium text-neutral-900">{row.cells[column.key] ?? "-"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {filteredTableRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">
              Aramaya uygun satır bulunamadı.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
