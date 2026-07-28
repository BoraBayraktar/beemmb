# Paraşüt × BEEMMB Finans Boşluk Matrisi (PF0)

Referans plan: [FINANCE_PARASUT_ALIGNMENT_PLAN.md](./FINANCE_PARASUT_ALIGNMENT_PLAN.md)  
Mimari: [FINANCE_MODULE_ARCHITECTURE.md](./FINANCE_MODULE_ARCHITECTURE.md)

Durum anahtarı: **Var** — işlevsel parity operasyonel kapsamda; **Kısmi** — salt okuma veya rapor eksik; **Yok** — planlı PF fazında.

Son güncelleme: PF8 belge satırı defter + mizan; PF10 Logo/Luca CSV; PF4 otomatik mutabakat; cari ekstre derinliği.

## Cari ve bakiye

| Paraşüt akış | BEEMMB route / modül | Durum | PF / not |
|--------------|----------------------|-------|----------|
| Cari listesi | `/admin/finance/accounts` | Var | Faz 3 |
| Müşteri cari kartı + ekstre | `/admin/finance/customers/[slug]` | **Var (Kısmi→derin)** | Running balance + son hareket |
| Tedarikçi cari kartı + ekstre | `/admin/finance/suppliers/[slug]` | **Var (Kısmi→derin)** | Running balance + son hareket |
| Açık alacak listesi | `/admin/finance/receivables` | Kısmi → **PF1** vade KPI | PF1 |
| Açık borç listesi | `/admin/finance/payables` | Kısmi → **PF1** vade KPI | PF1 |

## Tahsilat, ödeme, kasa

| Paraşüt akış | BEEMMB route | Durum | PF / not |
|--------------|--------------|-------|----------|
| Tahsilat kaydı | `/admin/finance/collections/[orderId]` | Var | Faz 4C, allocation |
| Ödeme kaydı | `/admin/finance/payments/[supplierKey]` | Var | Faz 4C |
| Kasa / banka hesapları | `/admin/finance/bank-cash` | Var | Faz 2 |
| Gelir-gider hareketleri | `/admin/finance/transactions` | Var | Faz 3A |
| Banka ekstresi mutabakat | `/admin/finance/bank-cash/[id]/reconciliation` | **PF4 Var** | CSV + eşleştir; opsiyonel otomatik onay (≥98 skor) + hareket oluşturma |
| Online tahsilat / banka API | `integration` + PF4 mutabakat | **PF9 MVP Kısmi** | Sandbox banka job + online tahsilat webhook |

## Raporlar

| Paraşüt akış | BEEMMB route | Durum | PF / not |
|--------------|--------------|-------|----------|
| Yaşlandırma | `/admin/finance/reports/aging` | Kısmi → **PF1** `dueDate` | PF1 |
| Nakit akışı | `/admin/finance/reports/cashflow` | **PF5 Kısmi** | Dönem kayıtlı nakit + belge tablosu filtresi |
| Kasa-banka raporu | `/admin/finance/reports/bank-cash` | **PF5 Var** | Dönem hareket listesi + CSV export |
| Gelir-gider kalem | `/admin/finance/reports/income-expense` | **PF3 Var** | PF5 export |
| KDV özeti | `/admin/finance/reports/vat-summary` | **PF6 Var** | Salt okuma; beyanname yok |
| Performans (tahsilat/ödeme) | `/admin/finance/reports/performance` | Var | Faz 5 |

## Belge ve e-belge

| Paraşüt akış | BEEMMB route | Durum | PF / not |
|--------------|--------------|-------|----------|
| Satış faturası | `documents` + `edocument` | Var | Finans borç/alacak kaynağı |
| Alış / irsaliye | `documents` | Var | Payables kaynağı |
| Belge → finans hareket önizleme | `/admin/finance/business-documents/[id]/movements` | Var | Faz 7A |
| Vade alanı belgede | `BusinessDocument.dueDate` | **PF1 Var** | Nullable + varsayılan vade |

## Ön muhasebe / export

| Paraşüt akış | BEEMMB | Durum | PF |
|--------------|--------|-------|-----|
| Yevmiye / hesap planı | `/admin/finance/ledger-entries` | **PF8 Var** | Genişletilmiş TDHP alt kümesi; belge satırı write-through |
| Mizan | `/admin/finance/reports/trial-balance` | **PF8 Var** | Defter satırlarından dönem mizanı |
| Mali müşavir export | `/admin/finance/exports` | **PF10 Var** | XML/JSON + Logo/Luca yevmiye CSV |
| Çek / senet portföyü | `/admin/finance/instruments` | **PF7 MVP Var** | Durum geçişinde nakit hareketi |

## PF kabul referansları (PF1–PF6)

| Faz | Paraşüt eşdeğer akış | Ölçülebilir kabul |
|-----|----------------------|-------------------|
| **PF1** | Cari vadesi geçen / yakın vade özeti | Payables & receivables KPI service’ten; `verify-finance-due-date.ts`; aging `dueDate` |
| **PF2** | Cari kart ödeme koşulu | `defaultPaymentTermDays` okuma; tahsilat/ödeme varsayılan vade metni |
| **PF3** | Gelir-gider raporu | `/admin/finance/reports/income-expense` + `verify-finance-income-expense-report.ts` |
| **PF4** | Banka mutabakat | Ekstre import + eşleştirme + opsiyonel otomatik muhasebeleşme |
| **PF5** | Tarih aralıklı kasa raporu | Rapor query + export |
| **PF6** | KDV yönetim özeti | Salt okuma özet rapor |
| **PF7** | Çek/senet portföy | Liste + detay + lifecycle; `verify-finance-negotiable-instrument-lifecycle.ts` |
| **PF9** | Banka API / online tahsilat | Sandbox connector + webhook idempotency; `verify-finance-pf9-integration.ts` |
| **PF10** | Mali müşavir export | `finance.audit.read`, XML/JSON + Logo/Luca CSV; `verify-finance-advisor-export.ts` |
| **PF8** | Ön muhasebe defter | Write-through (tahsilat/ödeme/kasa/belge) + mizan; `verify-finance-trial-balance-and-document-ledger.ts` |

## Admin manuel kontrol (PF1)

12. **Vade ve gecikme (PF1)**  
    - `/admin/finance/payables` ve `/admin/finance/receivables` üst KPI kartları (vadesi geçen, yakın vade) service tutarları ile uyumlu olmalı.  
    - “Yalnız vadesi geçen” filtresi listeyi daraltmalı; satırda gecikme / kalan gün ipucu görünmeli.  
    - Yaşlandırma raporunda belgede `dueDate` varsa bucket hesabı buna göre olmalı (`npm run verify:finance:due-date`).
