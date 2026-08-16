"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Play, Save, ShieldCheck, ShoppingCart, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { MarketplaceCapabilitySet } from "@/modules/integration/contracts/integration.contract";

type MarketplaceConfig = {
  id: string;
  displayName: string;
  sellerId: string;
  apiKeyMasked: string | null;
  apiSecretMasked: string | null;
  endpointUrl: string | null;
  syncWindowMinutes: number;
  lastSuccessfulSyncAt: string | null;
  isActive: boolean;
};

type MarketplacePackage = {
  id: string;
  configName: string;
  externalPackageId: string;
  externalOrderNumber: string;
  packageStatus: string;
  importStatus: "RECEIVED" | "READY_FOR_ORDER" | "NEEDS_REVIEW" | "ORDER_CREATED" | "FAILED";
  customerName: string | null;
  cargoProviderName: string | null;
  cargoTrackingNumber: string | null;
  lineCount: number;
  matchedLineCount: number;
  needsReviewLineCount: number;
  updatedAt: string;
  latestStatusJob: {
    id: string;
    status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";
    targetStatus: string | null;
    lastError: string | null;
    externalReference: string | null;
    createdAt: string;
    processedAt: string | null;
    deadLetter: {
      id: string;
      resolved: boolean;
      resolvedAt: string | null;
    } | null;
  } | null;
};

type MarketplacePackageLine = {
  id: string;
  externalLineId: string;
  merchantSku: string | null;
  barcode: string | null;
  productName: string;
  quantity: number;
  unitPrice: number | null;
  currency: string;
  matchStatus: "MATCHED" | "UNMATCHED" | "AMBIGUOUS" | "IGNORED";
  productId: string | null;
  productVariantId: string | null;
  matchedProductName: string | null;
  matchedProductSku: string | null;
  matchedVariantTitle: string | null;
  matchedVariantSku: string | null;
};

type MarketplacePackageDetail = MarketplacePackage & {
  lines: MarketplacePackageLine[];
  statusHistory: Array<{
    id: string;
    status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";
    targetStatus: string | null;
    attemptCount: number;
    maxAttempts: number;
    processedAt: string | null;
    lastAttemptAt: string | null;
    createdAt: string;
    lastError: string | null;
    externalReference: string | null;
    deadLetter: {
      id: string;
      resolved: boolean;
      resolvedAt: string | null;
    } | null;
  }>;
};

type ProductOption = {
  value: string;
  label: string;
  description: string | null;
  productId: string;
  productVariantId: string | null;
};

type CarrierCompanyOption = {
  id: string;
  name: string;
  externalCodePazarama: string | null;
};

