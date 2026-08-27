import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import {
  auditLogActionLabels,
  auditLogEntityLabels,
  auditLogService,
} from "@/modules/system/services/audit-log.service";
import {
  AUDIT_LOG_ACTIONS,
  AUDIT_LOG_ENTITY_TYPES,
  type AuditLogAction,
  type AuditLogEntityType,
} from "@/modules/system/contracts/audit-log.contract";

type AuditLogsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; entityType?: string; action?: string; startDate?: string; endDate?: string; page?: string }>;
};

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEntityBadgeClass(entityType: string) {
  switch (entityType) {
    case "PRODUCT":
      return "bg-emerald-100 text-emerald-700";
    case "BRAND":
    case "SUPPLIER":
    case "PRODUCT_ATTRIBUTE":
      return "bg-lime-100 text-lime-700";
    case "USER":
      return "bg-sky-100 text-sky-700";
    case "CATEGORY":
      return "bg-violet-100 text-violet-700";
    case "CUSTOMER_ACCOUNT":
      return "bg-teal-100 text-teal-700";
    case "ORDER":
      return "bg-amber-100 text-amber-700";
    case "BUSINESS_DOCUMENT":
      return "bg-orange-100 text-orange-700";
    case "FINANCE_COLLECTION":
    case "FINANCE_PAYMENT":
      return "bg-teal-100 text-teal-700";
    case "WAREHOUSE":
      return "bg-cyan-100 text-cyan-700";
    case "INVENTORY":
    case "STOCK_COUNT":
      return "bg-blue-100 text-blue-700";
    case "INTEGRATION":
    case "MARKETPLACE_ACCOUNT":
    case "MARKETPLACE_PACKAGE":
      return "bg-indigo-100 text-indigo-700";
    case "STOREFRONT_ITEM":
      return "bg-fuchsia-100 text-fuchsia-700";
    default:
      return "bg-neutral-200 text-neutral-900";
  }
}

function getEntityTypeLabel(entityType: string) {
  return auditLogEntityLabels[entityType as AuditLogEntityType] ?? entityType;
}

function getActionBadgeClass(action: string) {
  switch (action) {
    case "CREATE":
      return "bg-emerald-100 text-emerald-700";
    case "UPDATE":
      return "bg-sky-100 text-sky-700";
    case "DELETE":
      return "bg-rose-100 text-rose-700";
    case "STATUS_UPDATE":
      return "bg-amber-100 text-amber-700";
    case "IMPORT":
      return "bg-violet-100 text-violet-700";
    case "EXPORT":
      return "bg-fuchsia-100 text-fuchsia-700";
    case "SYNC":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-neutral-200 text-neutral-900";
  }
}

function getActionLabel(action: string) {
  return auditLogActionLabels[action as AuditLogAction] ?? action;
}

