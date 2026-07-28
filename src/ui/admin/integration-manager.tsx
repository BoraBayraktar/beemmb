"use client";

import { useMemo, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminIntegrationJobItem,
  IntegrationChannel,
  IntegrationEntityType,
  IntegrationJobStatus,
  IntegrationJobType,
  MarketplaceCapabilitySet,
} from "@/modules/integration/contracts/integration.contract";

type JobStatus = IntegrationJobStatus;
type Channel = IntegrationChannel;
type JobType = IntegrationJobType;
type EntityType = IntegrationEntityType;
type DrawerMode = "create" | "process";

type Job = AdminIntegrationJobItem;

type MarketplaceBatchResult = {
  jobId: string;
  batchRequestId: string;
  result: Record<string, unknown>;
};

type BatchSummaryItem = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
};

type BatchIssueItem = {
  key: string;
  status: string | null;
  reason: string | null;
  recommendedAction: string | null;
};

type DeadLetter = {
  id: string;
  jobId: string;
  channel: Channel;
  jobType: JobType;
  entityType: EntityType;
  entityId: string;
  lastError: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  resolved: boolean;
};

type MarketplaceCapabilitySummary = {
  channel: Extract<Channel, "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA">;
  capabilities: MarketplaceCapabilitySet;
};

type Labels = {
  title: string;
  subtitle: string;
  createJob: string;
  processQueue: string;
  deadLetters: string;
  deadLettersEmpty: string;
  jobs: string;
  channel: string;
  jobType: string;
  status: string;
  entityId: string;
  marketplaceOverview: string;
  marketplaceOverviewHint: string;
  marketplaceCapabilitySummary: string;
  capabilityAvailable: string;
  capabilityLimited: string;
  capabilityInvoicedStatus: string;
  capabilityPackageSplit: string;
  capabilityBrandMapping: string;
  capabilityCategoryMapping: string;
  capabilityAttributeMapping: string;
  capabilityAdvancedPreflight: string;
  filterByChannel: string;
  activeFilters: string;
  recentActivity: string;
  noExternalReference: string;
  noActionAvailable: string;
  actionWaitingQueue: string;
  actionProcessingQueue: string;
  actionReviewError: string;
  actionTrackDeadLetter: string;
  openJobDetail: string;
  jobDetailTitle: string;
  jobDetailDescription: string;
  requestPayload: string;
  responsePayload: string;
  payloadEmpty: string;
  payloadReference: string;
  payloadTrigger: string;
  payloadBatch: string;
  payloadSku: string;
  attemptProgress: string;
  lastAttemptAt: string;
  processedAt: string;
  channelTrendyol: string;
  channelN11: string;
  channelPazarama: string;
  channelHepsiburada: string;
  channelEDocsMock: string;
  jobTypeProductSync: string;
  jobTypePriceSync: string;
  jobTypeStockSync: string;
  jobTypeOrderImport: string;
  jobTypeOrderStatusSync: string;
  jobTypeDocumentOutbound: string;
  jobTypeDocumentStatusSync: string;
  statusPending: string;
  statusProcessing: string;
  statusSuccess: string;
  statusFailed: string;
  statusDeadLetter: string;
  entityProduct: string;
  entityMarketplaceAccount: string;
  entityMarketplacePackage: string;
  entityOrder: string;
  entityBusinessDocument: string;
  targetEntityType: string;
  actions: string;
  retry: string;
  operationFailed: string;
  loading: string;
  forceFail: string;
  openCreateDrawer: string;
  openProcessDrawer: string;
  drawerCreateTitle: string;
  drawerProcessTitle: string;
  drawerDescription: string;
  entityIds: string;
  entityIdsHint: string;
  entityIdsProductHint: string;
  entityIdsMarketplaceAccountHint: string;
  entityIdsMarketplacePackageHint: string;
  entityIdsBusinessDocumentHint: string;
  stockSyncHint: string;
  genericSyncHint: string;
  maxAttempts: string;
  idempotencySuffix: string;
  integrationReference: string;
  trigger: string;
  triggerPreset: string;
  stockSyncReferenceHint: string;
  stockSyncTriggerHint: string;
  triggerManualDispatch: string;
  triggerManualAdjustment: string;
  triggerOrderCommit: string;
  triggerStockCount: string;
  triggerTransfer: string;
  triggerPurchaseReceipt: string;
  triggerPriceUpdate: string;
  triggerProductUpdate: string;
  queueLimit: string;
  apply: string;
  close: string;
  filterSearch: string;
  filterStatus: string;
  filterChannel: string;
  filterJobType: string;
  clearFilters: string;
  summaryPending: string;
  summaryProcessing: string;
  summarySuccess: string;
  summaryFailed: string;
  summaryDeadLetter: string;
  emptyJobs: string;
  nextAttemptAt: string;
  lastError: string;
  createdAt: string;
  externalReference: string;
  batchResult: string;
  batchResultHint: string;
  checkBatchResult: string;
  batchResultEmpty: string;
  batchCheckedAt: string;
  batchIssueSummary: string;
  batchIssueStatus: string;
  batchIssueReason: string;
  batchIssueRecommendedAction: string;
  all: string;
  validationEntityIds: string;
  validationQueueLimit: string;
};

const JOB_TYPE_TRIGGER_PRESETS: Record<JobType, string[]> = {
  STOCK_SYNC: [
    "MANUAL_ADJUSTMENT",
    "ORDER_COMMIT",
    "STOCK_COUNT",
    "TRANSFER",
    "PURCHASE_RECEIPT",
    "MANUAL_DISPATCH",
  ],
  PRODUCT_SYNC: [
    "PRODUCT_UPDATE",
    "MANUAL_DISPATCH",
  ],
  PRICE_SYNC: [
    "PRICE_UPDATE",
    "MANUAL_DISPATCH",
  ],
  ORDER_IMPORT: [
    "MARKETPLACE_ORDER_IMPORT",
    "MANUAL_DISPATCH",
  ],
  ORDER_STATUS_SYNC: [
    "MARKETPLACE_STATUS_REFRESH",
    "MANUAL_DISPATCH",
  ],
  DOCUMENT_OUTBOUND: [
    "MANUAL_DISPATCH",
    "DOCUMENT_ISSUE",
  ],
  DOCUMENT_STATUS_SYNC: [
    "STATUS_REFRESH",
    "MANUAL_DISPATCH",
  ],
  BANK_STATEMENT_SYNC: [
    "MANUAL_DISPATCH",
  ],
};

