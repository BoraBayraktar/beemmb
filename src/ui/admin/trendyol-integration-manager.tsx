"use client";

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
  userAgent: string;
  storeFrontCode: string | null;
  endpointUrl: string | null;
  trendyolCargoCompanyId: number | null;
  trendyolShipmentAddressId: number | null;
  trendyolReturningAddressId: number | null;
  trendyolOrigin: string | null;
  trendyolDimensionalWeight: number | null;
  environment: "PRODUCTION" | "STAGE";
  syncWindowMinutes: number;
  lastSuccessfulSyncAt: string | null;
  lastCursorAt: string | null;
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
    invoiceNumber: string | null;
    attemptCount: number;
    maxAttempts: number;
    nextAttemptAt: string;
    lastAttemptAt: string | null;
    processedAt: string | null;
    lastError: string | null;
    externalReference: string | null;
    createdAt: string;
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

type Labels = {
  title: string;
  subtitle: string;
  connectionTitle: string;
  displayName: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  userAgent: string;
  storeFrontCode: string;
  productV2DefaultsTitle: string;
  productV2DefaultsDescription: string;
  productV2CargoCompanyId: string;
  productV2ShipmentAddressId: string;
  productV2ReturningAddressId: string;
  productV2Origin: string;
  productV2DimensionalWeight: string;
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
  splitPackage: string;
  splitPackageTitle: string;
  splitPackageHint: string;
  splitPackageQuantity: string;
  splitPackageSuccess: string;
  splitPackageInvalid: string;
  unsuppliedTitle: string;
  unsuppliedHint: string;
  unsuppliedQuantity: string;
  unsuppliedReasonPlaceholder: string;
  unsuppliedSubmit: string;
  unsuppliedSuccess: string;
  unsuppliedInvalid: string;
  unsuppliedReasonStockOut: string;
  unsuppliedReasonDefective: string;
  unsuppliedReasonWrongPrice: string;
  unsuppliedReasonIntegrationError: string;
  unsuppliedReasonBulkPurchase: string;
  unsuppliedReasonForceMajeure: string;
  createOrder: string;
  orderCreated: string;
  notifyPicking: string;
  notifyInvoiced: string;
  invoiceNumber: string;
  statusSyncQueued: string;
  statusHistory: string;
  noStatusHistory: string;
  targetStatus: string;
  attempts: string;
  packageStatusLabel: string;
  cargoLabel: string;
  externalReferenceShort: string;
  deadLetterResolved: string;
  closeLabel: string;
  retryStatusJob: string;
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
  capabilityUnsuppliedCancel: string;
  capabilityBrandMapping: string;
  capabilityCategoryMapping: string;
  capabilityAttributeMapping: string;
  capabilityAdvancedPreflight: string;
  queued: string;
  operationFailed: string;
  loading: string;
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
  params.set("source", "trendyol");
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
    { label: labels.capabilityUnsuppliedCancel, enabled: capabilities.supportsUnsuppliedCancel },
    { label: labels.capabilityBrandMapping, enabled: capabilities.requiresBrandMapping },
    { label: labels.capabilityCategoryMapping, enabled: capabilities.requiresCategoryMapping },
    { label: labels.capabilityAttributeMapping, enabled: capabilities.requiresAttributeMapping },
    { label: labels.capabilityAdvancedPreflight, enabled: capabilities.preflightLevel === "ADVANCED" },
  ];
}

function getUnsuppliedReasonOptions(labels: Labels) {
  return [
    { id: 500, label: labels.unsuppliedReasonStockOut },
    { id: 501, label: labels.unsuppliedReasonDefective },
    { id: 502, label: labels.unsuppliedReasonWrongPrice },
    { id: 504, label: labels.unsuppliedReasonIntegrationError },
    { id: 505, label: labels.unsuppliedReasonBulkPurchase },
    { id: 506, label: labels.unsuppliedReasonForceMajeure },
  ];
}

