"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Download, Pencil, Plus, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminBusinessDocumentDetail,
  AdminBusinessDocumentListItem,
  AdminBusinessDocumentListResult,
  AdminBusinessDocumentStatus,
  AdminBusinessDocumentSyncStatus,
  AdminBusinessDocumentType,
} from "@/modules/documents/contracts/document.contract";
import type {
  AdminBusinessDocumentXmlArtifactItem,
  EDocumentConfigReadinessReport,
  GIBComplianceReport,
} from "@/modules/edocument/contracts/edocument.contract";

type Labels = {
  title: string;
  description: string;
  createTitle: string;
  listTitle: string;
  search: string;
  filterDocumentType: string;
  filterStatus: string;
  filterSyncStatus: string;
  filterAllDocumentTypes: string;
  filterAllStatuses: string;
  filterAllSyncStatuses: string;
  sort: string;
  sortNewest: string;
  sortOldest: string;
  sortNumberAsc: string;
  sortNumberDesc: string;
  documentNumber: string;
  documentType: string;
  documentStatus: string;
  issueDate: string;
  counterparty: string;
  externalReference: string;
  externalSystemStatus: string;
  orderNumber: string;
  inventoryTransactionNumber: string;
  sourcePrimary: string;
  sourceSecondary: string;
  sourceHelper: string;
  selectOrderSource: string;
  selectInventoryTransactionSource: string;
  searchOrderSource: string;
  searchInventoryTransactionSource: string;
  noOrderSourceResults: string;
  noInventoryTransactionSourceResults: string;
  note: string;
  create: string;
  save: string;
  cancel: string;
  edit: string;
  saving: string;
  noResults: string;
  viewLines: string;
  notSpecified: string;
  queueDispatch: string;
  queueing: string;
  dispatchHistory: string;
  dispatchProvider: string;
  dispatchError: string;
  dispatchQueuedAt: string;
  noDispatchHistory: string;
  lifecycleHistory: string;
  noLifecycleHistory: string;
  lifecycleMessageEvidence: string;
  lifecyclePayloadHash: string;
  lifecycleRequestId: string;
  lifecycleIntegrationJobId: string;
  providerSelection: string;
  providerNone: string;
  selectSupplier: string;
  selectCustomerAccount: string;
  searchCounterparty: string;
  noCounterpartyResults: string;
  queueStatusSync: string;
  statusSyncing: string;
  generateXml: string;
  generatingXml: string;
  xmlArtifacts: string;
  noXmlArtifacts: string;
  xmlValidationStatus: string;
  xmlDownload: string;
  complianceReport: string;
  officialSchemaReady: string;
  officialSchematronReady: string;
  schemaHash: string;
  schematronHash: string;
  localRuleValid: string;
  xsdValidationReady: string;
  schematronValidationReady: string;
  validationEngineReady: string;
  providerReady: string;
  providerMode: string;
  registeredProviderAdapters: string;
  adapterConfigured: string;
  adapterOperational: string;
  productionChecklist: string;
  liveProviderTestScenarios: string;
  requiredEvidence: string;
  configReadiness: string;
  configReady: string;
  configMissing: string;
  badgeNotSent: string;
  badgeQueued: string;
  badgeSent: string;
  badgeFailed: string;
  slaAttention: string;
  slaCritical: string;
  slaQueuedStale: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
  importCsv: string;
  exportCsv: string;
  close: string;
  financeDocumentMovementPreviewOpen: string;
};

type Props = {
  locale: string;
  result: AdminBusinessDocumentListResult;
  providerOptions: Array<{ id: string; displayName: string; isDefault: boolean }>;
  supplierOptions: Array<{ id: string; name: string; description: string | null }>;
  customerAccountOptions: Array<{ id: string; name: string; description: string | null }>;
  orderOptions: Array<{ id: string; orderNumber: string; description: string | null }>;
  transactionOptions: Array<{ id: string; transactionNumber: string; description: string | null }>;
  labels: Labels;
};

type DrawerMode = "create" | "edit";
type SortValue = "newest" | "oldest" | "number_asc" | "number_desc";

type DocumentForm = {
  documentNumber: string;
  documentType: AdminBusinessDocumentType;
  status: AdminBusinessDocumentStatus;
  issueDate: string;
  supplierId: string;
  customerAccountId: string;
  externalReference: string;
  externalSystemStatus: AdminBusinessDocumentSyncStatus;
  providerConfigId: string;
  orderNumber: string;
  inventoryTransactionNumber: string;
  note: string;
};

function subscribeNoop() {
  return () => {};
}

function getCurrentDateTimeLocalValue() {
  return new Date().toISOString().slice(0, 16);
}

function getDocumentTypeLabel(value: AdminBusinessDocumentType) {
  switch (value) {
    case "PURCHASE_DOCUMENT":
      return "Satın alma belgesi";
    case "DELIVERY_NOTE":
      return "İrsaliye";
    case "E_INVOICE":
      return "E-fatura";
    case "E_DISPATCH":
      return "E-irsaliye";
    default:
      return value;
  }
}

function getDocumentStatusLabel(value: AdminBusinessDocumentStatus) {
  switch (value) {
    case "DRAFT":
      return "Taslak";
    case "LINKED":
      return "Bağlı";
    case "ISSUED":
      return "Kesildi";
    case "CANCELLED":
      return "İptal";
    default:
      return value;
  }
}