function triggerLabel(trigger: string, labels: Labels) {
  if (trigger === "MANUAL_ADJUSTMENT") {
    return labels.triggerManualAdjustment;
  }

  if (trigger === "ORDER_COMMIT") {
    return labels.triggerOrderCommit;
  }

  if (trigger === "STOCK_COUNT") {
    return labels.triggerStockCount;
  }

  if (trigger === "TRANSFER") {
    return labels.triggerTransfer;
  }

  if (trigger === "PURCHASE_RECEIPT") {
    return labels.triggerPurchaseReceipt;
  }

  if (trigger === "PRICE_UPDATE") {
    return labels.triggerPriceUpdate;
  }

  if (trigger === "PRODUCT_UPDATE") {
    return labels.triggerProductUpdate;
  }

  return labels.triggerManualDispatch;
}

function channelLabel(channel: Channel, labels: Labels) {
  if (channel === "TRENDYOL") {
    return labels.channelTrendyol;
  }

  if (channel === "N11") {
    return labels.channelN11;
  }

  if (channel === "PAZARAMA") {
    return labels.channelPazarama;
  }

  if (channel === "HEPSIBURADA") {
    return labels.channelHepsiburada;
  }

  if (channel === "BANK_SANDBOX") {
    return "Banka sandbox";
  }

  return labels.channelEDocsMock;
}

function jobTypeLabel(jobType: JobType, labels: Labels) {
  const map: Record<JobType, string> = {
    PRODUCT_SYNC: labels.jobTypeProductSync,
    PRICE_SYNC: labels.jobTypePriceSync,
    STOCK_SYNC: labels.jobTypeStockSync,
    ORDER_IMPORT: labels.jobTypeOrderImport,
    ORDER_STATUS_SYNC: labels.jobTypeOrderStatusSync,
    DOCUMENT_OUTBOUND: labels.jobTypeDocumentOutbound,
    DOCUMENT_STATUS_SYNC: labels.jobTypeDocumentStatusSync,
    BANK_STATEMENT_SYNC: "Banka ekstresi senkronu",
  };

  return map[jobType];
}

function stringifyBatchValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value == null) {
    return "-";
  }

  return JSON.stringify(value);
}

function summarizeBatchResult(result: MarketplaceBatchResult): BatchSummaryItem[] {
  const payload = result.result ?? {};
  const items: BatchSummaryItem[] = [
    {
      label: "Referans",
      value: result.batchRequestId,
    },
  ];

  if (typeof payload.status === "string") {
    items.push({
      label: "Durum",
      value: payload.status,
      tone: payload.status.toUpperCase().includes("SUCCESS") || payload.status.toUpperCase() === "COMPLETED"
        ? "success"
        : payload.status.toUpperCase().includes("FAIL")
          ? "warning"
          : "neutral",
    });
  }

  if (typeof payload.taskId === "string" || typeof payload.taskId === "number") {
    items.push({
      label: "Task ID",
      value: String(payload.taskId),
    });
  }

  if (typeof payload.batchRequestId === "string") {
    items.push({
      label: "Batch ID",
      value: payload.batchRequestId,
    });
  }

  if (Array.isArray(payload.reasons) && payload.reasons.length > 0) {
    items.push({
      label: "Nedenler",
      value: payload.reasons.map((item) => stringifyBatchValue(item)).join(" | "),
      tone: "warning",
    });
  }

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    items.push({
      label: "Satir",
      value: String(payload.items.length),
    });
  }

  if (Array.isArray(payload.content) && payload.content.length > 0) {
    items.push({
      label: "Kayit",
      value: String(payload.content.length),
    });
  }

  if (payload.skus && typeof payload.skus === "object") {
    const skuKeys = Object.keys(payload.skus as Record<string, unknown>);
    if (skuKeys.length > 0) {
      items.push({
        label: "SKU",
        value: String(skuKeys.length),
      });
    }
  }

  return items;
}

