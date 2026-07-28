# Paraşüt Finans Modülü Hizalama Planı

Bu doküman, BEEMMB `finance` modül ailesini Paraşüt **ön muhasebe / finans** yetkinliklerine **kademeli** yaklaştırmak için faz planıdır.

Referanslar:

- Mimari sınırlar ve mevcut omurga: [FINANCE_MODULE_ARCHITECTURE.md](./FINANCE_MODULE_ARCHITECTURE.md)
- Geliştirme standardı: [DEVELOPMENT_RULES.md](../DEVELOPMENT_RULES.md)
- Stok tarafı Paraşüt hizalama örneği: [PARASUT_INVENTORY_REVISION_PLAN.md](./PARASUT_INVENTORY_REVISION_PLAN.md)

## 1. Amaç ve kapsam sınırı

### Hedef

- E-ticaret + belge + envanter omurgasına bağlı işletmelerin **cari, kasa/banka, tahsilat/ödeme ve rapor** deneyimini Paraşüt’e **işlevsel olarak yaklaştırmak**.
- Paraşüt’ün **fatura merkezli ön muhasebe** yüzeyini BEEMMB’de **kopyalamak değil**; aynı iş ihtiyacını **modüler monolith** kurallarıyla karşılamak.

### Bilinçli kapsam dışı (PF fazları bitene kadar)

- Paraşüt’ün tam **hesap planı / yevmiye defteri** ürünü (PF8 tetiklenene kadar).
- Finans ekranından **stok operasyonu** veya **belge dispatch** (mimari yasak; envanter/belge modülünde kalır).
- Çoklu dil (`tr.json` dışı locale) — [DEVELOPMENT_RULES.md](../DEVELOPMENT_RULES.md).

### Paraşüt referans yetkinlik haritası (finans)

| Paraşüt alanı | BEEMMB karşılığı (hedef) |
|---------------|---------------------------|
| Cari hesap takibi | `finance/accounts`, `customers/[slug]`, `suppliers/[slug]` |
| Tahsilat / ödeme | `collections`, `payments`, allocation |
| Kasa / banka | `bank-cash`, `CashTransaction`, `FinancialAccount` |
| Banka mutabakatı | **PF4** (yeni) |
| Gelir / gider kalemleri | **PF3** (kategori raporu; mevcut `CashTransaction.category`) |
| Nakit akışı / kasa-banka raporu | `reports/cashflow` + **PF5** (tarih aralığı, export) |
| Yaşlandırma | `reports/aging` + **PF1** (vade KPI) |
| KDV raporları | **PF6** (salt okuma özet; beyan yazılımı değil) |
| Çek / senet | **PF7** |
| e-Fatura | `edocument` + `documents` (finans borç/alacak kaynağı) |
| Banka API / online tahsilat | **PF9** (`integration` modülü) |
| Mali müşavir / muhasebe export | **PF10** |

## 2. Mevcut durum (2026-07 baseline)

Tamamlanmış iyileştirme fazları (iç plan): **6A–6E, 7A, 7B**, Faz **5** rapor çekirdeği, sanal **Faz 8** projeksiyon (`finance-account-entry-projection.service`).

Güçlü alanlar (Paraşüt’ten farklı avantaj):

- Sipariş/belge/satır **FIFO allocation**, manuel eşleştirme, belge finans hareket önizlemesi.
- Envanter–borç özeti paneli (operasyon entegrasyonu).

Açık alanlar (Paraşüt hizalama öncesi):

- Vade / gecikmiş alacak-borç KPI ve filtreler.
- Banka ekstre yükleme ve mutabakat.
- KDV / gelir-gider kalem raporları (yönetim özeti).
- Çek/senet, mali müşavir export, banka API.

Doğrulama: `npm run verify:finance:phase4c`, `npm run verify:finance`, CI `phase5-quality-gates.yml`.

## 3. Uygulama ilkeleri (DEVELOPMENT_RULES)

Her PF fazı için zorunlu:

