"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorToast } from "@/components/ui/toast";
import type {
  AdminExpenseAnalytics,
  AdminExpenseItemReportResult,
  AdminExpenseItemReportRow,
} from "@/modules/expense-reports/contracts/expense-report-analytics.contract";
import type { AdminBackofficeUserOption, AdminExpenseCategoryItem } from "@/modules/expense-reports/contracts/expense-settings.contract";
import type { AdminExpenseReportStatus } from "@/modules/expense-reports/contracts/expense-report.contract";

const FILTER_DEBOUNCE_MS = 350;

const BAR_FILL = "bg-[#2a78d6] dark:bg-[#3987e5]";
const LINE_STROKE = "stroke-[#2a78d6] dark:stroke-[#3987e5]";
const LINE_FILL = "fill-[#2a78d6] dark:fill-[#3987e5]";
const MAX_BARS = 8;

function formatCurrency(value: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR");
}

function statusLabel(status: AdminExpenseReportStatus) {
  if (status === "DRAFT") return "Gönderilmedi";
  if (status === "SUBMITTED") return "Onay Bekliyor";
  if (status === "APPROVED") return "Onaylandı";
  return "Reddedildi";
}

function statusBadgeClass(status: AdminExpenseReportStatus) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (status === "SUBMITTED") return "border-sky-200 bg-sky-100 text-sky-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-amber-200 bg-amber-100 text-amber-700";
}

function foldToTop(data: Array<{ label: string; amount: number }>, max = MAX_BARS) {
  if (data.length <= max) {
    return data;
  }

  const head = data.slice(0, max - 1);
  const tailTotal = data.slice(max - 1).reduce((sum, item) => sum + item.amount, 0);
  return [...head, { label: "Diğer", amount: tailTotal }];
}