function readReason(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => readString(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  return null;
}

function recommendedActionFromIssue(reason: string | null, status: string | null, labels: Labels) {
  const normalizedReason = normalizeTechnicalHint(reason, labels);
  if (normalizedReason && normalizedReason !== reason) {
    return normalizedReason;
  }

  const normalizedStatus = normalizeTechnicalHint(status, labels);
  if (normalizedStatus && normalizedStatus !== status) {
    return normalizedStatus;
  }

  return null;
}

function summarizeBatchIssues(result: MarketplaceBatchResult, labels: Labels): BatchIssueItem[] {
  const payload = result.result ?? {};
  const issues: BatchIssueItem[] = [];

  if (payload.skus && typeof payload.skus === "object") {
    for (const [key, rawValue] of Object.entries(payload.skus as Record<string, unknown>)) {
      if (!rawValue || typeof rawValue !== "object") {
        continue;
      }

      const item = rawValue as Record<string, unknown>;
      const status = readString(item.status);
      const reason = readReason(item.reasons) ?? readReason(item.reason) ?? readReason(item.message);
      if (status || reason) {
        issues.push({
          key,
          status,
          reason,
          recommendedAction: null,
        });
      }
    }
  }

  if (Array.isArray(payload.items)) {
    for (const rawValue of payload.items) {
      if (!rawValue || typeof rawValue !== "object") {
        continue;
      }

      const item = rawValue as Record<string, unknown>;
      const key = readString(item.barcode) ?? readString(item.stockCode) ?? readString(item.merchantSku) ?? readString(item.lineId);
      const status = readString(item.status);
      const reason = readReason(item.failureReasons) ?? readReason(item.reasons) ?? readReason(item.message);
      if (key && (status || reason)) {
        issues.push({
          key,
          status,
          reason,
          recommendedAction: null,
        });
      }
    }
  }

  return issues.slice(0, 8).map((item) => ({
    ...item,
    recommendedAction: recommendedActionFromIssue(item.reason, item.status, labels),
  }));
}

function statusLabel(status: JobStatus, labels: Labels) {
  const map: Record<JobStatus, string> = {
    PENDING: labels.statusPending,
    PROCESSING: labels.statusProcessing,
    SUCCESS: labels.statusSuccess,
    FAILED: labels.statusFailed,
    DEAD_LETTER: labels.statusDeadLetter,
  };

  return map[status];
}

function entityTypeLabel(entityType: EntityType, labels: Labels) {
  const map: Record<EntityType, string> = {
    PRODUCT: labels.entityProduct,
    MARKETPLACE_ACCOUNT: labels.entityMarketplaceAccount,
    MARKETPLACE_PACKAGE: labels.entityMarketplacePackage,
    ORDER: labels.entityOrder,
    BUSINESS_DOCUMENT: labels.entityBusinessDocument,
    FINANCIAL_ACCOUNT: "Finans hesabı",
  };

  return map[entityType];
}

function filterStatusLabel(value: "all" | JobStatus, labels: Labels) {
  if (value === "all") {
    return labels.all;
  }

  return statusLabel(value, labels);
}

function filterChannelLabel(value: "all" | Channel, labels: Labels) {
  if (value === "all") {
    return labels.all;
  }

  return channelLabel(value, labels);
}

function filterJobTypeLabel(value: "all" | JobType, labels: Labels) {
  if (value === "all") {
    return labels.all;
  }

  return jobTypeLabel(value, labels);
}

function capabilityItems(summary: MarketplaceCapabilitySummary, labels: Labels) {
  return [
    { label: labels.capabilityInvoicedStatus, enabled: summary.capabilities.supportsStatusInvoiced },
    { label: labels.capabilityPackageSplit, enabled: summary.capabilities.supportsPackageSplit },
    { label: labels.capabilityBrandMapping, enabled: summary.capabilities.requiresBrandMapping },
    { label: labels.capabilityCategoryMapping, enabled: summary.capabilities.requiresCategoryMapping },
    { label: labels.capabilityAttributeMapping, enabled: summary.capabilities.requiresAttributeMapping },
    { label: labels.capabilityAdvancedPreflight, enabled: summary.capabilities.preflightLevel === "ADVANCED" },
  ];
}

function actionHint(job: Job, labels: Labels) {
  if (job.status === "PENDING") {
    return labels.actionWaitingQueue;
  }

  if (job.status === "PROCESSING") {
    return labels.actionProcessingQueue;
  }

  if (job.status === "FAILED") {
    const reasons = Array.isArray(job.responsePayload?.reasons)
      ? job.responsePayload?.reasons
        .map((item) => readString(item))
        .filter((item): item is string => Boolean(item))
      : [];
    if (reasons.length > 0) {
      return normalizeTechnicalHint(reasons[0], labels) ?? labels.actionReviewError;
    }

    const status = readString(job.responsePayload?.status);
    if (status) {
      return normalizeTechnicalHint(status, labels) ?? labels.actionReviewError;
    }

    return labels.actionReviewError;
  }

  if (job.status === "DEAD_LETTER") {
    const lastError = readString(job.lastError);
    if (lastError) {
      return normalizeTechnicalHint(lastError, labels) ?? labels.actionTrackDeadLetter;
    }

    return labels.actionTrackDeadLetter;
  }

  if (job.status === "SUCCESS") {
    const status = readString(job.responsePayload?.status);
    if (status) {
      return normalizeTechnicalHint(status, labels) ?? labels.noActionAvailable;
    }
  }

  return labels.noActionAvailable;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeTechnicalHint(value: string | null, labels: Labels) {
  if (!value) {
    return null;
  }

  if (value.includes("CONFIG_NOT_FOUND") || value.includes("CONFIG_INCOMPLETE")) {
    return "Entegrasyon baglanti ayarlarini kontrol edin";
  }

  if (value.includes("PRODUCT_NOT_FOUND")) {
    return "Urun kaydi bulunamadi";
  }

  if (value.includes("BARCODE_REQUIRED") || value.includes("STOCK_CODE_REQUIRED")) {
    return "Pazaryeri icin gerekli urun kodu eksik";
  }

  if (value.includes("TASK_ID_NOT_FOUND") || value.includes("BATCH_REQUEST_ID_NOT_FOUND")) {
    return "Harici gorev referansi bulunamadi";
  }

  if (value.includes("JOB_UNSUPPORTED") || value.includes("UNSUPPORTED")) {
    return "Bu is tipi bu kanal icin desteklenmiyor";
  }

  if (value.toUpperCase() === "COMPLETED") {
    return labels.statusSuccess;
  }

  if (value.toUpperCase().includes("FAIL")) {
    return `${labels.statusFailed}: ${value}`;
  }

  return value;
}

function jobHighlights(job: Job, labels: Labels) {
  const items: Array<{ label: string; value: string; tone: "neutral" | "cyan" | "amber" }> = [];
  const reference = readString(job.payload?.reference);
  const trigger = readString(job.payload?.trigger);
  const batchRequestId = readString(job.responsePayload?.batchRequestId);
  const taskId = readString(job.responsePayload?.taskId);
  const taskStatus = readString(job.responsePayload?.status);
  const sku = readString(job.responsePayload?.sku);
  const reasons = Array.isArray(job.responsePayload?.reasons)
    ? job.responsePayload?.reasons
      .map((item) => readString(item))
      .filter((item): item is string => Boolean(item))
    : [];

  if (reference) {
    items.push({ label: labels.payloadReference, value: reference, tone: "neutral" });
  }

  if (trigger) {
    items.push({ label: labels.payloadTrigger, value: triggerLabel(trigger, labels), tone: "neutral" });
  }

  if (batchRequestId) {
    items.push({ label: labels.payloadBatch, value: batchRequestId, tone: "cyan" });
  }

  if (taskId) {
    items.push({ label: "Task", value: taskId, tone: "cyan" });
  }

  if (taskStatus) {
    items.push({ label: "Durum", value: taskStatus, tone: taskStatus.toUpperCase().includes("FAIL") ? "amber" : "neutral" });
  }

  if (sku) {
    items.push({ label: labels.payloadSku, value: sku, tone: "amber" });
  }

  if (reasons.length > 0) {
    items.push({ label: "Neden", value: reasons.join(" | "), tone: "amber" });
  }

  return items;
}

function defaultTriggerForJobType(jobType: JobType) {
  return JOB_TYPE_TRIGGER_PRESETS[jobType][0] ?? "MANUAL_DISPATCH";
}

function entityTypeForJobType(jobType: JobType): EntityType {
  if (jobType === "DOCUMENT_OUTBOUND" || jobType === "DOCUMENT_STATUS_SYNC") {
    return "BUSINESS_DOCUMENT";
  }

  if (jobType === "ORDER_IMPORT") {
    return "MARKETPLACE_ACCOUNT";
  }

  if (jobType === "ORDER_STATUS_SYNC") {
    return "MARKETPLACE_PACKAGE";
  }

  return "PRODUCT";
}

function entityIdsHintForEntityType(entityType: EntityType, labels: Labels) {
  if (entityType === "MARKETPLACE_ACCOUNT") {
    return labels.entityIdsMarketplaceAccountHint;
  }

  if (entityType === "MARKETPLACE_PACKAGE") {
    return labels.entityIdsMarketplacePackageHint;
  }

  if (entityType === "BUSINESS_DOCUMENT") {
    return labels.entityIdsBusinessDocumentHint;
  }

  return labels.entityIdsProductHint;
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: JobStatus) {
  if (status === "SUCCESS") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "PROCESSING") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "FAILED") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "DEAD_LETTER") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-neutral-100 text-neutral-700";
}