1. **Contract → Repository → Service**; UI/API ince adapter.
2. Metinler yalnızca **`src/i18n/tr.json`** (+ copy resolver servisleri).
3. Modüller arası veri **service** üzerinden; UI’da Prisma/repository yok.
4. UX: **özet → liste → detay**; mobil-first.
5. Yeni davranış: **`scripts/verify-finance-*`** ve gerekirse `verify:finance:phase4c` zincirine ekleme.
6. Redis: read-ağır listelerde TTL; yazmada invalidation (finans raporları için PF5 sonrası).

## 4. Faz özeti

| Faz | Odak | Paraşüt karşılığı | Kapsam |
|-----|------|-------------------|--------|
| **PF0** | Boşluk matrisi + kabul tanımları | — | Doküman / operasyon |
| **PF1** | Vade ve gecikme | Cari vade, yaşlandırma KPI | Orta |
| **PF2** | Cari kart finans alanları | Cari kart, ödeme koşulu | Küçük–Orta |
| **PF3** | Gelir-gider kalem raporu | Gelir/gider takibi | Orta |
| **PF4** | Banka mutabakat MVP | Banka ekstresi eşleştirme | Büyük |
| **PF5** | Rapor tarih aralığı + export | Kasa-banka raporu | Orta |
| **PF6** | KDV yönetim özeti | KDV raporları (özet) | Orta |
| **PF7** | Çek / senet | Çek-senet takibi | Büyük |
| **PF8** | Ön muhasebe köprüsü | Defter / aktarım | Çok büyük (ertelenmiş) |
| **PF9** | Banka & tahsilat entegrasyonu | Banka API, online tahsilat | Büyük |
| **PF10** | Mali müşavir / export | Muhasebeci paneli, aktarım | Büyük |

Önerilen sıra:

```text
PF0 → PF1 → PF2 → PF5 (paralel PF3) → PF4 → PF6 → PF7 → PF9 → PF10 → PF8 (ihtiyaca göre)
```

---

## PF0 — Boşluk matrisi ve kabul sözlüğü

**Amaç:** Paraşüt finans ekranları ile BEEMMB route’larını eşleştirmek; her PF fazı için ölçülebilir kabul maddesi yazmak.

**İşler:**

1. `docs/FINANCE_PARASUT_GAP_MATRIX.md` (PF0 çıktısı): ekran/akış × BEEMMB route × durum (var / kısmi / yok).
2. Mevcut **Admin Manuel Kontrol Listesi** genişletmesi: PF1+ maddeleri için taslak.
3. `FINANCE_MODULE_ARCHITECTURE.md` içine bu plana link.

**Kabul:** Matris onaylı; PF1–PF6 için en az bir “Paraşüt eşdeğer akış” satırı tanımlı.

**Durum:** Tamamlandı (2026-07-27) — [FINANCE_PARASUT_GAP_MATRIX.md](./FINANCE_PARASUT_GAP_MATRIX.md).

---

## PF1 — Vade, gecikme ve yaşlandırma KPI

**Amaç:** Payables/receivables üst yüzeyde Paraşüt’teki “vadesi geçen / yakın vade” görünürlüğü.

**Paraşüt referans:** Cari yaşlandırma, vade takibi.

**Veri modeli (öneri):**

- `BusinessDocument`: `dueDate` (nullable) veya `paymentTermDays` + `issueDate` türetimi.
- Sipariş alacağı: `Order` veya belge vadesinden türetilmiş `dueAt` (service projection; kalıcı FK zorunlu değil).

**Contract / Service:**

- `payables.contract.ts` / `receivables.contract.ts`: `overdueAmount`, `dueWithinDaysAmount`, `nearestDueDate`.
- `payables.service.ts`, `receivables.service.ts`: vade hesaplama tek yerde.
- `reports.service.getAgingReport`: belge vadesi varsa issueDate yerine `dueDate` kullanımı.

**Route / UI:**