type Labels = {
  title: string;
  subtitle: string;
  connectionTitle: string;
  displayName: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  endpointUrl: string;
  syncWindowMinutes: string;
  save: string;
  manualSync: string;
  packagesTitle: string;
  emptyPackages: string;
  activeAccounts: string;
  packages: string;
  readyForOrder: string;
  needsReview: string;
  lastSync: string;
  matchedLines: string;
  matchLine: string;
  selectProduct: string;
  searchProduct: string;
  noProductResults: string;
  packageDetail: string;
  lineMatchSaved: string;
  lineNeedsReviewHint: string;
  lineSuggestedSearch: string;
  createProductFromLine: string;
  ignoreLine: string;
  lineIgnored: string;
  createOrder: string;
  orderCreated: string;
  notifyPicking: string;
  statusSyncQueued: string;
  statusHistory: string;
  noStatusHistory: string;
  targetStatus: string;
  attempts: string;
  packageStatusLabel: string;
  cargoLabel: string;
  externalReferenceShort: string;
  deadLetterResolved: string;
  statusLabelQueued: string;
  statusLabelSending: string;
  statusLabelSent: string;
  statusLabelFailed: string;
  statusLabelDeadLetter: string;
  packageListLatestJobLabel: string;
  packageListDeadLetterLabel: string;
  packageListFailedLabel: string;
  closeLabel: string;
  nextActionTitle: string;
  nextActionReviewLines: string;
  nextActionCreateOrder: string;
  nextActionNotifyPicking: string;
  nextActionSplitPackage: string;
  nextActionRetryDeadLetter: string;
  nextActionReviewFailure: string;
  nextActionHealthy: string;
  operationsTitle: string;
  operationsHint: string;
  openOperations: string;
  packageListActionLabel: string;
  selectProductRequired: string;
  splitQuantityRequired: string;
  splitQuantityInvalid: string;
  retryQueued: string;
  retryStatusJob: string;
  splitPackage: string;
  splitPackageHint: string;
  splitQuantity: string;
  splitCreated: string;
  testConnection: string;
  connectionTested: string;
  capabilitiesTitle: string;
  capabilitiesHint: string;
  capabilityAvailable: string;
  capabilityLimited: string;
  capabilityOrderImport: string;
  capabilityProductSync: string;
  capabilityPriceSync: string;
  capabilityStockSync: string;
  capabilityPickingStatus: string;
  capabilityInvoicedStatus: string;
  capabilityPackageSplit: string;
  capabilityBrandMapping: string;
  capabilityCategoryMapping: string;
  capabilityAttributeMapping: string;
  capabilityAdvancedPreflight: string;
  queued: string;
  operationFailed: string;
  loading: string;
  invoicedFormTitle: string;
  invoicedCarrierLabel: string;
  invoicedCarrierPlaceholder: string;
  invoicedTrackingNumberLabel: string;
  invoicedSubmit: string;
  invoicedCarrierMissingCode: string;
  invoicedTrackingNumberRequired: string;
  invoicedNotSupported: string;
  nextActionNotifyInvoiced: string;
};

type DashboardResult = {
  configs: MarketplaceConfig[];
  packages: MarketplacePackage[];
  summary: {
    activeConfigCount: number;
    packageCount: number;
    readyForOrderCount: number;
    needsReviewCount: number;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: MarketplacePackage["importStatus"]) {
  if (status === "READY_FOR_ORDER") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "NEEDS_REVIEW") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-neutral-100 text-neutral-700";
}

function getAdminProductCreateUrl(locale: string, line: MarketplacePackageLine) {
  const params = new URLSearchParams();
  params.set("search", line.barcode ?? line.merchantSku ?? line.productName);
  params.set("source", "marketplace");
  return `/${locale}/admin/products?${params.toString()}`;
}

function getCapabilityItems(capabilities: MarketplaceCapabilitySet, labels: Labels) {
  return [
    { label: labels.capabilityOrderImport, enabled: capabilities.supportsOrderImport },
    { label: labels.capabilityProductSync, enabled: capabilities.supportsProductSync },
    { label: labels.capabilityPriceSync, enabled: capabilities.supportsPriceSync },
    { label: labels.capabilityStockSync, enabled: capabilities.supportsStockSync },
    { label: labels.capabilityPickingStatus, enabled: capabilities.supportsStatusPicking },
    { label: labels.capabilityInvoicedStatus, enabled: capabilities.supportsStatusInvoiced },
    { label: labels.capabilityPackageSplit, enabled: capabilities.supportsPackageSplit },
    { label: labels.capabilityBrandMapping, enabled: capabilities.requiresBrandMapping },
    { label: labels.capabilityCategoryMapping, enabled: capabilities.requiresCategoryMapping },
    { label: labels.capabilityAttributeMapping, enabled: capabilities.requiresAttributeMapping },
    { label: labels.capabilityAdvancedPreflight, enabled: capabilities.preflightLevel === "ADVANCED" },
  ];
}