function getExternalStatusLabel(
  status: AdminBusinessDocumentSyncStatus,
  labels: Pick<Labels, "badgeNotSent" | "badgeQueued" | "badgeSent" | "badgeFailed">,
) {
  switch (status) {
    case "SENT":
      return labels.badgeSent;
    case "QUEUED":
      return labels.badgeQueued;
    case "FAILED":
      return labels.badgeFailed;
    default:
      return labels.badgeNotSent;
  }
}

function getExternalStatusBadgeClass(status: AdminBusinessDocumentSyncStatus) {
  switch (status) {
    case "SENT":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "QUEUED":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getSlaBadge(item: AdminBusinessDocumentListItem, labels: Pick<Labels, "slaAttention" | "slaCritical" | "slaQueuedStale">) {
  const ageHours = (Date.now() - new Date(item.issueDate).getTime()) / (1000 * 60 * 60);

  if (item.externalSystemStatus === "NOT_SENT") {
    if (ageHours >= 72) {
      return { className: "border-rose-200 bg-rose-100 text-rose-700", label: labels.slaCritical };
    }

    if (ageHours >= 24) {
      return { className: "border-amber-200 bg-amber-100 text-amber-700", label: labels.slaAttention };
    }
  }

  if (item.externalSystemStatus === "QUEUED" && ageHours >= 24) {
    return { className: "border-orange-200 bg-orange-100 text-orange-700", label: labels.slaQueuedStale };
  }

  return null;
}

function buildEmptyForm(defaultDateTimeLocal: string, defaultProviderConfigId: string): DocumentForm {
  return {
    documentNumber: "",
    documentType: "PURCHASE_DOCUMENT",
    status: "DRAFT",
    issueDate: defaultDateTimeLocal,
    supplierId: "",
    customerAccountId: "",
    externalReference: "",
    externalSystemStatus: "NOT_SENT",
    providerConfigId: defaultProviderConfigId,
    orderNumber: "",
    inventoryTransactionNumber: "",
    note: "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function exportItemsAsCsv(items: AdminBusinessDocumentListItem[]) {
  const rows = [
    ["documentNumber", "documentType", "status", "issueDate", "counterpartyName", "externalReference", "externalSystemStatus", "orderNumber", "inventoryTransactionNumber", "providerDisplayName"],
    ...items.map((item) => [
      item.documentNumber,
      item.documentType,
      item.status,
      item.issueDate,
      item.counterpartyName,
      item.externalReference ?? "",
      item.externalSystemStatus,
      item.orderNumber ?? "",
      item.inventoryTransactionNumber ?? "",
      item.providerDisplayName ?? "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "documents.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function DocumentManager({
  locale,
  result,
  providerOptions,
  supplierOptions,
  customerAccountOptions,
  orderOptions,
  transactionOptions,
  labels,
}: Props) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultDateTimeLocal = useSyncExternalStore(subscribeNoop, getCurrentDateTimeLocalValue, () => "");
  const defaultProviderConfigId = providerOptions.find((item) => item.isDefault)?.id ?? "";

  const [documentItems, setDocumentItems] = useState(result.items);
  const [query, setQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<"all" | AdminBusinessDocumentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminBusinessDocumentStatus>("all");
  const [syncStatusFilter, setSyncStatusFilter] = useState<"all" | AdminBusinessDocumentSyncStatus>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [detail, setDetail] = useState<AdminBusinessDocumentDetail | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [statusSyncingId, setStatusSyncingId] = useState<string | null>(null);
  const [xmlGeneratingId, setXmlGeneratingId] = useState<string | null>(null);
  const [xmlArtifacts, setXmlArtifacts] = useState<AdminBusinessDocumentXmlArtifactItem[]>([]);
  const [complianceReport, setComplianceReport] = useState<GIBComplianceReport | null>(null);
  const [configReadinessReport, setConfigReadinessReport] = useState<EDocumentConfigReadinessReport | null>(null);
  const [createForm, setCreateForm] = useState<DocumentForm>(() => buildEmptyForm(defaultDateTimeLocal, defaultProviderConfigId));
  const [editForm, setEditForm] = useState<DocumentForm>(() => buildEmptyForm(defaultDateTimeLocal, defaultProviderConfigId));

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return [...documentItems]
      .filter((item) => {
        if (documentTypeFilter !== "all" && item.documentType !== documentTypeFilter) {
          return false;
        }

        if (statusFilter !== "all" && item.status !== statusFilter) {
          return false;
        }

        if (syncStatusFilter !== "all" && item.externalSystemStatus !== syncStatusFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          item.documentNumber,
          item.counterpartyName,
          item.orderNumber ?? "",
          item.inventoryTransactionNumber ?? "",
          item.externalReference ?? "",
          item.providerDisplayName ?? "",
        ].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sort === "oldest") {
          return new Date(left.issueDate).getTime() - new Date(right.issueDate).getTime();
        }

        if (sort === "number_asc") {
          return left.documentNumber.localeCompare(right.documentNumber, "tr");
        }

        if (sort === "number_desc") {
          return right.documentNumber.localeCompare(left.documentNumber, "tr");
        }

        return new Date(right.issueDate).getTime() - new Date(left.issueDate).getTime();
      });
  }, [documentItems, documentTypeFilter, query, sort, statusFilter, syncStatusFilter]);

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const usesSupplierCounterparty = activeForm.documentType === "PURCHASE_DOCUMENT" || activeForm.documentType === "DELIVERY_NOTE";
  const primarySourceIsTransaction = usesSupplierCounterparty;
  const orderSourceOptions = orderOptions.map((item) => ({
    value: item.orderNumber,
    label: item.orderNumber,
    description: item.description,
  }));
  const transactionSourceOptions = transactionOptions.map((item) => ({
    value: item.transactionNumber,
    label: item.transactionNumber,
    description: item.description,
  }));

  function patchActiveForm(field: keyof DocumentForm, value: string) {
    const setter = drawerMode === "edit" ? setEditForm : setCreateForm;
    setter((current) => ({ ...current, [field]: value }));
  }

  function resetCreateForm() {
    setCreateForm(buildEmptyForm(defaultDateTimeLocal, defaultProviderConfigId));
  }

  function closeDrawer() {
    if (pending) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setError(null);
  }

  function openCreateDrawer() {
    resetCreateForm();
    setEditingId(null);
    setError(null);
    setDrawerMode("create");
  }

  function openEditDrawer(item: AdminBusinessDocumentListItem) {
    setEditForm({
      documentNumber: item.documentNumber,
      documentType: item.documentType,
      status: item.status,
      issueDate: item.issueDate.slice(0, 16),
      supplierId: item.supplierId ?? "",
      customerAccountId: item.customerAccountId ?? "",
      externalReference: item.externalReference ?? "",
      externalSystemStatus: item.externalSystemStatus,
      providerConfigId: item.providerConfigId ?? "",
      orderNumber: item.orderNumber ?? "",
      inventoryTransactionNumber: item.inventoryTransactionNumber ?? "",
      note: "",
    });
    setEditingId(item.id);
    setError(null);
    setDrawerMode("edit");
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/documents?search=&page=1&pageSize=50", { method: "GET" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.opFailed);
    }

    const payload = (await response.json()) as AdminBusinessDocumentListResult;
    setDocumentItems(payload.items);
  }

  async function openDetail(id: string) {
    const [response, artifactResponse, configResponse] = await Promise.all([
      fetch(`/api/admin/documents/${id}`, { cache: "no-store" }),
      fetch(`/api/admin/documents/${id}/xml-artifacts`, { cache: "no-store" }),
      fetch("/api/admin/edocuments/config-readiness", { cache: "no-store" }),
    ]);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? labels.opFailed);
      return;
    }

    const payload = (await response.json()) as { item: AdminBusinessDocumentDetail };
    setDetail(payload.item);

    if (artifactResponse.ok) {
      const artifactPayload = (await artifactResponse.json()) as {
        items: AdminBusinessDocumentXmlArtifactItem[];
        complianceReport: GIBComplianceReport | null;
      };
      setXmlArtifacts(artifactPayload.items);
      setComplianceReport(artifactPayload.complianceReport);
    } else {
      setXmlArtifacts([]);
      setComplianceReport(null);
    }

    if (configResponse.ok) {
      const configPayload = (await configResponse.json()) as { report: EDocumentConfigReadinessReport };
      setConfigReadinessReport(configPayload.report);
    } else {
      setConfigReadinessReport(null);
    }
  }

  async function submitDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (drawerMode === "edit") {
      if (!editingId) {
        setError(labels.opFailed);
        return;
      }

      setPending(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/documents/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: editForm.status,
            externalSystemStatus: editForm.externalSystemStatus,
            externalReference: editForm.externalReference.trim() || null,
            note: editForm.note.trim() || null,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? labels.opFailed);
          return;
        }

        await refreshItems();
        setDrawerMode(null);
        setEditingId(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
      } finally {
        setPending(false);
      }

      return;
    }

    if (!createForm.documentNumber.trim() || !createForm.issueDate) {
      setError(labels.validationRequired);
      return;
    }

    if (usesSupplierCounterparty && !createForm.supplierId) {
      setError(labels.validationRequired);
      return;
    }

    if (!usesSupplierCounterparty && !createForm.customerAccountId) {
      setError(labels.validationRequired);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentNumber: createForm.documentNumber.trim(),
          documentType: createForm.documentType,
          status: createForm.status,
          issueDate: new Date(createForm.issueDate || defaultDateTimeLocal).toISOString(),
          supplierId: usesSupplierCounterparty ? createForm.supplierId || undefined : undefined,
          customerAccountId: usesSupplierCounterparty ? undefined : createForm.customerAccountId || undefined,
          externalReference: createForm.externalReference.trim() || undefined,
          externalSystemStatus: createForm.externalSystemStatus,
          providerConfigId: createForm.providerConfigId || undefined,
          orderNumber: createForm.orderNumber.trim() || undefined,
          inventoryTransactionNumber: createForm.inventoryTransactionNumber.trim() || undefined,
          note: createForm.note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      await refreshItems();
      resetCreateForm();
      setDrawerMode(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setPending(false);
    }
  }

  async function queueDispatch(id: string, selectedProviderConfigId?: string | null) {
    setDispatchingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/documents/${id}/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerConfigId: selectedProviderConfigId ?? undefined }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      if (detail?.id === id) {
        const payload = (await response.json()) as { item: AdminBusinessDocumentDetail };
        setDetail(payload.item);
      }

      await refreshItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setDispatchingId(null);
    }
  }

  async function queueStatusSync(id: string, selectedProviderConfigId?: string | null) {
    setStatusSyncingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/documents/${id}/status-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerConfigId: selectedProviderConfigId ?? undefined }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      if (detail?.id === id) {
        const payload = (await response.json()) as { item: AdminBusinessDocumentDetail };
        setDetail(payload.item);
      }

      await refreshItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setStatusSyncingId(null);
    }
  }

  async function generateXml(id: string) {
    setXmlGeneratingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/documents/${id}/xml-artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ validate: true }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = (await response.json()) as { item: AdminBusinessDocumentXmlArtifactItem; created: boolean };
      setXmlArtifacts((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== payload.item.id);
        return [payload.item, ...withoutDuplicate];
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setXmlGeneratingId(null);
    }
  }

  function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === "\"") {
        if (inQuotes && line[index + 1] === "\"") {
          current += "\"";
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (character === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += character;
    }

    values.push(current);
    return values.map((value) => value.trim());
  }

  async function importDocumentsFromCsv(file: File) {
    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        return;
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.toLocaleLowerCase("tr-TR"));
      const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce<Record<string, string>>((accumulator, header, index) => {
          accumulator[header] = values[index] ?? "";
          return accumulator;
        }, {});
      });

      for (const row of rows) {
        const documentType = (row.documenttype || row.document_type || "PURCHASE_DOCUMENT") as AdminBusinessDocumentType;
        const usesSupplier = documentType === "PURCHASE_DOCUMENT" || documentType === "DELIVERY_NOTE";
        const supplierMatch = usesSupplier
          ? supplierOptions.find((item) => item.name.toLocaleLowerCase("tr-TR") === (row.counterpartyname || row.suppliername || "").toLocaleLowerCase("tr-TR"))
          : null;
        const customerMatch = !usesSupplier
          ? customerAccountOptions.find((item) => item.name.toLocaleLowerCase("tr-TR") === (row.counterpartyname || row.customeraccountname || "").toLocaleLowerCase("tr-TR"))
          : null;
        const providerMatch = providerOptions.find((item) => item.displayName.toLocaleLowerCase("tr-TR") === (row.providerdisplayname || "").toLocaleLowerCase("tr-TR"));

        const response = await fetch("/api/admin/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentNumber: row.documentnumber,
            documentType,
            status: (row.status || "DRAFT") as AdminBusinessDocumentStatus,
            issueDate: row.issuedate ? new Date(row.issuedate).toISOString() : new Date(defaultDateTimeLocal).toISOString(),
            supplierId: supplierMatch?.id,
            customerAccountId: customerMatch?.id,
            externalReference: row.externalreference || undefined,
            externalSystemStatus: (row.externalsystemstatus || "NOT_SENT") as AdminBusinessDocumentSyncStatus,
            providerConfigId: providerMatch?.id,
            orderNumber: row.ordernumber || undefined,
            inventoryTransactionNumber: row.inventorytransactionnumber || undefined,
            note: row.note || undefined,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? labels.opFailed);
        }
      }

      await refreshItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    }
  }

  const renderForm = (
    <form onSubmit={(event) => void submitDocument(event)} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{drawerMode === "edit" ? labels.edit : labels.createTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{drawerMode === "edit" ? labels.title : labels.description}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={pending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {drawerMode === "create" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-number">{labels.documentNumber}</Label>
                <Input id="document-number" value={activeForm.documentNumber} onChange={(event) => patchActiveForm("documentNumber", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-type">{labels.documentType}</Label>
                <Select value={activeForm.documentType} onValueChange={(value) => patchActiveForm("documentType", value)}>
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder={labels.documentType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE_DOCUMENT">{getDocumentTypeLabel("PURCHASE_DOCUMENT")}</SelectItem>
                    <SelectItem value="DELIVERY_NOTE">{getDocumentTypeLabel("DELIVERY_NOTE")}</SelectItem>
                    <SelectItem value="E_INVOICE">{getDocumentTypeLabel("E_INVOICE")}</SelectItem>
                    <SelectItem value="E_DISPATCH">{getDocumentTypeLabel("E_DISPATCH")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-date">{labels.issueDate}</Label>
                <Input id="issue-date" type="datetime-local" value={activeForm.issueDate} onChange={(event) => patchActiveForm("issueDate", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-status">{labels.documentStatus}</Label>
                <Select value={activeForm.status} onValueChange={(value) => patchActiveForm("status", value)}>
                  <SelectTrigger id="document-status">
                    <SelectValue placeholder={labels.documentStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{getDocumentStatusLabel("DRAFT")}</SelectItem>
                    <SelectItem value="LINKED">{getDocumentStatusLabel("LINKED")}</SelectItem>
                    <SelectItem value="ISSUED">{getDocumentStatusLabel("ISSUED")}</SelectItem>
                    <SelectItem value="CANCELLED">{getDocumentStatusLabel("CANCELLED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{usesSupplierCounterparty ? labels.selectSupplier : labels.selectCustomerAccount}</Label>
                <SearchableSelect
                  value={usesSupplierCounterparty ? activeForm.supplierId : activeForm.customerAccountId}
                  onValueChange={(value) => {
                    if (usesSupplierCounterparty) {
                      patchActiveForm("supplierId", value);
                      patchActiveForm("customerAccountId", "");
                      return;
                    }

                    patchActiveForm("customerAccountId", value);
                    patchActiveForm("supplierId", "");
                  }}
                  options={(usesSupplierCounterparty ? supplierOptions : customerAccountOptions).map((item) => ({
                    value: item.id,
                    label: item.name,
                    description: item.description,
                  }))}
                  placeholder={usesSupplierCounterparty ? labels.selectSupplier : labels.selectCustomerAccount}
                  searchPlaceholder={labels.searchCounterparty}
                  emptyLabel={labels.noCounterpartyResults}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external-reference">{labels.externalReference}</Label>
                <Input id="external-reference" value={activeForm.externalReference} onChange={(event) => patchActiveForm("externalReference", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external-status">{labels.externalSystemStatus}</Label>
                <Select value={activeForm.externalSystemStatus} onValueChange={(value) => patchActiveForm("externalSystemStatus", value)}>
                  <SelectTrigger id="external-status">
                    <SelectValue placeholder={labels.externalSystemStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SENT">{labels.badgeNotSent}</SelectItem>
                    <SelectItem value="QUEUED">{labels.badgeQueued}</SelectItem>
                    <SelectItem value="SENT">{labels.badgeSent}</SelectItem>
                    <SelectItem value="FAILED">{labels.badgeFailed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-config">{labels.providerSelection}</Label>
                <Select value={activeForm.providerConfigId || "__none__"} onValueChange={(value) => patchActiveForm("providerConfigId", value === "__none__" ? "" : value)}>
                  <SelectTrigger id="provider-config">
                    <SelectValue placeholder={labels.providerSelection} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{labels.providerNone}</SelectItem>
                    {providerOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{labels.sourcePrimary}</p>
                <p className="mt-1 text-xs text-slate-500">{labels.sourceHelper}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{primarySourceIsTransaction ? labels.inventoryTransactionNumber : labels.orderNumber}</Label>
                  <SearchableSelect
                    value={primarySourceIsTransaction ? activeForm.inventoryTransactionNumber : activeForm.orderNumber}
                    onValueChange={(value) => {
                      if (primarySourceIsTransaction) {
                        patchActiveForm("inventoryTransactionNumber", value);
                        return;
                      }

                      patchActiveForm("orderNumber", value);
                    }}
                    options={primarySourceIsTransaction ? transactionSourceOptions : orderSourceOptions}
                    placeholder={primarySourceIsTransaction ? labels.selectInventoryTransactionSource : labels.selectOrderSource}
                    searchPlaceholder={primarySourceIsTransaction ? labels.searchInventoryTransactionSource : labels.searchOrderSource}
                    emptyLabel={primarySourceIsTransaction ? labels.noInventoryTransactionSourceResults : labels.noOrderSourceResults}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{primarySourceIsTransaction ? labels.orderNumber : labels.inventoryTransactionNumber}</Label>
                  <SearchableSelect
                    value={primarySourceIsTransaction ? activeForm.orderNumber : activeForm.inventoryTransactionNumber}
                    onValueChange={(value) => {
                      if (primarySourceIsTransaction) {
                        patchActiveForm("orderNumber", value);
                        return;
                      }

                      patchActiveForm("inventoryTransactionNumber", value);
                    }}
                    options={primarySourceIsTransaction ? orderSourceOptions : transactionSourceOptions}
                    placeholder={primarySourceIsTransaction ? labels.selectOrderSource : labels.selectInventoryTransactionSource}
                    searchPlaceholder={primarySourceIsTransaction ? labels.searchOrderSource : labels.searchInventoryTransactionSource}
                    emptyLabel={primarySourceIsTransaction ? labels.noOrderSourceResults : labels.noInventoryTransactionSourceResults}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-note">{labels.note}</Label>
              <Textarea id="document-note" rows={5} value={activeForm.note} onChange={(event) => patchActiveForm("note", event.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{labels.documentNumber}</Label>
                <Input value={activeForm.documentNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label>{labels.documentType}</Label>
                <Input value={getDocumentTypeLabel(activeForm.documentType)} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-document-status">{labels.documentStatus}</Label>
                <Select value={activeForm.status} onValueChange={(value) => patchActiveForm("status", value)}>
                  <SelectTrigger id="edit-document-status">
                    <SelectValue placeholder={labels.documentStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{getDocumentStatusLabel("DRAFT")}</SelectItem>
                    <SelectItem value="LINKED">{getDocumentStatusLabel("LINKED")}</SelectItem>
                    <SelectItem value="ISSUED">{getDocumentStatusLabel("ISSUED")}</SelectItem>
                    <SelectItem value="CANCELLED">{getDocumentStatusLabel("CANCELLED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-external-status">{labels.externalSystemStatus}</Label>
                <Select value={activeForm.externalSystemStatus} onValueChange={(value) => patchActiveForm("externalSystemStatus", value)}>
                  <SelectTrigger id="edit-external-status">
                    <SelectValue placeholder={labels.externalSystemStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SENT">{labels.badgeNotSent}</SelectItem>
                    <SelectItem value="QUEUED">{labels.badgeQueued}</SelectItem>
                    <SelectItem value="SENT">{labels.badgeSent}</SelectItem>
                    <SelectItem value="FAILED">{labels.badgeFailed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-external-reference">{labels.externalReference}</Label>
                <Input id="edit-external-reference" value={activeForm.externalReference} onChange={(event) => patchActiveForm("externalReference", event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">{labels.note}</Label>
              <Textarea id="edit-note" rows={6} value={activeForm.note} onChange={(event) => patchActiveForm("note", event.target.value)} />
            </div>
          </>
        )}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={pending}>{labels.cancel}</Button>
        <Button type="submit" disabled={pending}>{pending ? labels.saving : drawerMode === "edit" ? labels.save : labels.create}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{labels.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{labels.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importDocumentsFromCsv(file);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => importFileInputRef.current?.click()} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? labels.saving : labels.importCsv}
              </Button>
              <Button type="button" variant="outline" onClick={() => exportItemsAsCsv(filteredItems)} disabled={filteredItems.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {labels.exportCsv}
              </Button>
              <Button type="button" onClick={openCreateDrawer}>
                <Plus className="mr-2 h-4 w-4" />
                {labels.create}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} className="xl:col-span-2" />
            <Select value={documentTypeFilter} onValueChange={(value) => setDocumentTypeFilter(value as typeof documentTypeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder={labels.filterDocumentType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterAllDocumentTypes}</SelectItem>
                <SelectItem value="PURCHASE_DOCUMENT">{getDocumentTypeLabel("PURCHASE_DOCUMENT")}</SelectItem>
                <SelectItem value="DELIVERY_NOTE">{getDocumentTypeLabel("DELIVERY_NOTE")}</SelectItem>
                <SelectItem value="E_INVOICE">{getDocumentTypeLabel("E_INVOICE")}</SelectItem>
                <SelectItem value="E_DISPATCH">{getDocumentTypeLabel("E_DISPATCH")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder={labels.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterAllStatuses}</SelectItem>
                <SelectItem value="DRAFT">{getDocumentStatusLabel("DRAFT")}</SelectItem>
                <SelectItem value="LINKED">{getDocumentStatusLabel("LINKED")}</SelectItem>
                <SelectItem value="ISSUED">{getDocumentStatusLabel("ISSUED")}</SelectItem>
                <SelectItem value="CANCELLED">{getDocumentStatusLabel("CANCELLED")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={syncStatusFilter} onValueChange={(value) => setSyncStatusFilter(value as typeof syncStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder={labels.filterSyncStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.filterAllSyncStatuses}</SelectItem>
                <SelectItem value="NOT_SENT">{labels.badgeNotSent}</SelectItem>
                <SelectItem value="QUEUED">{labels.badgeQueued}</SelectItem>
                <SelectItem value="SENT">{labels.badgeSent}</SelectItem>
                <SelectItem value="FAILED">{labels.badgeFailed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
              <SelectTrigger>
                <SelectValue placeholder={labels.sort} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{labels.sortNewest}</SelectItem>
                <SelectItem value="oldest">{labels.sortOldest}</SelectItem>
                <SelectItem value="number_asc">{labels.sortNumberAsc}</SelectItem>
                <SelectItem value="number_desc">{labels.sortNumberDesc}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{labels.listTitle}</h2>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-5 py-12 text-sm text-slate-500">{labels.empty}</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">{labels.documentNumber}</th>
                    <th className="px-5 py-3 font-medium">{labels.documentType}</th>
                    <th className="px-5 py-3 font-medium">{labels.counterparty}</th>
                    <th className="px-5 py-3 font-medium">{labels.issueDate}</th>
                    <th className="px-5 py-3 font-medium">{labels.documentStatus}</th>
                    <th className="px-5 py-3 font-medium">{labels.externalSystemStatus}</th>
                    <th className="px-5 py-3 font-medium">{labels.providerSelection}</th>
                    <th className="px-5 py-3 font-medium text-right">{labels.edit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item) => {
                    const slaBadge = getSlaBadge(item, labels);

                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-950">{item.documentNumber}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.orderNumber ?? item.inventoryTransactionNumber ?? labels.notSpecified}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{getDocumentTypeLabel(item.documentType)}</td>
                        <td className="px-5 py-4 text-slate-700">{item.counterpartyName}</td>
                        <td className="px-5 py-4 text-slate-700">{formatDate(item.issueDate)}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline">{getDocumentStatusLabel(item.status)}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getExternalStatusBadgeClass(item.externalSystemStatus)}>
                              {getExternalStatusLabel(item.externalSystemStatus, labels)}
                            </Badge>
                            {slaBadge ? <Badge className={slaBadge.className}>{slaBadge.label}</Badge> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{item.providerDisplayName ?? labels.providerNone}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => void openDetail(item.id)}>{labels.viewLines}</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditDrawer(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {labels.edit}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {filteredItems.map((item) => {
                const slaBadge = getSlaBadge(item, labels);

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-950">{item.documentNumber}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.counterpartyName}</p>
                      </div>
                      <Badge variant="outline">{getDocumentStatusLabel(item.status)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{getDocumentTypeLabel(item.documentType)}</Badge>
                      <Badge className={getExternalStatusBadgeClass(item.externalSystemStatus)}>
                        {getExternalStatusLabel(item.externalSystemStatus, labels)}
                      </Badge>
                      {slaBadge ? <Badge className={slaBadge.className}>{slaBadge.label}</Badge> : null}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>{labels.issueDate}: {formatDate(item.issueDate)}</p>
                      <p>{labels.providerSelection}: {item.providerDisplayName ?? labels.providerNone}</p>
                      <p>{labels.orderNumber}: {item.orderNumber ?? labels.notSpecified}</p>
                      <p>{labels.inventoryTransactionNumber}: {item.inventoryTransactionNumber ?? labels.notSpecified}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openDetail(item.id)}>{labels.viewLines}</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditDrawer(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {labels.edit}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {drawerMode ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40">
          <div className="absolute inset-y-0 right-0 h-full w-full max-w-2xl overflow-hidden bg-white shadow-2xl">
            {renderForm}
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40">
          <div className="absolute inset-y-0 right-0 h-full w-full max-w-3xl overflow-hidden bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{getDocumentTypeLabel(detail.documentType)}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{detail.documentNumber}</h2>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setDetail(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><span className="font-medium text-slate-950">{labels.counterparty}:</span> {detail.counterpartyName}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.providerSelection}:</span> {detail.providerDisplayName ?? labels.providerNone}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.orderNumber}:</span> {detail.orderNumber ?? labels.notSpecified}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.inventoryTransactionNumber}:</span> {detail.inventoryTransactionNumber ?? labels.notSpecified}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><span className="font-medium text-slate-950">{labels.documentStatus}:</span> {getDocumentStatusLabel(detail.status)}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.externalSystemStatus}:</span> {getExternalStatusLabel(detail.externalSystemStatus, labels)}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.externalReference}:</span> {detail.externalReference ?? labels.notSpecified}</p>
                    <p className="mt-2"><span className="font-medium text-slate-950">{labels.note}:</span> {detail.note ?? labels.notSpecified}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/${locale}/admin/finance/business-documents/${detail.id}/movements`}>
                        {labels.financeDocumentMovementPreviewOpen}
                      </Link>
                    </Button>
                    {(detail.documentType === "E_INVOICE" || detail.documentType === "E_DISPATCH") ? (
                      <Button type="button" variant="outline" onClick={() => void generateXml(detail.id)} disabled={xmlGeneratingId === detail.id}>
                        <Download className="mr-2 h-4 w-4" />
                        {xmlGeneratingId === detail.id ? labels.generatingXml : labels.generateXml}
                      </Button>
                    ) : null}
                    {(detail.documentType === "E_INVOICE" || detail.documentType === "E_DISPATCH") ? (
                      <Button type="button" variant="outline" onClick={() => void queueDispatch(detail.id, detail.providerConfigId)} disabled={dispatchingId === detail.id}>
                        {dispatchingId === detail.id ? labels.queueing : labels.queueDispatch}
                      </Button>
                    ) : null}
                    {(detail.documentType === "E_INVOICE" || detail.documentType === "E_DISPATCH") ? (
                      <Button type="button" variant="outline" onClick={() => void queueStatusSync(detail.id, detail.providerConfigId)} disabled={statusSyncingId === detail.id}>
                        {statusSyncingId === detail.id ? labels.statusSyncing : labels.queueStatusSync}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {(detail.documentType === "E_INVOICE" || detail.documentType === "E_DISPATCH") ? (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{labels.xmlArtifacts}</h3>
                    {complianceReport ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{labels.complianceReport}</p>
                            <p className="mt-1">{complianceReport.documentRootType} • {complianceReport.schemaVersion}</p>
                            <p className="mt-1">{labels.localRuleValid}: {complianceReport.localRuleValid ? labels.badgeSent : labels.badgeFailed}</p>
                            <p className="mt-1">{labels.officialSchemaReady}: {complianceReport.officialSchemaReady ? labels.badgeSent : labels.badgeFailed}</p>
                            {complianceReport.xsdHash ? (
                              <p className="mt-1 break-all text-xs">{labels.schemaHash}: {complianceReport.xsdHash}</p>
                            ) : null}
                            <p className="mt-1">{labels.officialSchematronReady}: {complianceReport.officialSchematronReady ? labels.badgeSent : labels.badgeFailed}</p>
                            {complianceReport.schematronHash ? (
                              <p className="mt-1 break-all text-xs">{labels.schematronHash}: {complianceReport.schematronHash}</p>
                            ) : null}
                            <p className="mt-1">{labels.xsdValidationReady}: {complianceReport.xsdValidationReady ? labels.badgeSent : labels.badgeFailed}</p>
                            <p className="mt-1">{labels.schematronValidationReady}: {complianceReport.schematronValidationReady ? labels.badgeSent : labels.badgeFailed}</p>
                          </div>
                          <Badge variant={complianceReport.valid ? "default" : "secondary"}>
                            {complianceReport.valid ? labels.badgeSent : labels.badgeFailed}
                          </Badge>
                        </div>
                        {complianceReport.issues.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {complianceReport.issues.map((issue, index) => (
                              <p key={`${issue.code}-${index}`} className={issue.severity === "ERROR" ? "text-xs text-rose-700" : "text-xs text-amber-700"}>
                                {issue.message}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {configReadinessReport ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{labels.configReadiness}</p>
                            <p className="mt-1">
                              {configReadinessReport.ready ? labels.configReady : labels.configMissing}
                            </p>
                            <p className="mt-1">
                              {labels.validationEngineReady}: {configReadinessReport.validationEngineReady ? labels.badgeSent : labels.badgeFailed}
                            </p>
                            <p className="mt-1">
                              {labels.providerMode}: {configReadinessReport.providerMode}
                            </p>
                            <p className="mt-1 break-all">
                              {labels.registeredProviderAdapters}: {configReadinessReport.registeredProviderAdapters.length > 0 ? configReadinessReport.registeredProviderAdapters.join(", ") : labels.empty}
                            </p>
                            {configReadinessReport.providerAdapters.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {configReadinessReport.providerAdapters.map((adapter) => (
                                  <p key={adapter.providerKey} className="break-all text-xs">
                                    {adapter.providerKey}: {labels.adapterConfigured} {adapter.configured ? labels.badgeSent : labels.badgeFailed} · {labels.adapterOperational} {adapter.operational ? labels.badgeSent : labels.badgeFailed}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            <p className="mt-1">
                              {labels.providerReady}: {configReadinessReport.providerReady ? labels.badgeSent : labels.badgeFailed}
                            </p>
                          </div>
                          <Badge variant={configReadinessReport.ready ? "default" : "secondary"}>
                            {configReadinessReport.ready ? labels.badgeSent : labels.badgeFailed}
                          </Badge>
                        </div>
                        {configReadinessReport.checks.some((check) => !check.ready) ? (
                          <div className="mt-3 space-y-2">
                            {configReadinessReport.checks
                              .filter((check) => !check.ready)
                              .map((check) => (
                                <p key={check.key} className="break-all text-xs text-rose-700">
                                  {check.label}: {check.message}
                                </p>
                              ))}
                          </div>
                        ) : null}
                        {configReadinessReport.productionChecklist.length > 0 ? (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold text-slate-900">{labels.productionChecklist}</p>
                            <div className="mt-2 space-y-2">
                              {configReadinessReport.productionChecklist.map((item) => (
                                <div key={item.key} className="text-xs text-slate-600">
                                  <p className="font-medium text-slate-800">{item.label}</p>
                                  <p className="mt-1 break-all">
                                    {labels.requiredEvidence}: {item.requiredEvidence.join(", ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {configReadinessReport.liveProviderTestScenarios.length > 0 ? (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold text-slate-900">{labels.liveProviderTestScenarios}</p>
                            <div className="mt-2 space-y-2">
                              {configReadinessReport.liveProviderTestScenarios.map((item) => (
                                <div key={item.key} className="text-xs text-slate-600">
                                  <p className="font-medium text-slate-800">{item.label}</p>
                                  <p className="mt-1 break-all">
                                    {labels.requiredEvidence}: {item.requiredEvidence.join(", ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {xmlArtifacts.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">{labels.noXmlArtifacts}</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {xmlArtifacts.map((artifact) => (
                          <article key={artifact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-950">{artifact.documentRootType} • {artifact.schemaVersion}</p>
                                  {artifact.isCurrent ? <Badge variant="default">Güncel</Badge> : null}
                                </div>
                                {artifact.supersedesArtifactId ? (
                                  <p className="mt-1 break-all text-xs text-slate-600">Önceki XML: {artifact.supersedesArtifactId}</p>
                                ) : null}
                                <p className="mt-1">{labels.xmlValidationStatus}: {artifact.validationStatus}</p>
                                <p className="mt-1 break-all text-xs text-slate-600">{labels.lifecyclePayloadHash}: {artifact.xmlHash}</p>
                                {artifact.xsdHash ? (
                                  <p className="mt-1 break-all text-xs text-slate-600">{labels.schemaHash}: {artifact.xsdHash}</p>
                                ) : null}
                                {artifact.schematronHash ? (
                                  <p className="mt-1 break-all text-xs text-slate-600">{labels.schematronHash}: {artifact.schematronHash}</p>
                                ) : null}
                                {artifact.validationErrors.length > 0 ? (
                                  <p className="mt-2 text-xs text-rose-700">{artifact.validationErrors.join(" ")}</p>
                                ) : null}
                              </div>
                              <Button type="button" size="sm" variant="outline" asChild>
                                <a href={`/api/admin/document-xml-artifacts/${artifact.id}`}>
                                  <Download className="mr-2 h-4 w-4" />
                                  {labels.xmlDownload}
                                </a>
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{labels.viewLines}</h3>
                  <div className="mt-3 space-y-3">
                    {detail.lines.map((line) => (
                      <article key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-950">{line.productName}</p>
                        {line.productVariantTitle ? (
                          <p className="mt-1 text-xs text-slate-600">
                            Varyant: {line.productVariantTitle}
                            {line.productVariantSku ? ` • ${line.productVariantSku}` : ""}
                          </p>
                        ) : null}
                        <p className="mt-1">{line.productSku} • {line.quantity}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Birim fiyat: {line.unitPrice === null ? labels.notSpecified : `${line.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${line.currency}`}
                          {" • "}
                          Satır toplamı: {line.lineTotal === null ? labels.notSpecified : `${line.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${line.currency}`}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{labels.dispatchHistory}</h3>
                  {detail.dispatches.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">{labels.noDispatchHistory}</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {detail.dispatches.map((dispatch) => (
                        <article key={dispatch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          <p className="font-semibold text-slate-950">{dispatch.channel} • {getExternalStatusLabel(dispatch.status, labels)}</p>
                          <p className="mt-1">{labels.dispatchProvider}: {dispatch.providerKey}</p>
                          <p className="mt-1">{labels.externalReference}: {dispatch.externalReference ?? labels.notSpecified}</p>
                          <p className="mt-1">{labels.dispatchQueuedAt}: {formatDate(dispatch.queuedAt)}</p>
                          <p className="mt-1">{labels.dispatchError}: {dispatch.errorMessage ?? labels.notSpecified}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{labels.lifecycleHistory}</h3>
                  {detail.lifecycleEvents.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">{labels.noLifecycleHistory}</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {detail.lifecycleEvents.map((event) => (
                        <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-slate-950">{event.summary}</p>
                              <p className="mt-1 text-xs text-slate-500">{event.eventType} • {formatDate(event.occurredAt)}</p>
                            </div>
                            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {event.externalStatus ?? event.status ?? labels.notSpecified}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <p className="break-all text-xs text-slate-600">{labels.lifecycleRequestId}: {event.requestId ?? labels.notSpecified}</p>
                            <p className="break-all text-xs text-slate-600">{labels.lifecycleIntegrationJobId}: {event.integrationJobId ?? labels.notSpecified}</p>
                          </div>
                          {event.messages.length > 0 ? (
                            <details className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                              <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 marker:hidden">
                                {labels.lifecycleMessageEvidence}
                              </summary>
                              <div className="mt-3 space-y-2">
                                {event.messages.map((message) => (
                                  <div key={message.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-xs font-semibold text-slate-900">{message.direction} • {message.messageType}</p>
                                    <p className="mt-1 break-all text-xs text-slate-600">{labels.lifecyclePayloadHash}: {message.payloadHash}</p>
                                    <p className="mt-1 text-xs text-slate-500">{formatDate(message.occurredAt)}</p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 px-5 py-4">
                <Button type="button" variant="outline" onClick={() => setDetail(null)}>{labels.close}</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