- `/admin/finance/payables`, `/admin/finance/receivables`: KPI kartları + “vadesi geçen” filtresi.
- Liste satırında yakın vade / gecikme gün sayısı (ikinci kolon; mobilde özet).

**Kabul:**

- KPI tutarları service’ten gelir; UI hesaplamaz.
- Gecikmiş filtre en az bir integration/verify senaryosunda doğrulanır.

**Verify:** `verify-finance-due-date.ts` (statik + isteğe bağlı DB fixture).

**Durum:** Tamamlandı (2026-07-27) — migration `20260727140000_add_business_document_due_date`, KPI + filtre + aging `effectiveDueDate`.

**Bağımlılık:** Migration onayı; PF0 matris.

---

## PF2 — Cari kart finans alanları

**Amaç:** Paraşüt cari kartındaki ödeme koşulu / vade varsayılanı finans okumalarına yansır.

**Paraşüt referans:** Cari kart — ödeme koşulları, vergi bilgisi (finans tarafında okuma).

**Veri modeli:**

- `CustomerAccount` / `Supplier`: `defaultPaymentTermDays`, isteğe bağlı `creditLimit` (nullable).

**Service:**

- `customers` / catalog supplier servisleri yazma; **finance** yalnızca read + tahsilat/ödeme varsayılan vade önerisi.
- `collections.service` / `payments.service`: yeni kayıtta varsayılan vade uyarısı (salt okuma metin).

**Route / UI:**

- Müşteri/tedarikci admin formları (ilgili modül); finans ekstrede “varsayılan vade: X gün” özeti.

**Kabul:** Finans modülü cari kartı düzenlemez; yalnızca service ile okur ve gösterir.

**Verify:** contract alanları + finance service wiring.

**Durum:** Tamamlandı (2026-07-27) — migration `20260727150000_add_counterparty_finance_fields`, admin formlar, finans salt okuma + verify.

**Bağımlılık:** PF1 ile uyumlu migration.

---

## PF3 — Gelir / gider kalem raporu

**Amaç:** Paraşüt “gelir-gider takibi”ne denk **kategori bazlı** özet (tam muhasebe hesap planı değil).

**Paraşüt referans:** Gelir gider raporu, kategori/etiket.

**Service:**

- `reports.service.getIncomeExpenseReport(locale, dateRange)`: `CashTransaction` + tahsilat/ödeme kaynaklı hareketler; `category` / `direction` kırılımı.
- `documents` / `edocument` fatura toplamları isteğe bağlı ikinci blok (salt okuma).

**Route:**

- `/admin/finance/reports/income-expense` (yeni).

**UI:** Özet kartlar + tablo; export PF5 ile birleştirilebilir.

**Kabul:** Stok/belge formu açılmaz; yalnızca rapor.

**Verify:** `verify-finance-income-expense-report.ts`.

**Bağımlılık:** PF5 tarih aralığı sözleşmesi (paylaşılan `dateRange` contract).

---

## PF4 — Banka ekstre import ve mutabakat (MVP)

**Amaç:** Paraşüt “banka mutabakatı” akışının çekirdeği: ekstre yükle → eşleştir → onayla.

**Paraşüt referans:** Banka ekstresi yükleme, otomatik eşleştirme önerisi.

**Veri modeli:**

- `BankStatementImport` (session: hesap, dönem, durum).
- `BankStatementLine` (tarih, açıklama, tutar, bakiye, eşleşme durumu).
- `BankReconciliationMatch` → `CashTransaction` veya `CollectionRecord` / `PaymentRecord` (metadata).

**Modül sınırı:**

- Parser/import: `integration` veya `finance` alt servis; **eşleştirme kuralı finance.service**.

**Route / API:**

- `/admin/finance/bank-cash/[id]/reconciliation` (sayfa).
- `POST /api/admin/finance/bank-reconciliation/imports`, `POST .../match`, `POST .../confirm`.

**UI:** Özet → eşleşmemiş satırlar listesi → tekil eşleştirme (drawer veya alt sayfa).

**Kabul:**