function toggleStatusFilter(
  current: "all" | JobStatus,
  next: JobStatus,
  setStatusFilter: (value: "all" | JobStatus) => void,
) {
  setStatusFilter(current === next ? "all" : next);
}

export function IntegrationManager({
  locale,
  labels,
  canManage,
  initialJobs,
  initialDeadLetters,
  marketplaceCapabilities,
}: {
  locale: string;
  labels: Labels;
  canManage: boolean;
  initialJobs: Job[];
  initialDeadLetters: DeadLetter[];
  marketplaceCapabilities: MarketplaceCapabilitySummary[];
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>(initialDeadLetters);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);
  const [channel, setChannel] = useState<Channel>("TRENDYOL");
  const [jobType, setJobType] = useState<JobType>("STOCK_SYNC");
  const [entityIds, setEntityIds] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [idempotencySuffix, setIdempotencySuffix] = useState("");
  const [reference, setReference] = useState("");
  const [trigger, setTrigger] = useState("MANUAL_DISPATCH");
  const [queueLimit, setQueueLimit] = useState("20");
  const [forceFail, setForceFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchBusyJobId, setBatchBusyJobId] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<MarketplaceBatchResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | Channel>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>("all");

  const summary = useMemo(() => ({
    pending: jobs.filter((item) => item.status === "PENDING").length,
    processing: jobs.filter((item) => item.status === "PROCESSING").length,
    success: jobs.filter((item) => item.status === "SUCCESS").length,
    failed: jobs.filter((item) => item.status === "FAILED").length,
    deadLetter: jobs.filter((item) => item.status === "DEAD_LETTER").length,
  }), [jobs]);
  const channelSummaries = useMemo(() => (["TRENDYOL", "N11", "PAZARAMA", "HEPSIBURADA"] as Channel[]).map((item) => {
    const channelJobs = jobs.filter((job) => job.channel === item);
    const activeCount = channelJobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING").length;
    const failedCount = channelJobs.filter((job) => job.status === "FAILED" || job.status === "DEAD_LETTER").length;
    const lastJob = [...channelJobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

    return {
      channel: item,
      total: channelJobs.length,
      activeCount,
      failedCount,
      lastJob,
    };
  }), [jobs]);

  const isStockSync = jobType === "STOCK_SYNC";
  const targetEntityType = entityTypeForJobType(jobType);
  const targetEntityIdsHint = entityIdsHintForEntityType(targetEntityType, labels);
  const triggerOptions = JOB_TYPE_TRIGGER_PRESETS[jobType];
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all" || channelFilter !== "all" || jobTypeFilter !== "all";
  const activeFilterSummary = [
    `${labels.filterStatus}: ${filterStatusLabel(statusFilter, labels)}`,
    `${labels.filterChannel}: ${filterChannelLabel(channelFilter, labels)}`,
    `${labels.filterJobType}: ${filterJobTypeLabel(jobTypeFilter, labels)}`,
    search.trim().length > 0 ? `${labels.filterSearch}: ${search.trim()}` : null,
  ].filter((item): item is string => Boolean(item)).join(" · ");

  const filteredJobs = useMemo(() => [...jobs]
    .filter((item) => (
      (search.trim().length === 0
        || item.entityId.toLowerCase().includes(search.trim().toLowerCase())
        || item.idempotencyKey.toLowerCase().includes(search.trim().toLowerCase()))
      && (statusFilter === "all" || item.status === statusFilter)
      && (channelFilter === "all" || item.channel === channelFilter)
      && (jobTypeFilter === "all" || item.jobType === jobTypeFilter)
    ))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt)), [channelFilter, jobTypeFilter, jobs, search, statusFilter]);

  async function refresh() {
    const [jobsResponse, deadLettersResponse] = await Promise.all([
      fetch("/api/admin/integrations/jobs?page=1&pageSize=50"),
      fetch("/api/admin/integrations/dead-letters"),
    ]);

    if (!jobsResponse.ok || !deadLettersResponse.ok) {
      throw new Error(labels.operationFailed);
    }

    const jobsPayload = await jobsResponse.json() as { items: Job[] };
    const deadPayload = await deadLettersResponse.json() as { items: DeadLetter[] };
    setJobs(jobsPayload.items);
    setDeadLetters(deadPayload.items);
  }

  function openDrawer(mode: DrawerMode) {
    setDrawerMode(mode);
    setDrawerFullscreen(false);
    setError(null);

    if (mode === "create") {
      setChannel("TRENDYOL");
      setJobType("STOCK_SYNC");
      setEntityIds("");
      setMaxAttempts("3");
      setIdempotencySuffix("");
      setReference("");
      setTrigger(defaultTriggerForJobType("STOCK_SYNC"));
      setForceFail(false);
    } else {
      setQueueLimit("20");
    }
  }

  function closeDrawer() {
    if (busy) {
      return;
    }

    setDrawerMode(null);
    setDrawerFullscreen(false);
  }

  async function createJob() {
    const normalizedEntityIds = entityIds
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalizedEntityIds.length === 0) {
      setError(labels.validationEntityIds);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const payload = {
        channel,
        jobType,
        entityType: targetEntityType,
        entityIds: normalizedEntityIds,
        maxAttempts: Number(maxAttempts || "3"),
        idempotencySuffix: idempotencySuffix.trim() || undefined,
        payload: {
          forceFail,
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(trigger.trim() ? { trigger: trigger.trim() } : {}),
        },
      };

      const response = await fetch("/api/admin/integrations/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responsePayload = await response.json().catch(() => null) as { message?: string } | null;
        setError(responsePayload?.message ?? labels.operationFailed);
        return;
      }

      await refresh();
      closeDrawer();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function processQueue() {
    const limit = Number(queueLimit || "20");
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      setError(labels.validationQueueLimit);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit }),
      });

      if (!response.ok) {
        const responsePayload = await response.json().catch(() => null) as { message?: string } | null;
        setError(responsePayload?.message ?? labels.operationFailed);
        return;
      }

      await refresh();
      closeDrawer();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function retryDeadLetter(jobId: string) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/integrations/dead-letters/${jobId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const responsePayload = await response.json().catch(() => null) as { message?: string } | null;
        setError(responsePayload?.message ?? labels.operationFailed);
        return;
      }

      await refresh();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function checkBatchResult(jobId: string) {
    setBatchBusyJobId(jobId);
    setError(null);

    try {
      const targetJob = jobs.find((item) => item.id === jobId);

      if (!targetJob) {
        setError(labels.operationFailed);
        return;
      }

      const endpoint = targetJob.channel === "N11"
        ? `/api/admin/integrations/jobs/${jobId}/n11-task`
        : targetJob.channel === "HEPSIBURADA"
          ? `/api/admin/integrations/jobs/${jobId}/hepsiburada-upload`
          : targetJob.channel === "PAZARAMA" && targetJob.jobType === "PRODUCT_SYNC"
            ? `/api/admin/integrations/jobs/${jobId}/pazarama-batch`
            : targetJob.channel === "PAZARAMA"
              ? `/api/admin/integrations/jobs/${jobId}/pazarama-listing-batch`
              : `/api/admin/integrations/jobs/${jobId}/trendyol-batch`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        const responsePayload = await response.json().catch(() => null) as { message?: string } | null;
        setError(responsePayload?.message ?? labels.operationFailed);
        return;
      }

      const payload = await response.json() as MarketplaceBatchResult;
      setBatchResult(payload);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBatchBusyJobId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white shadow-sm">
      <div className="border-b border-neutral-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,116,144,0.15),_transparent_55%),radial-gradient(circle_at_left,_rgba(245,158,11,0.10),_transparent_45%)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.title}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{labels.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">{labels.subtitle}</p>
      </div>

      {error ? (
        <p className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 border-b border-neutral-200 p-5 md:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => toggleStatusFilter(statusFilter, "PENDING", setStatusFilter)}
          className={`rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
            statusFilter === "PENDING" ? "border-neutral-950 ring-2 ring-neutral-200" : "border-neutral-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.summaryPending}</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{summary.pending}</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter(statusFilter, "PROCESSING", setStatusFilter)}
          className={`rounded-2xl border bg-sky-50/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
            statusFilter === "PROCESSING" ? "border-sky-500 ring-2 ring-sky-200" : "border-sky-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.summaryProcessing}</p>
          <p className="mt-2 text-lg font-semibold text-sky-700">{summary.processing}</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter(statusFilter, "SUCCESS", setStatusFilter)}
          className={`rounded-2xl border bg-emerald-50/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
            statusFilter === "SUCCESS" ? "border-emerald-500 ring-2 ring-emerald-200" : "border-emerald-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.summarySuccess}</p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">{summary.success}</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter(statusFilter, "FAILED", setStatusFilter)}
          className={`rounded-2xl border bg-amber-50/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
            statusFilter === "FAILED" ? "border-amber-500 ring-2 ring-amber-200" : "border-amber-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.summaryFailed}</p>
          <p className="mt-2 text-lg font-semibold text-amber-700">{summary.failed}</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter(statusFilter, "DEAD_LETTER", setStatusFilter)}
          className={`rounded-2xl border bg-rose-50/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
            statusFilter === "DEAD_LETTER" ? "border-rose-500 ring-2 ring-rose-200" : "border-rose-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.summaryDeadLetter}</p>
          <p className="mt-2 text-lg font-semibold text-rose-700">{summary.deadLetter}</p>
        </button>
      </div>

      <div className="border-b border-neutral-200 bg-white/90 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight text-neutral-950">{labels.marketplaceOverview}</h3>
          <p className="text-sm text-neutral-600">{labels.marketplaceOverviewHint}</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {channelSummaries.map((item) => {
            const capabilitySummary = marketplaceCapabilities.find((entry) => entry.channel === item.channel);
            const capabilityEntries = capabilitySummary ? capabilityItems(capabilitySummary, labels) : [];

            return (
              <button
                key={item.channel}
                type="button"
                onClick={() => setChannelFilter(item.channel)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                  channelFilter === item.channel
                    ? "border-cyan-300 bg-cyan-50/80"
                    : "border-neutral-200 bg-neutral-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{channelLabel(item.channel, labels)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{labels.filterByChannel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {capabilitySummary ? (
                      <Badge className="bg-neutral-900 text-white">{capabilityEntries.filter((entry) => entry.enabled).length}/6</Badge>
                    ) : null}
                    <Badge className={item.failedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                      {item.failedCount > 0 ? labels.statusFailed : labels.statusSuccess}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-neutral-500">{labels.jobs}</p>
                    <p className="mt-1 font-semibold text-neutral-950">{item.total}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-neutral-500">{labels.summaryPending}</p>
                    <p className="mt-1 font-semibold text-sky-700">{item.activeCount}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-neutral-500">{labels.summaryFailed}</p>
                    <p className="mt-1 font-semibold text-amber-700">{item.failedCount}</p>
                  </div>
                </div>
                {item.lastJob ? (
                  <p className="mt-3 text-xs text-neutral-500">
                    {jobTypeLabel(item.lastJob.jobType, labels)} - {statusLabel(item.lastJob.status, labels)} - {formatDate(item.lastJob.createdAt, locale)}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-neutral-500">{labels.emptyJobs}</p>
                )}
                {capabilitySummary ? (
                  <div className="mt-3 rounded-xl border border-neutral-200 bg-white/80 p-2.5">
                    <p className="text-[11px] leading-4 text-neutral-500">{labels.marketplaceCapabilitySummary}</p>
                    <div className="mt-2 grid gap-1.5">
                      {capabilityEntries.map((entry) => (
                        <div key={entry.label} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs leading-4">
                          <span className="text-neutral-700">{entry.label}</span>
                          <Badge className={entry.enabled ? "h-6 bg-emerald-100 px-2 py-0 text-[11px] text-emerald-700" : "h-6 bg-amber-100 px-2 py-0 text-[11px] text-amber-800"}>
                            {entry.enabled ? labels.capabilityAvailable : labels.capabilityLimited}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-neutral-200 bg-white/90 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.filterSearch}
            />
            <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as "all" | Channel)}>
              <SelectTrigger>
                <SelectValue placeholder={`${labels.filterChannel}: ${labels.all}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterChannel}: {labels.all}</SelectItem>
                <SelectItem value="TRENDYOL">{labels.channelTrendyol}</SelectItem>
                <SelectItem value="N11">{labels.channelN11}</SelectItem>
                <SelectItem value="PAZARAMA">{labels.channelPazarama}</SelectItem>
                <SelectItem value="HEPSIBURADA">{labels.channelHepsiburada}</SelectItem>
                <SelectItem value="EDOCS_MOCK">{labels.channelEDocsMock}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={jobTypeFilter} onValueChange={(value) => setJobTypeFilter(value as "all" | JobType)}>
              <SelectTrigger>
                <SelectValue placeholder={`${labels.filterJobType}: ${labels.all}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterJobType}: {labels.all}</SelectItem>
                <SelectItem value="PRODUCT_SYNC">{labels.jobTypeProductSync}</SelectItem>
                <SelectItem value="PRICE_SYNC">{labels.jobTypePriceSync}</SelectItem>
                <SelectItem value="STOCK_SYNC">{labels.jobTypeStockSync}</SelectItem>
                <SelectItem value="ORDER_IMPORT">{labels.jobTypeOrderImport}</SelectItem>
                <SelectItem value="ORDER_STATUS_SYNC">{labels.jobTypeOrderStatusSync}</SelectItem>
                <SelectItem value="DOCUMENT_OUTBOUND">{labels.jobTypeDocumentOutbound}</SelectItem>
                <SelectItem value="DOCUMENT_STATUS_SYNC">{labels.jobTypeDocumentStatusSync}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | JobStatus)}>
              <SelectTrigger>
                <SelectValue placeholder={`${labels.filterStatus}: ${labels.all}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterStatus}: {labels.all}</SelectItem>
                <SelectItem value="PENDING">{labels.statusPending}</SelectItem>
                <SelectItem value="PROCESSING">{labels.statusProcessing}</SelectItem>
                <SelectItem value="SUCCESS">{labels.statusSuccess}</SelectItem>
                <SelectItem value="FAILED">{labels.statusFailed}</SelectItem>
                <SelectItem value="DEAD_LETTER">{labels.statusDeadLetter}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setChannelFilter("all");
              setJobTypeFilter("all");
            }}>
              {labels.clearFilters}
            </Button>
            {canManage ? (
              <>
                <Button type="button" onClick={() => openDrawer("create")}>
                  {labels.openCreateDrawer}
                </Button>
                <Button type="button" variant="secondary" onClick={() => openDrawer("process")}>
                  {labels.openProcessDrawer}
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2">
            <p className="text-xs font-medium text-cyan-800">
              {labels.activeFilters}: {filteredJobs.length} / {jobs.length}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-cyan-700">{activeFilterSummary}</p>
          </div>
        ) : null}
      </div>

      <div className="border-b border-neutral-200 bg-white/90 p-5">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-950">{labels.jobs}</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          <div className="hidden grid-cols-[150px_180px_130px_1fr_190px_130px] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 xl:grid">
            <span>{labels.channel}</span>
            <span>{labels.jobType}</span>
            <span>{labels.status}</span>
            <span>{labels.entityId}</span>
            <span>{labels.createdAt}</span>
            <span>{labels.actions}</span>
          </div>

          {filteredJobs.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">{labels.emptyJobs}</p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {filteredJobs.map((item) => {
                const canCheckBatch = (item.channel === "TRENDYOL" || item.channel === "N11" || item.channel === "PAZARAMA" || item.channel === "HEPSIBURADA")
                  && item.status === "SUCCESS"
                  && (item.jobType === "PRODUCT_SYNC" || item.jobType === "STOCK_SYNC" || item.jobType === "PRICE_SYNC")
                  && Boolean(item.externalReference || item.responsePayload?.batchRequestId || item.responsePayload?.taskId || item.responsePayload?.priceUploadId || item.responsePayload?.stockUploadId || item.responsePayload?.dataId);
                const highlights = jobHighlights(item, labels);

                return (
                  <article key={item.id} className="grid gap-3 p-4 xl:grid-cols-[150px_180px_130px_1fr_190px_130px] xl:items-center">
                    <div>
                      <p className="font-semibold text-neutral-900">{channelLabel(item.channel, labels)}</p>
                      <p className="mt-1 text-xs text-neutral-500">{entityTypeLabel(item.entityType, labels)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{jobTypeLabel(item.jobType, labels)}</p>
                      <p className="mt-1 text-xs text-neutral-500">{labels.attemptProgress}: {item.attemptCount}/{item.maxAttempts}</p>
                    </div>
                    <div>
                      <Badge className={statusClass(item.status)}>
                        {statusLabel(item.status, labels)}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="break-all text-neutral-700">{item.entityId}</p>
                      <p className="mt-1 truncate text-xs text-neutral-500">{item.idempotencyKey}</p>
                      {item.externalReference ? (
                        <p className="mt-1 truncate text-xs text-cyan-700">{labels.externalReference}: {item.externalReference}</p>
                      ) : (
                        <p className="mt-1 text-xs text-neutral-400">{labels.noExternalReference}</p>
                      )}
                      {highlights.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {highlights.map((highlight) => (
                            <span
                              key={`${highlight.label}:${highlight.value}`}
                              className={`rounded-full px-2 py-1 text-xs ${
                                highlight.tone === "cyan"
                                  ? "bg-cyan-50 text-cyan-700"
                                  : highlight.tone === "amber"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {highlight.label}: {highlight.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {typeof item.responsePayload?.batchCheckedAt === "string" ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          {labels.batchCheckedAt}: {formatDate(item.responsePayload.batchCheckedAt, locale)}
                        </p>
                      ) : null}
                      {item.lastError ? (
                        <p className="mt-1 text-xs text-red-600">{labels.lastError}: {item.lastError}</p>
                      ) : null}
                    </div>
                    <div className="text-sm text-neutral-500">
                      <p>{labels.createdAt}: {formatDate(item.createdAt, locale)}</p>
                      <p className="mt-1">{labels.nextAttemptAt}: {formatDate(item.nextAttemptAt, locale)}</p>
                      {item.lastAttemptAt ? <p className="mt-1">{labels.lastAttemptAt}: {formatDate(item.lastAttemptAt, locale)}</p> : null}
                      {item.processedAt ? <p className="mt-1">{labels.processedAt}: {formatDate(item.processedAt, locale)}</p> : null}
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      {canCheckBatch ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => checkBatchResult(item.id)}
                          disabled={batchBusyJobId === item.id}
                        >
                          {batchBusyJobId === item.id ? labels.loading : labels.checkBatchResult}
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-500">{actionHint(item, labels)}</span>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedJob(item)}>
                        {labels.openJobDetail}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {batchResult ? (
        <div className="border-b border-neutral-200 bg-cyan-50/60 p-5">
          <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-neutral-950">{labels.batchResult}</h3>
                <p className="mt-1 text-sm text-neutral-600">{labels.batchResultHint}</p>
                <p className="mt-2 text-xs font-medium text-cyan-800">Batch: {batchResult.batchRequestId}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setBatchResult(null)}>
                {labels.close}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summarizeBatchResult(batchResult).map((item) => (
                <article
                  key={`${item.label}:${item.value}`}
                  className={`rounded-xl border px-3 py-3 ${
                    item.tone === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : item.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{item.label}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-neutral-950">{item.value}</p>
                </article>
              ))}
            </div>
            {summarizeBatchIssues(batchResult, labels).length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-neutral-950">{labels.batchIssueSummary}</p>
                <div className="mt-3 grid gap-2">
                  {summarizeBatchIssues(batchResult, labels).map((item) => (
                    <article key={`${item.key}:${item.status ?? "-"}:${item.reason ?? "-"}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                      <p className="text-sm font-medium text-neutral-900">{item.key}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {labels.batchIssueStatus}: {item.status ?? "-"}
                        {item.reason ? ` • ${labels.batchIssueReason}: ${item.reason}` : ""}
                        {item.recommendedAction ? ` • ${labels.batchIssueRecommendedAction}: ${item.recommendedAction}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
              {JSON.stringify(batchResult.result ?? labels.batchResultEmpty, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {selectedJob ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/30">
          <button type="button" className="absolute inset-0" onClick={() => setSelectedJob(null)} aria-label={labels.close} />
          <aside className="relative h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-neutral-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.jobDetailTitle}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">
                  {channelLabel(selectedJob.channel, labels)} - {jobTypeLabel(selectedJob.jobType, labels)}
                </h3>
                <p className="mt-1 text-sm text-neutral-600">{labels.jobDetailDescription}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                {labels.close}
              </Button>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">{labels.requestPayload}</p>
                <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
                  {JSON.stringify(selectedJob.payload ?? labels.payloadEmpty, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">{labels.responsePayload}</p>
                <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
                  {JSON.stringify(selectedJob.responsePayload ?? labels.payloadEmpty, null, 2)}
                </pre>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="bg-white/90 p-5">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-950">{labels.deadLetters}</h3>
        <div className="mt-3 grid gap-3">
          {deadLetters.length === 0 ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{labels.deadLettersEmpty}</p>
          ) : deadLetters.map((item) => (
            <article key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-rose-100 text-rose-700">{labels.statusDeadLetter}</Badge>
                    <p className="text-sm font-semibold text-neutral-950">{channelLabel(item.channel, labels)}</p>
                    <p className="text-sm text-neutral-600">{jobTypeLabel(item.jobType, labels)}</p>
                  </div>
                  <p className="mt-2 break-all text-sm text-neutral-700">{labels.entityId}: {item.entityId}</p>
                  <p className="mt-1 text-xs text-neutral-500">{labels.attemptProgress}: {item.attemptCount}/{item.maxAttempts} - {labels.createdAt}: {formatDate(item.createdAt, locale)}</p>
                  <p className="mt-2 text-sm text-rose-700">{labels.lastError}: {item.lastError}</p>
                </div>
                {canManage ? (
                  <Button type="button" variant="secondary" onClick={() => retryDeadLetter(item.jobId)} disabled={busy}>
                    {labels.retry}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/30" onClick={closeDrawer} aria-label={labels.close} />
          <aside className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl ${drawerFullscreen ? "max-w-none" : "max-w-2xl"}`}>
            <div className="flex items-start justify-between border-b border-neutral-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">
                  {drawerMode === "create" ? labels.drawerCreateTitle : labels.drawerProcessTitle}
                </h3>
                <p className="mt-1 text-sm text-neutral-500">{labels.drawerDescription}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDrawerFullscreen((prev) => !prev)}
                  disabled={busy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100"
                  aria-label={drawerFullscreen ? "Daralt" : "Tam ekran"}
                >
                  {drawerFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={busy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100"
                  aria-label={labels.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5">
              {drawerMode === "create" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-neutral-600">{labels.channel}</label>
                      <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
                        <SelectTrigger>
                          <SelectValue placeholder={labels.channel} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRENDYOL">{labels.channelTrendyol}</SelectItem>
                          <SelectItem value="N11">{labels.channelN11}</SelectItem>
                          <SelectItem value="PAZARAMA">{labels.channelPazarama}</SelectItem>
                          <SelectItem value="HEPSIBURADA">{labels.channelHepsiburada}</SelectItem>
                          <SelectItem value="EDOCS_MOCK">{labels.channelEDocsMock}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-neutral-600">{labels.jobType}</label>
                      <Select
                        value={jobType}
                        onValueChange={(value) => {
                          const nextJobType = value as JobType;
                          setJobType(nextJobType);
                          setTrigger(defaultTriggerForJobType(nextJobType));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={labels.jobType} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRODUCT_SYNC">{labels.jobTypeProductSync}</SelectItem>
                          <SelectItem value="PRICE_SYNC">{labels.jobTypePriceSync}</SelectItem>
                          <SelectItem value="STOCK_SYNC">{labels.jobTypeStockSync}</SelectItem>
                          <SelectItem value="ORDER_IMPORT">{labels.jobTypeOrderImport}</SelectItem>
                          <SelectItem value="ORDER_STATUS_SYNC">{labels.jobTypeOrderStatusSync}</SelectItem>
                          <SelectItem value="DOCUMENT_OUTBOUND">{labels.jobTypeDocumentOutbound}</SelectItem>
                          <SelectItem value="DOCUMENT_STATUS_SYNC">{labels.jobTypeDocumentStatusSync}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    isStockSync
                      ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                      : "border-neutral-200 bg-neutral-50 text-neutral-700"
                  }`}>
                    {isStockSync ? labels.stockSyncHint : labels.genericSyncHint}
                    <p className="mt-2 text-xs font-medium">
                      {labels.targetEntityType}: {entityTypeLabel(targetEntityType, labels)}
                    </p>
                    <p className="mt-1 text-xs">{targetEntityIdsHint}</p>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-neutral-600">{labels.entityIds}</label>
                    <Textarea
                      value={entityIds}
                      onChange={(event) => setEntityIds(event.target.value)}
                      rows={6}
                      placeholder={targetEntityIdsHint}
                    />
                    <p className="text-xs text-neutral-500">{targetEntityIdsHint}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-neutral-600">{labels.maxAttempts}</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={maxAttempts}
                        onChange={(event) => setMaxAttempts(event.target.value)}
                      />
                    </div>
                    {isStockSync ? (
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-neutral-600">{labels.idempotencySuffix}</label>
                        <Input
                          value={idempotencySuffix}
                          onChange={(event) => setIdempotencySuffix(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>

                  {isStockSync ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-neutral-600">{labels.integrationReference}</label>
                        <Input
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                        />
                        <p className="text-xs text-neutral-500">{labels.stockSyncReferenceHint}</p>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-neutral-600">{labels.triggerPreset}</label>
                        <Select value={trigger} onValueChange={(value) => setTrigger(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={labels.triggerPreset} />
                          </SelectTrigger>
                          <SelectContent>
                            {triggerOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                              {triggerLabel(option, labels)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-500">{labels.stockSyncTriggerHint}</p>
                      </div>
                    </div>
                  ) : null}

                  <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                    <input type="checkbox" checked={forceFail} onChange={(event) => setForceFail(event.target.checked)} />
                    {labels.forceFail}
                  </label>
                </>
              ) : (
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-neutral-600">{labels.queueLimit}</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={queueLimit}
                    onChange={(event) => setQueueLimit(event.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-5 py-4">
              <Button type="button" variant="secondary" onClick={closeDrawer} disabled={busy}>
                {labels.close}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void (drawerMode === "create" ? createJob() : processQueue());
                }}
                disabled={busy}
              >
                {busy ? labels.loading : labels.apply}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
