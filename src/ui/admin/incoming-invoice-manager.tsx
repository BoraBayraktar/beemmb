"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminIncomingInvoiceDetail,
  AdminIncomingInvoiceListResult,
  AdminIncomingInvoiceSource,
  AdminIncomingInvoiceStatus,
} from "@/modules/incoming-invoices/contracts/incoming-invoice.contract";

type SupplierOption = { id: string; name: string; description: string | null };

type ManualLineForm = {
  productName: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
};

const emptyLine: ManualLineForm = { productName: "", quantity: "1", unitPrice: "0", vatRate: "20" };

function sourceLabel(source: AdminIncomingInvoiceSource) {
  if (source === "MANUAL") return "Manuel";
  if (source === "XML_IMPORT") return "XML İçe Aktarma";
  return "Entegratör";
}

function statusLabel(status: AdminIncomingInvoiceStatus) {
  if (status === "DRAFT") return "Taslak";
  if (status === "REVIEWED") return "Onaylandı";
  if (status === "POSTED") return "Muhasebeleşti";
  return "İptal";
}

function statusBadgeClass(status: AdminIncomingInvoiceStatus) {
  if (status === "POSTED") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (status === "REVIEWED") return "border-sky-200 bg-sky-100 text-sky-700";
  if (status === "CANCELLED") return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-amber-200 bg-amber-100 text-amber-700";
}