- Onaylı eşleşme `CashTransaction` ile tutarlı; çift eşleşme engellenir.
- Audit: import ve onay (6B ile uyumlu).

**Verify:** import parser unit + statik route wiring.

**Bağımlılık:** PF1 tam değil zorunlu; `FinancialAccount` stabil.

---

## PF5 — Rapor tarih aralığı, kasa-banka raporu, export

**Amaç:** Paraşüt raporlarındaki **tarih aralığı** ve **indirme** beklentisi.

**Paraşüt referans:** Kasa-Banka raporu, nakit akışı.

**Contract:**

- `AdminFinanceReportDateRangeQuery`: `from`, `to`, `financialAccountId?`.

**Service:**

- `reports.service`: mevcut aging/cashflow/performance/stock-value + yeni income-expense için aralık filtresi.
- `getBankCashMovementReport`: hesap bazlı giriş/çıkış (Paraşüt kasa-banka raporu).

**Route:**

- `/admin/finance/reports/bank-cash` (yeni) veya cashflow genişletmesi (mimari karar PF0’da netleşir).

**Export:** CSV (service üretir; API stream adapter).

**Kabul:** Varsayılan aralık “bu ay”; mobilde filtre accordion.

**Verify:** `verify-finance-reports-date-range.ts`.

**Bağımlılık:** PF3 için ortak date contract.

---

## PF6 — KDV yönetim özeti (salt okuma)

**Amaç:** Paraşüt KDV raporlarına **yaklaşan yönetim paneli**; beyanname üretimi değil.

**Paraşüt referans:** KDV raporu / döküm.

**Service:**

- `finance-vat-summary.service.ts`: `edocument` + `documents` satır KDV toplamları; dönem parametresi.
- Finance modülü **edocument dispatch yapmaz**.

**Route:**

- `/admin/finance/reports/vat-summary`.

**Kabul:** Rakamlar belge/edocument service projection; finance repository doğrudan provider’a gitmez.

**Verify:** statik wiring + mock aggregation test.

**Bağımlılık:** `edocument` modülü stabil; PF5 date range.

---

## PF7 — Çek ve senet

**Amaç:** Paraşüt çek/senet portföy takibinin minimal karşılığı.

**Paraşüt referans:** Çek-senet, vade, ciro.

**Veri modeli (yeni aggregate):**

- `NegotiableInstrument` (çek/senet): cari, tutar, vade, durum (portföy, tahsil, ödendi, karşılıksız).
- İsteğe bağlı bağ: `CollectionRecord` / `PaymentRecord` / `CashTransaction`.

**Modül:**

- `src/modules/finance/contracts/negotiable-instrument.contract.ts`
- `negotiable-instrument.service.ts`
- Route: `/admin/finance/instruments` (liste) + detay sayfa.

**Kabul:** Nakit hareketi yalnızca durum geçişinde service tetikler; UI iş kuralı taşımaz.

**Verify:** lifecycle smoke script.

**Bağımlılık:** PF1 vade altyapısı; PF2 cari FK.

---

## PF8 — Ön muhasebe köprüsü (`FinanceAccountEntry`)

**Amaç:** Paraşüt’ün **defter / aktarım** ihtiyacını karşılayacak tek hareket defteri (iç plan **Faz 8** ile birleşir).

**Tetikleyici:** PF10 export, performans, denetim.

**İşler:**

1. Schema + migration (`FinanceAccountEntry`, gerekirse `FinanceAccount` / hesap planı seed).
2. Write-through veya projection job: `CashTransaction`, tahsilat/ödeme, belge olayları.
3. `counterparty-ledger` / `accounts.service` read path kademeli geçiş.
4. Hesap planı mapping tablosu (basit TDHP alt kümesi — ürün kararı).

**Kabul:** Mevcut operasyon akışları kırılmaz; projection geriye dönük okunabilir.

**Verify:** allocation + entry tutarlılığı.

**Bağımlılık:** PF1–PF7 veri olgunluğu; ayrı ürün onayı.