function resolveNextActionSummary(item: MarketplacePackageDetail, labels: Labels, capabilities: MarketplaceCapabilitySet) {
  const latestStatusJob = item.statusHistory[0] ?? null;

  if (item.needsReviewLineCount > 0) {
    return {
      tone: "amber" as const,
      text: labels.nextActionReviewLines,
    };
  }

  if (latestStatusJob?.status === "DEAD_LETTER" && latestStatusJob.deadLetter && !latestStatusJob.deadLetter.resolved) {
    return {
      tone: "rose" as const,
      text: labels.nextActionRetryDeadLetter,
    };
  }

  if (latestStatusJob?.status === "FAILED") {
    return {
      tone: "rose" as const,
      text: labels.nextActionReviewFailure,
    };
  }

  if (item.importStatus === "READY_FOR_ORDER") {
    return {
      tone: "emerald" as const,
      text: labels.nextActionCreateOrder,
    };
  }

  if (item.importStatus === "ORDER_CREATED" && item.packageStatus !== "Picking" && item.packageStatus !== "Invoiced") {
    return {
      tone: "cyan" as const,
      text: labels.nextActionNotifyPicking,
    };
  }

  if (item.packageStatus === "Picking" && capabilities.supportsStatusInvoiced) {
    return {
      tone: "cyan" as const,
      text: labels.nextActionNotifyInvoiced,
    };
  }

  if (item.packageStatus === "Picking" && capabilities.supportsPackageSplit) {
    return {
      tone: "cyan" as const,
      text: labels.nextActionSplitPackage,
    };
  }

  return {
    tone: "neutral" as const,
    text: labels.nextActionHealthy,
  };
}

function resolvePackageListHint(item: MarketplacePackage, labels: Labels, capabilities: MarketplaceCapabilitySet) {
  if (item.needsReviewLineCount > 0) {
    return {
      tone: "amber" as const,
      text: labels.nextActionReviewLines,
    };
  }

  if (item.importStatus === "READY_FOR_ORDER") {
    return {
      tone: "emerald" as const,
      text: labels.nextActionCreateOrder,
    };
  }

  if (item.importStatus === "ORDER_CREATED" && item.packageStatus !== "Picking" && item.packageStatus !== "Invoiced") {
    return {
      tone: "cyan" as const,
      text: labels.nextActionNotifyPicking,
    };
  }

  if (item.packageStatus === "Picking" && capabilities.supportsStatusInvoiced) {
    return {
      tone: "cyan" as const,
      text: labels.nextActionNotifyInvoiced,
    };
  }

  if (item.packageStatus === "Picking" && capabilities.supportsPackageSplit) {
    return {
      tone: "cyan" as const,
      text: labels.nextActionSplitPackage,
    };
  }

  return {
    tone: "neutral" as const,
    text: labels.nextActionHealthy,
  };
}

function formatBusinessStatusLabel(status: MarketplacePackageDetail["statusHistory"][number]["status"], labels: Labels) {
  if (status === "PENDING") {
    return labels.statusLabelQueued;
  }

  if (status === "PROCESSING") {
    return labels.statusLabelSending;
  }

  if (status === "SUCCESS") {
    return labels.statusLabelSent;
  }

  if (status === "FAILED") {
    return labels.statusLabelFailed;
  }

  return labels.statusLabelDeadLetter;
}