function HorizontalBarChart({ data, emptyLabel }: { data: Array<{ label: string; amount: number }>; emptyLabel: string }) {
  const rows = foldToTop(data);
  const max = Math.max(1, ...rows.map((row) => row.amount));

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-[color:var(--color-text-muted)]">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-[color:var(--color-text)]">{formatCurrency(row.amount)}</span>
          </div>
          <div className="h-5 rounded-full bg-[color:var(--color-bg-soft)]">
            <div className={`h-5 rounded-full ${BAR_FILL}`} style={{ width: `${Math.max(2, (row.amount / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data, emptyLabel }: { data: Array<{ month: string; label: string; amount: number }>; emptyLabel: string }) {
  if (data.every((item) => item.amount === 0)) {
    return <p className="py-6 text-center text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</p>;
  }

  const width = 1000;
  const height = 220;
  const paddingX = 12;
  const paddingTop = 24;
  const paddingBottom = 24;
  const max = Math.max(1, ...data.map((item) => item.amount));
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const baselineY = paddingTop + plotHeight;

  const points = data.map((item, index) => ({
    ...item,
    x: paddingX + stepX * index,
    y: paddingTop + plotHeight - (item.amount / max) * plotHeight,
  }));

  const linePath = points.map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Aylık harcama trendi">
        <line x1={paddingX} y1={baselineY} x2={width - paddingX} y2={baselineY} stroke="var(--color-border)" strokeWidth="1" />
        <path d={linePath} fill="none" className={LINE_STROKE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.month} cx={p.x} cy={p.y} r="4" className={LINE_FILL} stroke="var(--color-surface)" strokeWidth="2">
            <title>{`${p.label}: ${formatCurrency(p.amount)}`}</title>
          </circle>
        ))}
        {last ? (
          <text x={last.x} y={Math.max(12, last.y - 10)} textAnchor="end" fontSize="20" className="fill-[color:var(--color-text)] font-medium">
            {formatCurrency(last.amount)}
          </text>
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[color:var(--color-text-muted)]">
        {points.map((p) => (
          <span key={p.month}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[color:var(--color-text)]">{value}</p>
    </div>
  );
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

export function ExpenseReportAnalyticsManager({
  analytics,
  itemResult,
  categories,
  employees,
}: {
  analytics: AdminExpenseAnalytics;
  itemResult: AdminExpenseItemReportResult;
  categories: AdminExpenseCategoryItem[];
  employees: AdminBackofficeUserOption[];
}) {
  const [items, setItems] = useState(itemResult.items);
  const [page, setPage] = useState(itemResult.page);
  const [totalPages, setTotalPages] = useState(itemResult.totalPages);
  const [totalCount, setTotalCount] = useState(itemResult.total);
  const [totalAmount, setTotalAmount] = useState(itemResult.totalAmount);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [employeeUserId, setEmployeeUserId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminExpenseReportStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  function buildFilterParams() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categoryId !== "all") params.set("categoryId", categoryId);
    if (employeeUserId !== "all") params.set("employeeUserId", employeeUserId);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59.999`).toISOString());
    return params;
  }

  async function loadItems(nextPage: number) {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      params.set("page", String(nextPage));
      params.set("pageSize", "25");

      const response = await fetch(`/api/admin/expense-reports/report/items?${params.toString()}`);
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf kalemleri yüklenemedi."));
        return;
      }
      const payload = (await response.json()) as AdminExpenseItemReportResult;
      setItems(payload.items);
      setPage(payload.page);
      setTotalPages(payload.totalPages);
      setTotalCount(payload.total);
      setTotalAmount(payload.totalAmount);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void loadItems(1);
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, employeeUserId, statusFilter, dateFrom, dateTo]);

  async function handleExport(format: "excel" | "pdf") {
    setExporting(format);
    setError(null);
    try {
      const params = buildFilterParams();
      params.set("format", format);

      const response = await fetch(`/api/admin/expense-reports/report/export?${params.toString()}`);
      if (!response.ok) {
        setError(await readErrorMessage(response, "Rapor dışa aktarılamadı."));
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `masraf-raporu-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      setError("Rapor dışa aktarılamadı.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">Masraf Raporları</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">Onaylanan harcamaların analizi ve tüm masraf kalemlerinin tam listesi.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Toplam Onaylı Harcama" value={formatCurrency(analytics.summary.totalApprovedAmount)} />
        <StatTile label="Onaylı Bildirim Sayısı" value={String(analytics.summary.approvedReportCount)} />
        <StatTile label="Bildirim Başına Ortalama" value={formatCurrency(analytics.summary.averagePerReport)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[color:var(--color-text)]">Kategoriye Göre Harcama</h2>
          <div className="mt-4">
            <HorizontalBarChart
              data={analytics.byCategory.map((row) => ({ label: row.categoryName, amount: row.amount }))}
              emptyLabel="Onaylanmış harcama verisi henüz yok."
            />
          </div>
        </div>
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[color:var(--color-text)]">Personele Göre Harcama</h2>
          <div className="mt-4">
            <HorizontalBarChart
              data={analytics.byEmployee.map((row) => ({ label: row.employeeName, amount: row.amount }))}
              emptyLabel="Onaylanmış harcama verisi henüz yok."
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[color:var(--color-text)]">Aylık Harcama Trendi (Son 12 Ay)</h2>
        <div className="mt-4">
          <MonthlyTrendChart data={analytics.byMonth} emptyLabel="Onaylanmış harcama verisi henüz yok." />
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[color:var(--color-text)]">Tüm Masraf Kalemleri</h2>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={exporting !== null || items.length === 0} onClick={() => void handleExport("excel")}>
              {exporting === "excel" ? "Hazırlanıyor..." : "Excel"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={exporting !== null || items.length === 0} onClick={() => void handleExport("pdf")}>
              {exporting === "pdf" ? "Hazırlanıyor..." : "PDF"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Satıcı, fiş no veya personel ara" className="lg:col-span-2" />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kategoriler</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeUserId} onValueChange={setEmployeeUserId}>
            <SelectTrigger><SelectValue placeholder="Personel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm personel</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="DRAFT">Gönderilmedi</SelectItem>
              <SelectItem value="SUBMITTED">Onay Bekliyor</SelectItem>
              <SelectItem value="APPROVED">Onaylandı</SelectItem>
              <SelectItem value="REJECTED">Reddedildi</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-1">
            <Label className="text-xs text-[color:var(--color-text-muted)]">Başlangıç Tarihi</Label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-[color:var(--color-text-muted)]">Bitiş Tarihi</Label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-[color:var(--color-text-muted)]">
          <span>{loading ? "Yükleniyor..." : `${totalCount} kalem bulundu`}</span>
          <span className="font-semibold text-[color:var(--color-text)]">Alt Toplam: {formatCurrency(totalAmount)}</span>
        </div>

        <div className="mt-2 overflow-x-auto">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--color-text-muted)]">Kayıtlı masraf kalemi bulunamadı.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Fiş/Fatura No</th>
                  <th className="px-4 py-3">Satıcı Adı</th>
                  <th className="px-4 py-3">Harcama Cinsi</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">Personel</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Görsel</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: AdminExpenseItemReportRow) => (
                  <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-4 py-3">{formatDate(item.expenseDate)}</td>
                    <td className="px-4 py-3">{item.receiptNo ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.vendorName}</td>
                    <td className="px-4 py-3">{item.categoryName}</td>
                    <td className="px-4 py-3 text-[color:var(--color-text-muted)]">{item.description ?? "-"}</td>
                    <td className="px-4 py-3">{item.employeeName}</td>
                    <td className="px-4 py-3"><Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</Badge></td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(item.amount, item.currency)}</td>
                    <td className="px-4 py-3">
                      {item.receiptUrl ? (
                        <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-[color:var(--color-brand)] underline">Görüntüle</a>
                      ) : (
                        <span className="text-[color:var(--color-text-muted)]">Yok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--color-border)] font-semibold text-[color:var(--color-text)]">
                  <td className="px-4 py-3" colSpan={7}>Alt Toplam ({totalCount} kalem)</td>
                  <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => void loadItems(page - 1)}>Önceki</Button>
            <span className="text-[color:var(--color-text-muted)]">{page} / {totalPages}</span>
            <Button type="button" variant="outline" disabled={loading || page >= totalPages} onClick={() => void loadItems(page + 1)}>Sonraki</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