---

## PF9 — Banka API ve online tahsilat entegrasyonu

**Amaç:** Paraşüt banka entegrasyonu ve online tahsilat.

**Modül:** `integration` connectors; finance yalnızca **tahsilat/ödeme kaydı** oluşturur.

**İşler:**

1. Banka hareket çekme connector (sandbox).
2. Otomatik `CashTransaction` önerisi (PF4 ile birleşik kuyruk).
3. Online tahsilat webhook → `collections.service`.

**Kabul:** Secret’lar env; audit; idempotent webhook.

**Verify:** `verify-integrations` genişletmesi.

**Bağımlılık:** PF4 mutabakat modeli.

---

## PF10 — Mali müşavir görünümü ve muhasebe export

**Amaç:** Paraşüt mali müşavir / veri aktarımı.

**İşler:**

1. Salt okuma rolü: `finance.audit.read` + export scope.
2. Export paketi: cari ekstre, KDV özeti, kasa-banka dönemi (CSV/XML — format kararı).
3. İsteğe bağlı: Logo/Luca şablonu (PF8 hesap planı gerekir).

**Route:** `/admin/finance/exports` veya API job.

**Bağımlılık:** PF5, PF6; PF8 tam export için.

---

## 5. Ortak faz kontrol listesi

Her PF fazı merge öncesi:

- [ ] Contract güncellendi
- [ ] İş kuralı yalnızca service’te
- [ ] API route ince adapter
- [ ] `tr.json` + copy resolver (varsa)
- [ ] Mobil liste/detay kontrol
- [ ] `verify:finance:*` eklendi / phase4c zinciri
- [ ] Bu dokümanda **Durum** satırı güncellendi
- [ ] `FINANCE_MODULE_ARCHITECTURE.md` hedef sayfa maddesi ile uyum notu

## 6. Mevcut iç fazlar ile ilişki

| İç plan (FINANCE_MODULE) | PF plan |
|--------------------------|---------|
| Faz 0 operasyon | PF0 öncesi / paralel |
| Faz 5 raporlar | PF5, PF3, PF6 genişletir |
| Faz 7B envanter borç | PF1 raporları ile kesişir; ayrı kalır |
| Faz 8 FinanceAccountEntry | **PF8** ile birleşik |
| 6A–7A tamamlandı | PF1+ için temel |

## 7. Durum (PF fazları)

| Faz | Durum |
|-----|--------|
| PF0 | Tamamlandı — [FINANCE_PARASUT_GAP_MATRIX.md](./FINANCE_PARASUT_GAP_MATRIX.md) |
| PF1 | Tamamlandı — vade KPI, filtre, aging `effectiveDueDate` |
| PF2 | Tamamlandı — cari kart vade/limit, finans salt okuma |
| PF3 | Tamamlandı — gelir-gider kalem raporu, paylaşılan tarih aralığı sözleşmesi |
| PF5 | Tamamlandı — dönem filtresi (cashflow/aging/income-expense/bank-cash), kasa-banka raporu, CSV export API |
| PF6 | Tamamlandı — KDV yönetim özeti (belge projeksiyonu, salt okuma) |
| PF4 | Tamamlandı (MVP) — banka ekstresi import, eşleştirme, onay |
| PF7 | Tamamlandı (MVP) — çek/senet portföy, lifecycle + nakit hareketi |
| PF9 | Tamamlandı (MVP) — BANK_SANDBOX ekstresi → PF4 öneri kuyruğu; online tahsilat webhook → collections |
| PF10 | Tamamlandı (MVP) — mali müşavir export paketi + `finance.audit.read` / `accountant` rolü |
| PF8 | Tamamlandı (MVP) — `FinanceAccountEntry` + hesap planı seed + write-through projeksiyon |

---

Son güncelleme: PF8 MVP tamamlandı; Paraşüt hizalama PF0–PF10 operasyonel omurgası kapandı. Sonraki işler urun karari: tam TDHP, belge satirlari, Logo/Luca sablonu.