export function N11IntegrationManager({
  labels,
  locale,
  canManage,
  channel = "N11",
  initialConfigs,
  initialPackages,
  capabilities,
  productOptions,
  carrierCompanies,
  summary,
}: {
  labels: Labels;
  locale: string;
  canManage: boolean;
  channel?: "N11" | "PAZARAMA";
  initialConfigs: MarketplaceConfig[];
  initialPackages: MarketplacePackage[];
  capabilities: MarketplaceCapabilitySet;
  productOptions: ProductOption[];
  carrierCompanies: CarrierCompanyOption[];
  summary: DashboardResult["summary"];
}) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [packages, setPackages] = useState(initialPackages);
  const [dashboardSummary, setDashboardSummary] = useState(summary);
  const [displayName, setDisplayName] = useState(configs[0]?.displayName ?? (channel === "PAZARAMA" ? "Pazarama" : "N11"));
  const [sellerId, setSellerId] = useState(configs[0]?.sellerId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [endpointUrl, setEndpointUrl] = useState(configs[0]?.endpointUrl ?? "");
  const [syncWindowMinutes, setSyncWindowMinutes] = useState(String(configs[0]?.syncWindowMinutes ?? 60));
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<MarketplacePackageDetail | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [splitQuantities, setSplitQuantities] = useState<Record<string, string>>({});
  const [invoicedCarrierCompanyId, setInvoicedCarrierCompanyId] = useState("");
  const [invoicedTrackingNumber, setInvoicedTrackingNumber] = useState("");
  const capabilityItems = getCapabilityItems(capabilities, labels);

  const activeConfig = configs[0] ?? null;
  const canNotifyPicking = selectedPackage ? selectedPackage.packageStatus !== "Picking" && selectedPackage.packageStatus !== "Invoiced" : false;
  const canNotifyInvoiced = capabilities.supportsStatusInvoiced && (selectedPackage ? selectedPackage.packageStatus === "Picking" : false);
  const nextActionSummary = selectedPackage ? resolveNextActionSummary(selectedPackage, labels, capabilities) : null;
  const latestStatusJob = selectedPackage?.statusHistory[0] ?? null;

  async function refreshDashboard() {
    const response = await fetch(`/api/admin/integrations/marketplaces/dashboard?channel=${channel}`);

    if (!response.ok) {
      throw new Error(labels.operationFailed);
    }

    const result = await response.json() as DashboardResult;
    setConfigs(result.configs);
    setPackages(result.packages);
    setDashboardSummary(result.summary);
  }

  async function saveConfig() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/integrations/marketplaces/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(activeConfig ? { id: activeConfig.id } : {}),
          channel,
          displayName,
          sellerId,
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
          userAgent: "",
          endpointUrl: endpointUrl || null,
          environment: "PRODUCTION",
          syncWindowMinutes: Number(syncWindowMinutes),
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const result = await response.json() as MarketplaceConfig;
      setConfigs([result, ...configs.filter((item) => item.id !== result.id)]);
      setApiKey("");
      setApiSecret("");
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/integrations/marketplaces/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          ...(activeConfig ? { id: activeConfig.id } : {}),
          sellerId,
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
          endpointUrl: endpointUrl || null,
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      setNotice(labels.connectionTested);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!activeConfig) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/integrations/marketplaces/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          id: activeConfig.id,
          ...(channel === "N11" ? { status: "Created" } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!workerResponse.ok) {
        throw new Error(labels.operationFailed);
      }

      await refreshDashboard();
      setNotice(labels.queued);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function openPackageDetail(packageId: string) {
    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${packageId}`);
      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const result = await response.json() as MarketplacePackageDetail;
      setSelectedPackage(result);
      setSelectedTargets(Object.fromEntries(result.lines.map((line) => [
        line.id,
        line.productId ? `${line.productId}:${line.productVariantId ?? ""}` : "",
      ])));
      setSplitQuantities(Object.fromEntries(result.lines.map((line) => [line.id, ""])));
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function matchLine(lineId: string) {
    const selected = productOptions.find((item) => item.value === selectedTargets[lineId]);
    if (!selected) {
      setError(labels.selectProductRequired);
      setNotice(null);
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/lines/${lineId}/match`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.productId,
          productVariantId: selected.productVariantId,
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const result = await response.json() as MarketplacePackageDetail;
      setSelectedPackage(result);
      setSelectedTargets(Object.fromEntries(result.lines.map((line) => [
        line.id,
        line.productId ? `${line.productId}:${line.productVariantId ?? ""}` : "",
      ])));
      setSplitQuantities(Object.fromEntries(result.lines.map((line) => [line.id, ""])));
      await refreshDashboard();
      setNotice(labels.lineMatchSaved);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function ignoreLine(lineId: string) {
    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/lines/${lineId}/ignore`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const result = await response.json() as MarketplacePackageDetail;
      setSelectedPackage(result);
      setSelectedTargets(Object.fromEntries(result.lines.map((line) => [
        line.id,
        line.productId ? `${line.productId}:${line.productVariantId ?? ""}` : "",
      ])));
      setSplitQuantities(Object.fromEntries(result.lines.map((line) => [line.id, ""])));
      await refreshDashboard();
      setNotice(labels.lineIgnored);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function splitPackage() {
    if (!selectedPackage) {
      return;
    }

    const rawSplits = selectedPackage.lines.map((line) => ({
      lineId: line.id,
      quantity: Number(splitQuantities[line.id] ?? 0),
      maxQuantity: line.quantity,
    }));

    const invalidSplit = rawSplits.find((item) => (
      Number.isNaN(item.quantity)
      || !Number.isInteger(item.quantity)
      || item.quantity < 0
      || item.quantity > item.maxQuantity
    ));

    if (invalidSplit) {
      setError(labels.splitQuantityInvalid);
      setNotice(null);
      return;
    }

    const splits = rawSplits
      .filter((item) => item.quantity > 0)
      .map(({ lineId, quantity }) => ({ lineId, quantity }));

    if (splits.length === 0) {
      setError(labels.splitQuantityRequired);
      setNotice(null);
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setNotice(labels.splitCreated);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function createOrder() {
    if (!selectedPackage) {
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/create-order`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const result = await response.json() as MarketplacePackageDetail;
      setSelectedPackage(result);
      await refreshDashboard();
      setNotice(labels.orderCreated);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function queuePickingSync() {
    if (!selectedPackage) {
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/status-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          status: "Picking",
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!workerResponse.ok) {
        throw new Error(labels.operationFailed);
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setNotice(labels.statusSyncQueued);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function queueInvoicedSync() {
    if (!selectedPackage) {
      return;
    }

    const carrier = carrierCompanies.find((item) => item.id === invoicedCarrierCompanyId);

    if (!carrier || !carrier.externalCodePazarama) {
      setError(labels.invoicedCarrierMissingCode);
      return;
    }

    if (!invoicedTrackingNumber.trim()) {
      setError(labels.invoicedTrackingNumberRequired);
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/status-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          status: "Invoiced",
          cargoCompanyId: carrier.externalCodePazarama,
          shippingTrackingNumber: invoicedTrackingNumber.trim(),
          carrierCompanyId: carrier.id,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!workerResponse.ok) {
        throw new Error(labels.operationFailed);
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setInvoicedCarrierCompanyId("");
      setInvoicedTrackingNumber("");
      setNotice(labels.statusSyncQueued);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function retryStatusJob(jobId: string) {
    if (!selectedPackage) {
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/status-jobs/${jobId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!workerResponse.ok) {
        throw new Error(labels.operationFailed);
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setNotice(labels.retryQueued);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{labels.connectionTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">{labels.subtitle}</p>
          </div>
          <Button type="button" onClick={syncNow} disabled={!canManage || !activeConfig || busy} variant="secondary">
            <Play className="h-4 w-4" />
            {busy ? labels.loading : labels.manualSync}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.activeAccounts}</p>
            <p className="mt-2 text-xl font-semibold text-neutral-950">{dashboardSummary.activeConfigCount}</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.packages}</p>
            <p className="mt-2 text-xl font-semibold text-neutral-950">{dashboardSummary.packageCount}</p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{labels.readyForOrder}</p>
            <p className="mt-2 text-xl font-semibold text-emerald-800">{dashboardSummary.readyForOrderCount}</p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{labels.needsReview}</p>
            <p className="mt-2 text-xl font-semibold text-amber-800">{dashboardSummary.needsReviewCount}</p>
          </article>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-neutral-950">{labels.capabilitiesTitle}</h3>
            <p className="text-sm text-neutral-500">{labels.capabilitiesHint}</p>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {capabilityItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                <span className="text-neutral-700">{item.label}</span>
                <Badge className={item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>
                  {item.enabled ? labels.capabilityAvailable : labels.capabilityLimited}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={labels.displayName} disabled={!canManage || busy} />
          <Input value={sellerId} onChange={(event) => setSellerId(event.target.value)} placeholder={labels.sellerId} disabled={!canManage || busy} />
          <Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={activeConfig?.apiKeyMasked ?? labels.apiKey} disabled={!canManage || busy} />
          <Input value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} placeholder={activeConfig?.apiSecretMasked ?? labels.apiSecret} disabled={!canManage || busy} type="password" />
          <Input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder={labels.endpointUrl} disabled={!canManage || busy} />
          <Input value={syncWindowMinutes} onChange={(event) => setSyncWindowMinutes(event.target.value)} placeholder={labels.syncWindowMinutes} disabled={!canManage || busy} type="number" min={15} max={1440} />
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 md:col-span-2">
            <span>{labels.lastSync}</span>
            <span className="font-medium text-neutral-950">{formatDate(activeConfig?.lastSuccessfulSyncAt ?? null)}</span>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={testConnection} disabled={!canManage || busy} variant="secondary" className="mr-3">
            <ShieldCheck className="h-4 w-4" />
            {labels.testConnection}
          </Button>
          <Button type="button" onClick={saveConfig} disabled={!canManage || busy}>
            <Save className="h-4 w-4" />
            {labels.save}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-5">
          <h3 className="text-lg font-semibold text-neutral-950">{labels.packagesTitle}</h3>
        </div>
        <div className="divide-y divide-neutral-200">
          {packages.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">{labels.emptyPackages}</p>
          ) : packages.map((item) => {
            const packageHint = resolvePackageListHint(item, labels, capabilities);

            return (
            <article key={item.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_150px_180px_220px_110px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-neutral-950">{item.externalOrderNumber}</p>
                  <Badge className={statusClass(item.importStatus)}>{item.importStatus}</Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">{item.customerName ?? item.configName} - {item.externalPackageId}</p>
              </div>
              <p className="text-sm text-neutral-600">{item.packageStatus}</p>
              <p className="text-sm text-neutral-600">{item.cargoProviderName ?? "-"} {item.cargoTrackingNumber ? `- ${item.cargoTrackingNumber}` : ""}</p>
              <div className="text-sm text-neutral-600">
                <p>{item.matchedLineCount}/{item.lineCount} {labels.matchedLines}</p>
                <p className="mt-1 text-xs text-amber-700">{item.needsReviewLineCount} {labels.needsReview}</p>
                {item.latestStatusJob ? (
                  <div className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
                    item.latestStatusJob.status === "DEAD_LETTER"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : item.latestStatusJob.status === "FAILED"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-neutral-200 bg-white text-neutral-700"
                  }`}>
                    <p className="font-semibold">{labels.packageListLatestJobLabel}: {formatBusinessStatusLabel(item.latestStatusJob.status, labels)}</p>
                    {item.latestStatusJob.status === "DEAD_LETTER" ? (
                      <p className="mt-1">{labels.packageListDeadLetterLabel}</p>
                    ) : item.latestStatusJob.status === "FAILED" ? (
                      <p className="mt-1">{labels.packageListFailedLabel}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
                  packageHint.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : packageHint.tone === "cyan"
                      ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                      : packageHint.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700"
                }`}>
                  <span className="font-semibold">{labels.packageListActionLabel}:</span> {packageHint.text}
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => openPackageDetail(item.id)} disabled={detailBusy}>
                <Eye className="h-4 w-4" />
                {labels.packageDetail}
              </Button>
            </article>
          )})}
        </div>
      </div>

      {selectedPackage ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/30">
          <aside className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.packageDetail}</p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-950">{selectedPackage.externalOrderNumber}</h3>
                <p className="mt-1 text-sm text-neutral-500">{selectedPackage.customerName ?? selectedPackage.configName}</p>
              </div>
              <div className="flex items-center gap-2">
                {capabilities.supportsStatusPicking ? (
                  <Button
                    type="button"
                    onClick={queuePickingSync}
                    disabled={!canManage || detailBusy || !canNotifyPicking}
                    size="sm"
                    variant="secondary"
                  >
                    {labels.notifyPicking}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={createOrder}
                  disabled={!canManage || detailBusy || selectedPackage.importStatus !== "READY_FOR_ORDER"}
                  size="sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {labels.createOrder}
                </Button>
                {capabilities.supportsPackageSplit ? (
                  <Button
                    type="button"
                    onClick={splitPackage}
                    disabled={!canManage || detailBusy || selectedPackage.packageStatus !== "Picking" || selectedPackage.lines.every((line) => !splitQuantities[line.id])}
                    size="sm"
                    variant="secondary"
                  >
                    {labels.splitPackage}
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100"
                  aria-label={labels.closeLabel}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5">
              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

              <div className={`rounded-lg border px-4 py-3 ${
                nextActionSummary?.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50"
                  : nextActionSummary?.tone === "cyan"
                    ? "border-cyan-200 bg-cyan-50"
                    : nextActionSummary?.tone === "rose"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50"
              }`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.nextActionTitle}</p>
                <p className="mt-2 text-sm font-medium text-neutral-900">{nextActionSummary?.text}</p>
              </div>

              {capabilities.supportsStatusInvoiced && selectedPackage.packageStatus === "Picking" ? (
                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.invoicedFormTitle}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-neutral-600">{labels.invoicedCarrierLabel}</label>
                      <select
                        value={invoicedCarrierCompanyId}
                        onChange={(event) => setInvoicedCarrierCompanyId(event.target.value)}
                        className="h-10 rounded-md border border-neutral-300 px-3 text-sm"
                        disabled={!canManage || detailBusy}
                      >
                        <option value="">{labels.invoicedCarrierPlaceholder}</option>
                        {carrierCompanies.map((carrier) => (
                          <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-neutral-600">{labels.invoicedTrackingNumberLabel}</label>
                      <input
                        value={invoicedTrackingNumber}
                        onChange={(event) => setInvoicedTrackingNumber(event.target.value)}
                        className="h-10 rounded-md border border-neutral-300 px-3 text-sm"
                        disabled={!canManage || detailBusy}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={queueInvoicedSync} disabled={!canManage || detailBusy || !canNotifyInvoiced} size="sm">
                        {labels.invoicedSubmit}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !capabilities.supportsStatusInvoiced && selectedPackage.packageStatus === "Picking" ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.invoicedFormTitle}</p>
                  <p className="mt-2 text-sm text-neutral-600">{labels.invoicedNotSupported}</p>
                </div>
              ) : null}

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{labels.operationsTitle}</p>
                    <p className="mt-2 text-sm text-neutral-700">{labels.operationsHint}</p>
                    {latestStatusJob ? (
                      <div className="mt-3 space-y-1 text-xs text-neutral-600">
                        <p>Son iş durumu: {formatBusinessStatusLabel(latestStatusJob.status, labels)}</p>
                        <p>Hedef statü: {latestStatusJob.targetStatus ?? "-"}</p>
                        <p>Son deneme: {formatDate(latestStatusJob.processedAt ?? latestStatusJob.lastAttemptAt ?? latestStatusJob.createdAt)}</p>
                        {latestStatusJob.externalReference ? (
                          <p>{labels.externalReferenceShort}: {latestStatusJob.externalReference}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <Button asChild type="button" variant="secondary" size="sm">
                    <Link href={`/${locale}/admin/integrations?channel=N11&search=${encodeURIComponent(selectedPackage.id)}`}>
                      {labels.openOperations}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.packageStatusLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">{selectedPackage.packageStatus}</p>
                  <p className="mt-1 text-xs text-neutral-500">{selectedPackage.externalPackageId}</p>
                </article>
                <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.cargoLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">{selectedPackage.cargoProviderName ?? "-"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{selectedPackage.cargoTrackingNumber ?? "-"}</p>
                </article>
                <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.lastSync}</p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">{formatDate(selectedPackage.updatedAt)}</p>
                  <p className="mt-1 text-xs text-neutral-500">{selectedPackage.importStatus}</p>
                </article>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.packages}</p>
                  <p className="mt-2 text-xl font-semibold text-neutral-950">{selectedPackage.lineCount}</p>
                </article>
                <article className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{labels.matchedLines}</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-800">{selectedPackage.matchedLineCount}</p>
                </article>
                <article className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{labels.needsReview}</p>
                  <p className="mt-2 text-xl font-semibold text-amber-800">{selectedPackage.needsReviewLineCount}</p>
                </article>
              </div>

              {capabilities.supportsPackageSplit ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <h4 className="text-sm font-semibold text-neutral-950">{labels.splitPackage}</h4>
                  <p className="mt-1 text-xs text-neutral-500">{labels.splitPackageHint}</p>
                  <div className="mt-3 grid gap-3">
                    {selectedPackage.lines.map((line) => (
                      <div key={`${line.id}-split`} className="grid gap-2 md:grid-cols-[1fr_140px] md:items-center">
                        <div className="text-sm text-neutral-700">
                          {line.productName}
                          <span className="ml-2 text-neutral-500">Mevcut: {line.quantity}</span>
                        </div>
                        <Input
                          value={splitQuantities[line.id] ?? ""}
                          onChange={(event) => setSplitQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
                          placeholder={labels.splitQuantity}
                          disabled={!canManage || detailBusy || selectedPackage.packageStatus !== "Picking"}
                          type="number"
                          min={0}
                          max={line.quantity}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-neutral-200 p-4">
                <h4 className="text-sm font-semibold text-neutral-950">{labels.statusHistory}</h4>
                <div className="mt-3 grid gap-2">
                  {selectedPackage.statusHistory.length === 0 ? (
                    <p className="text-sm text-neutral-500">{labels.noStatusHistory}</p>
                  ) : selectedPackage.statusHistory.map((item) => (
                    <article key={item.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={item.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : item.status === "FAILED" || item.status === "DEAD_LETTER" ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-700"}>
                            {formatBusinessStatusLabel(item.status, labels)}
                          </Badge>
                          <span className="text-sm font-medium text-neutral-800">{labels.targetStatus}: {item.targetStatus ?? "-"}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{formatDate(item.processedAt ?? item.lastAttemptAt ?? item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">{labels.attempts}: {item.attemptCount}/{item.maxAttempts}</p>
                      {item.externalReference ? (
                        <p className="mt-1 break-all text-xs text-neutral-500">{labels.externalReferenceShort}: {item.externalReference}</p>
                      ) : null}
                      {item.lastError ? <p className="mt-1 break-all text-xs text-rose-700">{item.lastError}</p> : null}
                      {item.deadLetter?.resolved && item.deadLetter.resolvedAt ? (
                        <p className="mt-1 text-xs text-emerald-700">{labels.deadLetterResolved}: {formatDate(item.deadLetter.resolvedAt)}</p>
                      ) : null}
                      {item.status === "DEAD_LETTER" && item.deadLetter && !item.deadLetter.resolved ? (
                        <div className="mt-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => retryStatusJob(item.id)} disabled={!canManage || detailBusy}>
                            {labels.retryStatusJob}
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              {selectedPackage.lines.map((line) => (
                <article key={line.id} className="rounded-lg border border-neutral-200 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-neutral-950">{line.productName}</p>
                      <Badge className={line.matchStatus === "MATCHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {line.matchStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {line.quantity} x {line.unitPrice ?? "-"} {line.currency}
                      {line.merchantSku ? ` - ${line.merchantSku}` : ""}
                      {line.barcode ? ` - ${line.barcode}` : ""}
                    </p>
                    {line.matchedProductName ? (
                      <p className="mt-2 text-sm text-emerald-700">
                        {line.matchedProductName}
                        {line.matchedVariantTitle ? ` / ${line.matchedVariantTitle}` : ""}
                        {line.matchedVariantSku ?? line.matchedProductSku ? ` - ${line.matchedVariantSku ?? line.matchedProductSku}` : ""}
                      </p>
                    ) : null}
                    {line.matchStatus !== "MATCHED" ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <p className="font-medium">{labels.lineNeedsReviewHint}</p>
                        <p className="mt-1 text-xs">{labels.lineSuggestedSearch}: {line.barcode ?? line.merchantSku ?? line.productName}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <SearchableSelect
                      value={selectedTargets[line.id] ?? ""}
                      onValueChange={(value) => setSelectedTargets((current) => ({ ...current, [line.id]: value }))}
                      options={productOptions}
                      placeholder={labels.selectProduct}
                      searchPlaceholder={labels.searchProduct}
                      emptyLabel={labels.noProductResults}
                    />
                    <Button type="button" onClick={() => matchLine(line.id)} disabled={!canManage || detailBusy || !selectedTargets[line.id]}>
                      {labels.matchLine}
                    </Button>
                    {line.matchStatus !== "MATCHED" ? (
                      <>
                        <Button type="button" variant="secondary" asChild>
                          <a href={getAdminProductCreateUrl(locale, line)}>{labels.createProductFromLine}</a>
                        </Button>
                        <Button type="button" variant="secondary" disabled={!canManage || detailBusy || line.matchStatus === "IGNORED"} onClick={() => ignoreLine(line.id)}>
                          {labels.ignoreLine}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