export function TrendyolIntegrationManager({
  labels,
  locale,
  canManage,
  initialConfigs,
  initialPackages,
  capabilities,
  productOptions,
  summary,
}: {
  labels: Labels;
  locale: string;
  canManage: boolean;
  initialConfigs: MarketplaceConfig[];
  initialPackages: MarketplacePackage[];
  capabilities: MarketplaceCapabilitySet;
  productOptions: ProductOption[];
  summary: {
    activeConfigCount: number;
    packageCount: number;
    readyForOrderCount: number;
    needsReviewCount: number;
  };
}) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [packages, setPackages] = useState(initialPackages);
  const [dashboardSummary, setDashboardSummary] = useState(summary);
  const [displayName, setDisplayName] = useState(configs[0]?.displayName ?? "Trendyol");
  const [sellerId, setSellerId] = useState(configs[0]?.sellerId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [userAgent, setUserAgent] = useState(configs[0]?.userAgent ?? "BEEMMB BEEMMB");
  const [storeFrontCode, setStoreFrontCode] = useState(configs[0]?.storeFrontCode ?? "");
  const [productV2CargoCompanyId, setProductV2CargoCompanyId] = useState(configs[0]?.trendyolCargoCompanyId ? String(configs[0].trendyolCargoCompanyId) : "");
  const [productV2ShipmentAddressId, setProductV2ShipmentAddressId] = useState(configs[0]?.trendyolShipmentAddressId != null ? String(configs[0].trendyolShipmentAddressId) : "");
  const [productV2ReturningAddressId, setProductV2ReturningAddressId] = useState(configs[0]?.trendyolReturningAddressId != null ? String(configs[0].trendyolReturningAddressId) : "");
  const [productV2Origin, setProductV2Origin] = useState(configs[0]?.trendyolOrigin ?? "");
  const [productV2DimensionalWeight, setProductV2DimensionalWeight] = useState(configs[0]?.trendyolDimensionalWeight ? String(configs[0].trendyolDimensionalWeight) : "");
  const [endpointUrl, setEndpointUrl] = useState(configs[0]?.endpointUrl ?? "");
  const [syncWindowMinutes, setSyncWindowMinutes] = useState(String(configs[0]?.syncWindowMinutes ?? 60));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<MarketplacePackageDetail | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [splitLineIds, setSplitLineIds] = useState<string[]>([]);
  const [splitQuantities, setSplitQuantities] = useState<Record<string, string>>({});
  const [unsuppliedLineIds, setUnsuppliedLineIds] = useState<string[]>([]);
  const [unsuppliedQuantities, setUnsuppliedQuantities] = useState<Record<string, string>>({});
  const [unsuppliedReasonId, setUnsuppliedReasonId] = useState("");
  const capabilityItems = getCapabilityItems(capabilities, labels);
  const unsuppliedReasonOptions = getUnsuppliedReasonOptions(labels);

  const activeConfig = configs[0] ?? null;
  const canNotifyPicking = selectedPackage ? selectedPackage.packageStatus !== "Picking" && selectedPackage.packageStatus !== "Invoiced" : false;
  const canNotifyInvoiced = selectedPackage ? selectedPackage.packageStatus === "Picking" : false;
  const canSplitSelectedPackage = Boolean(
    selectedPackage
      && capabilities.supportsPackageSplit
      && selectedPackage.lines.length > 1
      && selectedPackage.packageStatus !== "Invoiced"
      && selectedPackage.packageStatus !== "Shipped"
      && selectedPackage.packageStatus !== "Delivered",
  );
  const splitSelectsWholePackage = Boolean(selectedPackage && selectedPackage.lines.every((line) => (
    splitLineIds.includes(line.id) && Number(splitQuantities[line.id] ?? "1") >= line.quantity
  )));
  const canCancelUnsuppliedSelectedPackage = Boolean(
    selectedPackage
      && capabilities.supportsUnsuppliedCancel
      && selectedPackage.packageStatus !== "Invoiced"
      && selectedPackage.packageStatus !== "Shipped"
      && selectedPackage.packageStatus !== "Delivered"
      && selectedPackage.packageStatus !== "Cancelled",
  );

  async function saveConfig() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/integrations/marketplaces/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(activeConfig ? { id: activeConfig.id } : {}),
          channel: "TRENDYOL",
          displayName,
          sellerId,
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
          userAgent,
          storeFrontCode: storeFrontCode || null,
          trendyolCargoCompanyId: productV2CargoCompanyId ? Number(productV2CargoCompanyId) : null,
          trendyolShipmentAddressId: productV2ShipmentAddressId ? Number(productV2ShipmentAddressId) : null,
          trendyolReturningAddressId: productV2ReturningAddressId ? Number(productV2ReturningAddressId) : null,
          trendyolOrigin: productV2Origin || null,
          trendyolDimensionalWeight: productV2DimensionalWeight ? Number(productV2DimensionalWeight) : null,
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
      setDashboardSummary((current) => ({
        ...current,
        activeConfigCount: result.isActive && !configs.some((item) => item.id === result.id && item.isActive)
          ? current.activeConfigCount + 1
          : current.activeConfigCount,
      }));
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(activeConfig ? { id: activeConfig.id } : {}),
          sellerId,
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
          userAgent,
          storeFrontCode: storeFrontCode || null,
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

  async function refreshDashboard() {
    const response = await fetch("/api/admin/integrations/marketplaces/dashboard");

    if (!response.ok) {
      throw new Error(labels.operationFailed);
    }

    const result = await response.json() as DashboardResult;
    setConfigs(result.configs);
    setPackages(result.packages);
    setDashboardSummary(result.summary);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: activeConfig.id,
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 10,
        }),
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
      setSplitLineIds([]);
      setSplitQuantities(Object.fromEntries(result.lines.map((line) => [line.id, String(Math.min(line.quantity, 1))])));
      setUnsuppliedLineIds([]);
      setUnsuppliedQuantities(Object.fromEntries(result.lines.map((line) => [line.id, String(Math.min(line.quantity, 1))])));
      setUnsuppliedReasonId("");
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  function toggleSplitLine(line: MarketplacePackageLine) {
    setSplitLineIds((current) => (
      current.includes(line.id)
        ? current.filter((item) => item !== line.id)
        : [...current, line.id]
    ));
    setSplitQuantities((current) => ({
      ...current,
      [line.id]: current[line.id] ?? String(Math.min(line.quantity, 1)),
    }));
  }

  async function splitPackage() {
    if (!selectedPackage || splitLineIds.length === 0 || splitSelectsWholePackage) {
      setError(labels.splitPackageInvalid);
      return;
    }

    const splits = splitLineIds.map((lineId) => ({
      lineId,
      quantity: Number(splitQuantities[lineId] ?? "1"),
    }));

    if (splits.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      setError(labels.splitPackageInvalid);
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ splits }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setNotice(labels.splitPackageSuccess);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  function toggleUnsuppliedLine(line: MarketplacePackageLine) {
    setUnsuppliedLineIds((current) => (
      current.includes(line.id)
        ? current.filter((item) => item !== line.id)
        : [...current, line.id]
    ));
    setUnsuppliedQuantities((current) => ({
      ...current,
      [line.id]: current[line.id] ?? String(Math.min(line.quantity, 1)),
    }));
  }

  async function cancelUnsuppliedItems() {
    if (!selectedPackage || unsuppliedLineIds.length === 0 || !unsuppliedReasonId) {
      setError(labels.unsuppliedInvalid);
      return;
    }

    const lines = unsuppliedLineIds.map((lineId) => ({
      lineId,
      quantity: Number(unsuppliedQuantities[lineId] ?? "1"),
    }));

    if (lines.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      setError(labels.unsuppliedInvalid);
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/unsupplied`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lines, reasonId: Number(unsuppliedReasonId) }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      await openPackageDetail(selectedPackage.id);
      await refreshDashboard();
      setNotice(labels.unsuppliedSuccess);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  async function matchLine(lineId: string) {
    const selected = productOptions.find((item) => item.value === selectedTargets[lineId]);

    if (!selected) {
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/lines/${lineId}/match`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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
      await refreshDashboard();
      setNotice(labels.lineIgnored);
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

  async function queueStatusSync(status: "Picking" | "Invoiced") {
    if (!selectedPackage) {
      return;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/integrations/marketplaces/packages/${selectedPackage.id}/status-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(status === "Invoiced" ? { invoiceNumber } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(labels.operationFailed);
      }

      const workerResponse = await fetch("/api/admin/integrations/worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 10,
        }),
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 10,
        }),
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
          <Input value={userAgent} onChange={(event) => setUserAgent(event.target.value)} placeholder={labels.userAgent} disabled={!canManage || busy} />
          <Input value={storeFrontCode} onChange={(event) => setStoreFrontCode(event.target.value)} placeholder={labels.storeFrontCode} disabled={!canManage || busy} />
          <Input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder={labels.endpointUrl} disabled={!canManage || busy} />
          <Input value={syncWindowMinutes} onChange={(event) => setSyncWindowMinutes(event.target.value)} placeholder={labels.syncWindowMinutes} disabled={!canManage || busy} type="number" min={15} max={1440} />
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 md:col-span-2">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-neutral-950">{labels.productV2DefaultsTitle}</p>
                <p className="mt-1 max-w-2xl text-xs text-neutral-500">{labels.productV2DefaultsDescription}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input value={productV2CargoCompanyId} onChange={(event) => setProductV2CargoCompanyId(event.target.value)} placeholder={labels.productV2CargoCompanyId} disabled={!canManage || busy} type="number" min={1} />
              <Input value={productV2Origin} onChange={(event) => setProductV2Origin(event.target.value.toUpperCase())} placeholder={labels.productV2Origin} disabled={!canManage || busy} />
              <Input value={productV2DimensionalWeight} onChange={(event) => setProductV2DimensionalWeight(event.target.value)} placeholder={labels.productV2DimensionalWeight} disabled={!canManage || busy} type="number" min={0.01} step="0.01" />
              <Input value={productV2ShipmentAddressId} onChange={(event) => setProductV2ShipmentAddressId(event.target.value)} placeholder={labels.productV2ShipmentAddressId} disabled={!canManage || busy} type="number" min={0} />
              <Input value={productV2ReturningAddressId} onChange={(event) => setProductV2ReturningAddressId(event.target.value)} placeholder={labels.productV2ReturningAddressId} disabled={!canManage || busy} type="number" min={0} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
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
          ) : packages.map((item) => (
            <article key={item.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_150px_180px_130px_110px] lg:items-center">
              <div>
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
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => openPackageDetail(item.id)} disabled={detailBusy}>
                <Eye className="h-4 w-4" />
                {labels.packageDetail}
              </Button>
            </article>
          ))}
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
                <Button
                  type="button"
                  onClick={() => queueStatusSync("Picking")}
                  disabled={!canManage || detailBusy || !canNotifyPicking}
                  size="sm"
                  variant="secondary"
                >
                  {labels.notifyPicking}
                </Button>
                <Button
                  type="button"
                  onClick={createOrder}
                  disabled={!canManage || detailBusy || selectedPackage.importStatus !== "READY_FOR_ORDER"}
                  size="sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {labels.createOrder}
                </Button>
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
                <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-950">{labels.splitPackageTitle}</h4>
                      <p className="mt-1 text-sm text-neutral-600">{labels.splitPackageHint}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canManage || detailBusy || !canSplitSelectedPackage || splitLineIds.length === 0 || splitSelectsWholePackage}
                      onClick={() => void splitPackage()}
                    >
                      {labels.splitPackage}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {selectedPackage.lines.map((line) => {
                      const checked = splitLineIds.includes(line.id);

                      return (
                        <label key={line.id} className="grid gap-2 rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_120px] sm:items-center">
                          <span className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              disabled={!canManage || detailBusy || !canSplitSelectedPackage}
                              onChange={() => toggleSplitLine(line)}
                            />
                            <span>
                              <span className="block font-medium text-neutral-900">{line.productName}</span>
                              <span className="block text-xs text-neutral-500">{line.quantity} adet - {line.externalLineId}</span>
                            </span>
                          </span>
                          <Input
                            type="number"
                            min={1}
                            max={line.quantity}
                            value={splitQuantities[line.id] ?? "1"}
                            onChange={(event) => setSplitQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
                            placeholder={labels.splitPackageQuantity}
                            disabled={!checked || !canManage || detailBusy || !canSplitSelectedPackage}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {capabilities.supportsUnsuppliedCancel ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-950">{labels.unsuppliedTitle}</h4>
                      <p className="mt-1 text-sm text-neutral-600">{labels.unsuppliedHint}</p>
                    </div>
                    <div className="grid gap-2">
                      {selectedPackage.lines.map((line) => {
                        const checked = unsuppliedLineIds.includes(line.id);

                        return (
                          <label key={line.id} className="grid gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_120px] sm:items-center">
                            <span className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                disabled={!canManage || detailBusy || !canCancelUnsuppliedSelectedPackage}
                                onChange={() => toggleUnsuppliedLine(line)}
                              />
                              <span>
                                <span className="block font-medium text-neutral-900">{line.productName}</span>
                                <span className="block text-xs text-neutral-500">{line.quantity} adet - {line.externalLineId}</span>
                              </span>
                            </span>
                            <Input
                              type="number"
                              min={1}
                              max={line.quantity}
                              value={unsuppliedQuantities[line.id] ?? "1"}
                              onChange={(event) => setUnsuppliedQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
                              placeholder={labels.unsuppliedQuantity}
                              disabled={!checked || !canManage || detailBusy || !canCancelUnsuppliedSelectedPackage}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <select
                        className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
                        value={unsuppliedReasonId}
                        onChange={(event) => setUnsuppliedReasonId(event.target.value)}
                        disabled={!canManage || detailBusy || !canCancelUnsuppliedSelectedPackage}
                      >
                        <option value="">{labels.unsuppliedReasonPlaceholder}</option>
                        {unsuppliedReasonOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canManage || detailBusy || !canCancelUnsuppliedSelectedPackage || unsuppliedLineIds.length === 0 || !unsuppliedReasonId}
                        onClick={() => void cancelUnsuppliedItems()}
                      >
                        {labels.unsuppliedSubmit}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder={labels.invoiceNumber}
                  disabled={!canManage || detailBusy}
                />
                <Button
                  type="button"
                  onClick={() => queueStatusSync("Invoiced")}
                  disabled={!canManage || detailBusy || !canNotifyInvoiced || invoiceNumber.trim().length === 0}
                  variant="secondary"
                >
                  {labels.notifyInvoiced}
                </Button>
              </div>
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
                            {item.status}
                          </Badge>
                          <span className="text-sm font-medium text-neutral-800">{labels.targetStatus}: {item.targetStatus ?? "-"}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{formatDate(item.processedAt ?? item.lastAttemptAt ?? item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {labels.attempts}: {item.attemptCount}/{item.maxAttempts}
                        {item.invoiceNumber ? ` - ${labels.invoiceNumber}: ${item.invoiceNumber}` : ""}
                      </p>
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
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
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
                          <p className="mt-1 text-xs">
                            {labels.lineSuggestedSearch}: {line.barcode ?? line.merchantSku ?? line.productName}
                          </p>
                        </div>
                      ) : null}
                    </div>
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