function formatCurrency(value: number | null, currency: string) {
  if (value === null) return "-";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

export function IncomingInvoiceManager({
  result,
  initialSearch,
  supplierOptions,
}: {
  locale: string;
  result: AdminIncomingInvoiceListResult;
  initialSearch: string;
  supplierOptions: SupplierOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(result.items);
  const [search, setSearch] = useState(initialSearch);
  const [sourceFilter, setSourceFilter] = useState<"all" | AdminIncomingInvoiceSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminIncomingInvoiceStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detail, setDetail] = useState<AdminIncomingInvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [supplierId, setSupplierId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyTaxNumber, setCounterpartyTaxNumber] = useState("");
  const [counterpartyTaxOffice, setCounterpartyTaxOffice] = useState("");
  const [counterpartyEmail, setCounterpartyEmail] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ManualLineForm[]>([{ ...emptyLine }]);

  const [xmlSupplierId, setXmlSupplierId] = useState("");
  const [xmlNote, setXmlNote] = useState("");
  const [xmlFileName, setXmlFileName] = useState("");
  const [xmlContent, setXmlContent] = useState("");

  const supplierSelectOptions = useMemo(
    () => supplierOptions.map((item) => ({ value: item.id, label: item.name, description: item.description })),
    [supplierOptions],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        return (
          item.documentNumber.toLocaleLowerCase("tr-TR").includes(query)
          || item.counterpartyName.toLocaleLowerCase("tr-TR").includes(query)
          || (item.counterpartyTaxNumber ?? "").includes(query)
        );
      }
      return true;
    });
  }, [items, sourceFilter, statusFilter, search]);

  async function refreshList() {
    const query = search ? `&search=${encodeURIComponent(search)}` : "";
    const response = await fetch(`/api/admin/incoming-invoices?pageSize=50${query}`);
    if (response.ok) {
      const payload = await response.json();
      setItems(payload.items ?? []);
    }
  }

  function resetManualForm() {
    setDocumentNumber("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setCurrency("TRY");
    setSupplierId("");
    setCounterpartyName("");
    setCounterpartyTaxNumber("");
    setCounterpartyTaxOffice("");
    setCounterpartyEmail("");
    setCounterpartyAddress("");
    setNote("");
    setLines([{ ...emptyLine }]);
  }

  function updateLine(index: number, patch: Partial<ManualLineForm>) {
    setLines((current) => current.map((line, idx) => (idx === index ? { ...line, ...patch } : line)));
  }

  async function submitManualForm() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/incoming-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber,
          issueDate: new Date(issueDate).toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          currency,
          supplierId: supplierId || null,
          counterpartyName,
          counterpartyTaxNumber: counterpartyTaxNumber || null,
          counterpartyTaxOffice: counterpartyTaxOffice || null,
          counterpartyEmail: counterpartyEmail || null,
          counterpartyAddress: counterpartyAddress || null,
          note: note || null,
          lines: lines
            .filter((line) => line.productName.trim())
            .map((line) => ({
              productName: line.productName,
              quantity: Number(line.quantity) || 0,
              unitPrice: Number(line.unitPrice) || 0,
              vatRate: line.vatRate ? Number(line.vatRate) : null,
            })),
        }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Fatura kaydedilemedi."));
        return;
      }

      setCreateOpen(false);
      resetManualForm();
      await refreshList();
      router.refresh();
    } catch {
      setError("Fatura kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setXmlFileName(file.name);
    setXmlContent(await file.text());
  }

  async function submitXmlImport() {
    if (!xmlContent) {
      setError("Önce bir XML dosyası seçin.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/incoming-invoices/import-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xmlContent, supplierId: xmlSupplierId || null, note: xmlNote || null }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "XML içe aktarılamadı."));
        return;
      }

      setImportOpen(false);
      setXmlFileName("");
      setXmlContent("");
      setXmlSupplierId("");
      setXmlNote("");
      await refreshList();
      router.refresh();
    } catch {
      setError("XML içe aktarılamadı.");
    } finally {
      setPending(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/incoming-invoices/${id}`);
      if (!response.ok) {
        setError(await readErrorMessage(response, "Fatura yüklenemedi."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
    } finally {
      setDetailLoading(false);
    }
  }

  async function reviewInvoice(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/incoming-invoices/${id}/review`, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "İşlem başarısız oldu."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function cancelInvoice(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/incoming-invoices/${id}/cancel`, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "İşlem başarısız oldu."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function downloadXml(id: string, invoiceDocumentNumber: string) {
    const response = await fetch(`/api/admin/incoming-invoices/${id}/xml-artifact`);
    if (!response.ok) {
      setError("XML indirilemedi.");
      return;
    }

    const payload = await response.json();
    const blob = new Blob([payload.item.xmlContent as string], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoiceDocumentNumber}.xml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">Gelen Faturalar</h1>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              Tedarikçilerden gelen faturaları manuel girin, XML olarak içe aktarın veya (ileride) bir e-fatura
              entegratöründen otomatik alın.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>XML İçe Aktar</Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>Yeni Gelen Fatura</Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fatura no, unvan veya VKN ara" />
          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
            <SelectTrigger><SelectValue placeholder="Kaynak" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kaynaklar</SelectItem>
              <SelectItem value="MANUAL">Manuel</SelectItem>
              <SelectItem value="XML_IMPORT">XML İçe Aktarma</SelectItem>
              <SelectItem value="INTEGRATOR">Entegratör</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="DRAFT">Taslak</SelectItem>
              <SelectItem value="REVIEWED">Onaylandı</SelectItem>
              <SelectItem value="POSTED">Muhasebeleşti</SelectItem>
              <SelectItem value="CANCELLED">İptal</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => void refreshList()}>Yenile</Button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Fatura No</th>
                <th className="px-4 py-3">Kaynak</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Karşı Taraf</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[color:var(--color-text-muted)]">Kayıt bulunamadı.</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.documentNumber}</td>
                  <td className="px-4 py-3">{sourceLabel(item.source)}</td>
                  <td className="px-4 py-3"><Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</Badge></td>
                  <td className="px-4 py-3">{item.supplierName ?? item.counterpartyName}</td>
                  <td className="px-4 py-3">{formatDate(item.issueDate)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.totalAmount, item.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" onClick={() => void openDetail(item.id)}>Detay</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {filteredItems.length === 0 ? (
            <p className="text-center text-sm text-[color:var(--color-text-muted)]">Kayıt bulunamadı.</p>
          ) : filteredItems.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[color:var(--color-text)]">{item.documentNumber}</span>
                <Badge className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</Badge>
              </div>
              <p className="mt-1 text-[color:var(--color-text-muted)]">{item.supplierName ?? item.counterpartyName}</p>
              <p className="mt-1 text-[color:var(--color-text-muted)]">{sourceLabel(item.source)} • {formatDate(item.issueDate)}</p>
              <p className="mt-1 font-medium text-[color:var(--color-text)]">{formatCurrency(item.totalAmount, item.currency)}</p>
              <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void openDetail(item.id)}>Detay</Button>
            </article>
          ))}
        </div>
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setCreateOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Yeni Gelen Fatura</h2>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Kapat</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <Label>Fatura No</Label>
                <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fatura Tarihi</Label>
                  <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                </div>
                <div>
                  <Label>Vade Tarihi</Label>
                  <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
              </div>
              <div>
                <Label>Tedarikçi (opsiyonel)</Label>
                <SearchableSelect
                  value={supplierId}
                  onValueChange={(value) => {
                    setSupplierId(value);
                    const match = supplierOptions.find((option) => option.id === value);
                    if (match && !counterpartyName) {
                      setCounterpartyName(match.name);
                    }
                  }}
                  options={supplierSelectOptions}
                  placeholder="Tedarikçi seçin"
                  searchPlaceholder="Tedarikçi ara"
                  emptyLabel="Sonuç bulunamadı"
                />
              </div>
              <div>
                <Label>Karşı Taraf Unvanı</Label>
                <Input value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>VKN / TCKN</Label>
                  <Input value={counterpartyTaxNumber} onChange={(event) => setCounterpartyTaxNumber(event.target.value)} />
                </div>
                <div>
                  <Label>Vergi Dairesi</Label>
                  <Input value={counterpartyTaxOffice} onChange={(event) => setCounterpartyTaxOffice(event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>E-posta</Label>
                  <Input value={counterpartyEmail} onChange={(event) => setCounterpartyEmail(event.target.value)} />
                </div>
                <div>
                  <Label>Para Birimi</Label>
                  <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
                </div>
              </div>
              <div>
                <Label>Adres</Label>
                <Textarea value={counterpartyAddress} onChange={(event) => setCounterpartyAddress(event.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Kalemler</Label>
                  <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...emptyLine }])}>Kalem Ekle</Button>
                </div>
                <div className="mt-2 space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 rounded-xl border border-[color:var(--color-border)] p-2">
                      <Input placeholder="Ürün/hizmet adı" value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} />
                      <Input placeholder="Miktar" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      <Input placeholder="Birim fiyat" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                      <Input placeholder="KDV %" value={line.vatRate} onChange={(event) => updateLine(index, { vatRate: event.target.value })} />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setLines((current) => (current.length > 1 ? current.filter((_, idx) => idx !== index) : current))}
                      >
                        Sil
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Not</Label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button type="button" onClick={() => void submitManualForm()} disabled={pending || !documentNumber || !counterpartyName}>
                {pending ? "Kaydediliyor..." : "Kaydet ve Muhasebeleştir"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setImportOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">XML İçe Aktar</h2>
              <Button type="button" variant="ghost" onClick={() => setImportOpen(false)}>Kapat</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <Label>UBL-TR XML Dosyası</Label>
                <input type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void handleFileChange(event)} className="mt-1 block w-full text-sm" />
                {xmlFileName ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{xmlFileName}</p> : null}
              </div>
              <div>
                <Label>Tedarikçi eşleştirmesi (opsiyonel)</Label>
                <SearchableSelect
                  value={xmlSupplierId}
                  onValueChange={setXmlSupplierId}
                  options={supplierSelectOptions}
                  placeholder="Tedarikçi seçin (VKN eşleşmezse)"
                  searchPlaceholder="Tedarikçi ara"
                  emptyLabel="Sonuç bulunamadı"
                />
              </div>
              <div>
                <Label>Not</Label>
                <Textarea value={xmlNote} onChange={(event) => setXmlNote(event.target.value)} />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button type="button" onClick={() => void submitXmlImport()} disabled={pending || !xmlContent}>
                {pending ? "İçe aktarılıyor..." : "İçe Aktar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{detail ? detail.documentNumber : "Yükleniyor..."}</h2>
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>Kapat</Button>
            </div>

            {detail ? (
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge>{sourceLabel(detail.source)}</Badge>
                  <Badge className={statusBadgeClass(detail.status)}>{statusLabel(detail.status)}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <p><span className="text-[color:var(--color-text-muted)]">Karşı Taraf:</span> {detail.counterpartyName}</p>
                  <p><span className="text-[color:var(--color-text-muted)]">VKN/TCKN:</span> {detail.counterpartyTaxNumber ?? "-"}</p>
                  <p><span className="text-[color:var(--color-text-muted)]">Tarih:</span> {formatDate(detail.issueDate)}</p>
                  <p><span className="text-[color:var(--color-text-muted)]">Vade:</span> {formatDate(detail.dueDate)}</p>
                  <p><span className="text-[color:var(--color-text-muted)]">Tutar:</span> {formatCurrency(detail.totalAmount, detail.currency)}</p>
                  <p><span className="text-[color:var(--color-text-muted)]">Tedarikçi kartı:</span> {detail.supplierName ?? "Eşleşmedi"}</p>
                </div>

                <div>
                  <h3 className="font-medium text-[color:var(--color-text)]">Kalemler</h3>
                  <div className="mt-2 space-y-1">
                    {detail.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                        <span>{line.productName} ({line.quantity} × {formatCurrency(line.unitPrice, detail.currency)})</span>
                        <span className="font-medium">{formatCurrency(line.lineTotal, detail.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {detail.hasXmlArtifact ? (
                  <Button type="button" variant="outline" onClick={() => void downloadXml(detail.id, detail.documentNumber)}>XML İndir</Button>
                ) : null}

                <div>
                  <h3 className="font-medium text-[color:var(--color-text)]">Geçmiş</h3>
                  <div className="mt-2 space-y-1">
                    {detail.lifecycleEvents.map((event) => (
                      <p key={event.id} className="text-xs text-[color:var(--color-text-muted)]">{formatDate(event.occurredAt)} — {event.summary}</p>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {detail.status === "DRAFT" ? (
                    <Button type="button" onClick={() => void reviewInvoice(detail.id)} disabled={pending}>Onayla ve Muhasebeleştir</Button>
                  ) : null}
                  {detail.status === "DRAFT" || detail.status === "REVIEWED" ? (
                    <Button type="button" variant="outline" onClick={() => void cancelInvoice(detail.id)} disabled={pending}>İptal Et</Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">Yükleniyor...</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