function formatAuditSummary(summary: string | null, fallback: string) {
  if (!summary) {
    return fallback;
  }

  const replacements: Array<[RegExp, string]> = [
    [/^Product created:\s*/i, "Ürün oluşturuldu: "],
    [/^Product updated:\s*/i, "Ürün güncellendi: "],
    [/^Product image uploaded:\s*/i, "Ürün görseli yüklendi: "],
    [/^Product soft-deleted$/i, "Ürün silindi"],
    [/^User created:\s*/i, "Kullanıcı oluşturuldu: "],
    [/^User updated:\s*/i, "Kullanıcı güncellendi: "],
    [/^User soft-deleted$/i, "Kullanıcı silindi"],
    [/^Category created:\s*/i, "Kategori oluşturuldu: "],
    [/^Category updated:\s*/i, "Kategori güncellendi: "],
    [/^Category soft-deleted$/i, "Kategori silindi"],
    [/^Warehouse created:\s*/i, "Depo oluşturuldu: "],
    [/^Warehouse updated:\s*/i, "Depo güncellendi: "],
    [/^Order status updated:\s*/i, "Sipariş durumu güncellendi: "],
    [/^Order soft-deleted$/i, "Sipariş silindi"],
    [/^Storefront item created:\s*/i, "Mağaza içeriği oluşturuldu: "],
    [/^Storefront item updated:\s*/i, "Mağaza içeriği güncellendi: "],
    [/^Storefront item soft-deleted$/i, "Mağaza içeriği silindi"],
    [/^Product question answered:\s*/i, "Ürün sorusu yanıtlandı: "],
    [/^Product question moderated and removed$/i, "Ürün sorusu moderasyon ile kaldırıldı"],
    [/^Stock count created:\s*/i, "Stok sayımı oluşturuldu: "],
    [/^Stock count applied:\s*/i, "Stok sayımı uygulandı: "],
    [/^Stock count line updated$/i, "Stok sayım satırı güncellendi"],
    [/^Stock in applied for\s*/i, "Stok girişi uygulandı: "],
    [/^Stock out applied for\s*/i, "Stok çıkışı uygulandı: "],
    [/^Inventory transfer applied for\s*/i, "Stok transferi uygulandı: "],
    [/^Manual stock adjustment applied for\s*/i, "Manuel stok düzeltmesi uygulandı: "],
    [/^Bulk inventory adjustment processed:\s*/i, "Toplu stok düzeltmesi işlendi: "],
    [/^Bulk preferred warehouse assignment processed:\s*/i, "Toplu tercih edilen depo ataması işlendi: "],
    [/^Bulk stock count line update processed:\s*/i, "Toplu stok sayım satırı güncellemesi işlendi: "],
    [/^Bulk answer for product questions:\s*/i, "Ürün sorularına toplu yanıt verildi: "],
    [/^Bulk remove product questions:\s*/i, "Ürün soruları toplu kaldırıldı: "],
  ];

  let localized = summary;
  for (const [pattern, replacement] of replacements) {
    localized = localized.replace(pattern, replacement);
  }

  return localized;
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

export default async function AdminAuditLogsPage({ params, searchParams }: AuditLogsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();
  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  const canReadAuditLogs = await rbacService.hasPermission(user, "audit.read");
  if (!canReadAuditLogs) {
    redirect(`/${locale}/admin`);
  }

  const query = await searchParams;
  const selectedEntityType = AUDIT_LOG_ENTITY_TYPES.includes(query.entityType as AuditLogEntityType)
    ? query.entityType as AuditLogEntityType
    : undefined;
  const selectedAction = AUDIT_LOG_ACTIONS.includes(query.action as AuditLogAction)
    ? query.action as AuditLogAction
    : undefined;

  const result = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => auditLogService.list({
      search: query.search,
      entityType: selectedEntityType,
      action: selectedAction,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page ? Number(query.page) : 1,
      pageSize: 20,
    }, { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin }),
  );

  const prevPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < result.totalPages ? result.page + 1 : null;
  const createCount = result.items.filter((item) => item.action === "CREATE").length;
  const updateCount = result.items.filter((item) => item.action === "UPDATE").length;
  const deleteCount = result.items.filter((item) => item.action === "DELETE").length;

  function getPageHref(page: number) {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }

    if (query.entityType) {
      params.set("entityType", query.entityType);
    }

    if (query.action) {
      params.set("action", query.action);
    }

    if (query.startDate) {
      params.set("startDate", query.startDate);
    }

    if (query.endDate) {
      params.set("endDate", query.endDate);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    const qs = params.toString();
    return qs ? `/${locale}/admin/audit-logs?${qs}` : `/${locale}/admin/audit-logs`;
  }

  function getExportHref() {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }

    if (selectedEntityType) {
      params.set("entityType", selectedEntityType);
    }

    if (selectedAction) {
      params.set("action", selectedAction);
    }

    if (query.startDate) {
      params.set("startDate", query.startDate);
    }

    if (query.endDate) {
      params.set("endDate", query.endDate);
    }

    params.set("pageSize", "100");
    params.set("export", "manifest");
    return `/api/admin/audit-logs?${params.toString()}`;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-gradient-to-b from-[color:var(--color-bg-soft)] to-[color:var(--color-surface)] shadow-sm">
      <div className="border-b border-[color:var(--color-border)] bg-[radial-gradient(circle_at_top_right,_rgba(14,116,144,0.12),_transparent_55%),radial-gradient(circle_at_left,_rgba(245,158,11,0.12),_transparent_45%),linear-gradient(135deg,var(--color-surface),var(--color-bg-soft))] p-6">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{dictionary.admin.auditLogMenu}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">{dictionary.admin.auditLogTitle}</h2>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{result.total} {dictionary.admin.auditLogCount}</p>
          <div className="mt-4">
            <Link href={getExportHref()} className="inline-flex rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]">
              Denetçi manifesti indir
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Toplam</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">{result.total}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Oluşturma</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">{createCount}</p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Güncelleme</p>
              <p className="mt-2 text-lg font-semibold text-sky-700">{updateCount}</p>
            </article>
            <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Silme</p>
              <p className="mt-2 text-lg font-semibold text-rose-700">{deleteCount}</p>
            </article>
          </div>
        </div>
      </div>

      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 p-5">
        <form className="grid gap-3 lg:grid-cols-[1.4fr_220px_220px_180px_180px_auto]">
          <Input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Kayıt, ürün, kullanıcı veya özet ara"
          />
          <Select name="entityType" defaultValue={query.entityType ?? "all"}>
            <SelectTrigger>
              <SelectValue placeholder="Tüm varlıklar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm varlıklar</SelectItem>
              {AUDIT_LOG_ENTITY_TYPES.map((entityType) => (
                <SelectItem key={entityType} value={entityType}>{auditLogEntityLabels[entityType]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="action" defaultValue={query.action ?? "all"}>
            <SelectTrigger>
              <SelectValue placeholder="Tüm aksiyonlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm aksiyonlar</SelectItem>
              {AUDIT_LOG_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>{auditLogActionLabels[action]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            name="startDate"
            defaultValue={query.startDate ?? ""}
          />
          <Input
            type="date"
            name="endDate"
            defaultValue={query.endDate ?? ""}
          />
          <Button type="submit">
            Filtrele
          </Button>
        </form>
      </div>

      <div className="p-5">
        {result.items.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-sm text-[color:var(--color-text-muted)] shadow-sm">
            {dictionary.admin.auditEmpty}
          </div>
        ) : (
          <div className="space-y-3">
            {result.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm transition hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-soft)]/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getEntityBadgeClass(item.entityType)}>
                        {getEntityTypeLabel(item.entityType)}
                      </Badge>
                      <Badge className={getActionBadgeClass(item.action)}>
                        {getActionLabel(item.action)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[color:var(--color-text)]">{item.entityLabel}</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-muted)]">
                      {formatAuditSummary(item.summary, dictionary.common.notSpecified)}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-sm text-[color:var(--color-text-muted)] lg:min-w-[280px]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{dictionary.admin.auditActor}</p>
                      <p className="mt-1 font-medium text-[color:var(--color-text)]">{item.actorLabel ?? dictionary.common.notSpecified}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{dictionary.admin.auditDate}</p>
                      <p className="mt-1 font-medium text-[color:var(--color-text)]">{formatDate(item.createdAt, locale as Locale)}</p>
                    </div>
                  </div>
                </div>

                <details className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--color-text)] marker:hidden">
                    Detayı göster
                  </summary>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Varlık tipi</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">{getEntityTypeLabel(item.entityType)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Aksiyon tipi</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">{getActionLabel(item.action)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Varlık</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">{item.entityLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">İşlemi yapan</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">{item.actorLabel ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Modül / İşlem</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">
                          {[item.module, item.operation].filter(Boolean).join(" / ") || dictionary.common.notSpecified}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Ek veri</p>
                      {item.metadata && Object.keys(item.metadata).length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {Object.entries(item.metadata).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{key}</p>
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[color:var(--color-text)]">
                                {formatMetadataValue(value)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">Bu kayıt için ek veri bulunmuyor.</p>
                      )}
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--color-text-muted)] marker:hidden">
                      Geliştirici detayı
                    </summary>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Varlık kimliği</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.entityId ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Kayıt kimliği</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.id}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Kullanıcı kimliği</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.actorUserId ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Aktör tipi</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.actorType}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Tenant</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.tenantId ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Request ID</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.requestId ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Correlation ID</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.correlationId ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Route</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.route ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">IP Adresi</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.ipAddress ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3 lg:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">User Agent</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.userAgent ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Olay zamanı</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{formatDate(item.occurredAt, locale as Locale)}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Sunucu alma zamanı</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{formatDate(item.serverReceivedAt, locale as Locale)}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Hash algoritması</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.hashAlgorithm}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3 lg:col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Payload hash</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.payloadHash ?? dictionary.common.notSpecified}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3 lg:col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Önceki zincir hash</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.previousHash ?? "İlk kayıt veya eski kayıt"}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-3 lg:col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Zincir hash</p>
                        <p className="mt-1 break-all text-xs text-[color:var(--color-text)]">{item.chainHash ?? dictionary.common.notSpecified}</p>
                      </div>
                    </div>
                  </details>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] p-4">
        {prevPage ? (
          <Link href={getPageHref(prevPage)} className="rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]">
            {dictionary.admin.prev}
          </Link>
        ) : <span />}
        <p className="text-sm text-[color:var(--color-text-muted)]">{dictionary.admin.page} {result.page}/{result.totalPages}</p>
        {nextPage ? (
          <Link href={getPageHref(nextPage)} className="rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]">
            {dictionary.admin.next}
          </Link>
        ) : <span />}
      </div>
    </section>
  );
}
