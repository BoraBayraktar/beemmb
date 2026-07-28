# Finans Modulu Mimari Tasarimi

Bu dokuman, mevcut BEEMMB yapisinda finans modulu ailesinin nasil tasarlanacagini tanimlar.

Amac:

- mevcut `products`, `inventory`, `orders`, `documents` omurgasiyla entegre calisan
- ancak ekran ve route sinirlari net olan
- UI tarafinda bilgi yogunlugu kontrollu kalan
- `DEVELOPMENT_RULES.md` ile uyumlu

bir finans yapisini uygulamaya hazir hale getirmektir.

## Tasarim Ilkeleri

Bu alan icin temel kurallar:

- finans modulu tek bir buyuk ekran olarak tasarlanmaz
- her ana is alani kendi route'u uzerinde calisir
- moduller arasi veri birlestirme service katmaninda yapilir, UI katmaninda yapilmaz
- bir sayfa baska bir modulu kendi icinde yeniden kurmaz
- detay ihtiyaci link, drawer veya detay sayfasi ile acilir; varsayilan ekran sade kalir
- `ozet -> liste -> detay` akisi ana desen olarak kullanilir
- teknik detaylar varsayilan yuzeyde degil, ikinci katmanda sunulur

## Hedef Modul Ailesi

Finans alani tek modul adi altinda birden fazla alt alan olarak ele alinir:

### 1. `finance/payables`

Amac:

- tedarikci borclarini takip etmek
- satin alma belgesi, e-fatura ve irsaliye baglantilarini tek borc gorunumunde toplamak

Kapsam:

- acik borc ozeti
- vade bazli borc listesi
- belge bazli borc kayitlari
- tedarikci detayina gecis

### 2. `finance/receivables`

Amac:

- musteri alacaklarini takip etmek
- siparis, belge ve odeme durumu baglamini tek alacak gorunumune cevirmek

Kapsam:

- acik alacak ozeti
- gecikmis alacaklar
- siparis veya belge bazli acik bakiye
- musteri detayina gecis

### 3. `finance/accounts`

Amac:

- cari hareketleri standart bir ekstre yapisinda gostermek

Kapsam:

- borc/alacak hareket satirlari
- belge, tahsilat, odeme ve iade baglantilari
- bakiye akisi

Not:

- bu alan tek basina ana dashboard olmaz
- musteri ve tedarikci detay ekranlarinin ana veri kaynagi olur

### 4. `finance/collections`

Amac:

- tahsilat kayitlarini yonetmek

Kapsam:

- tahsilat olusturma
- alacak kaydi ile eslestirme
- musteri bazli tahsilat listesi
- durum takibi

### 5. `finance/payments`

Amac:

- tedarikci odemelerini yonetmek

Kapsam:

- odeme kaydi olusturma
- borc kaydi ile eslestirme
- tedarikci bazli odeme listesi
- durum takibi

### 6. `finance/reports`

Amac:

- operasyonel karar destegi sunmak

Kapsam:

- alacak yaslandirma
- borc yaslandirma
- tahsilat performansi
- odeme performansi
- stok degerleme finans gorunumu
- nakit akis ozetleri

## Diger Modullerle Entegrasyon Sinirlari

### `catalog` ile entegrasyon

Finans modulunun `catalog` tarafindan kullanacagi alanlar:

- urun satis fiyati
- alis fiyati
- KDV orani
- birincil tedarikci iliskisi
- urunun satisa veya alisa acik olma durumu

Kurallar:

- finans ekrani urun yonetim formunu kendi icinde gommez
- urun kartina ait alanlar finans icinde sadece referans veri olarak kullanilir
- urun detay ihtiyaci varsa `products` route'una link verilir

### `inventory` ile entegrasyon

Finans modulunun `inventory` tarafindan kullanacagi alanlar:

- stok giris ve cikis hareketleri
- purchase receipt baglantisi
- maliyet gorunumu
- stok degerleme ozeti
- kaynak belge ve karsi taraf bilgisi

Kurallar:

- finans sayfasinda tam stok operasyon arayuzu acilmaz
- stok hareket gecmisi finans icinde tam tablo olarak yeniden kurulmaz
- finans tarafi stok bilgisini ozet veya referans link olarak kullanir

### `commerce` ile entegrasyon

Finans modulunun `commerce` tarafindan kullanacagi alanlar:

- siparis toplamlari
- odeme durumu
- refund etkisi
- siparis tarihi ve musteri baglanti bilgisi

Kurallar:

- finans ekraninda siparis operasyon detaylari ana icerik olmaz
- siparis satir detaylari ancak ilgili kayit detayinda acilir
- siparisin asıl yonetimi `orders` modulunde kalir

### `documents` ile entegrasyon

Finans modulunun `documents` tarafindan kullanacagi alanlar:

- belge tipi
- belge numarasi
- issue date
- karsi taraf bilgisi
- toplam tutar
- siparis ve stok islem baglantisi
- e-fatura ve e-irsaliye durumu

Kurallar:

- finans tarafinda belge formu kopyalanmaz
- belge dispatch ve provider operasyonlari `documents` alaninda kalir
- finans ekrani belgeyi borc/alacak kaydinin kaynagi olarak kullanir

## Route Tasarimi

Ana route yapisi:

- `/admin/finance`
- `/admin/finance/payables`
- `/admin/finance/receivables`
- `/admin/finance/accounts`
- `/admin/finance/collections`
- `/admin/finance/payments`
- `/admin/finance/reports`

Detay route yapisi:

- `/admin/finance/suppliers/[id]`
- `/admin/finance/customers/[id]`
- `/admin/finance/accounts/[id]`
- `/admin/finance/collections/[id]`
- `/admin/finance/payments/[id]`
- `/admin/finance/reports/aging`
- `/admin/finance/reports/cashflow`
- `/admin/finance/reports/stock-value`

Yardimci operasyon route'lari:

- `/admin/finance/payables/[id]`
- `/admin/finance/receivables/[id]`

Not:

- ilk fazda detay route'lari drawer yerine sayfa olarak kurgulanmalidir
- boylece bilgi ic ice gecmez ve ekran karmasasi azalir

## Sayfa Yogunlugu Kurallari

Tum finans sayfalari su ortak UX kuralina uyar:

### Varsayilan ust alan

- sayfa basligi
- kisa aciklama
- 3 ila 5 KPI karti
- sade filtreler

### Ana icerik

- tek amaca hizmet eden liste veya ozet tablo
- liste satirinda yalnizca karar icin gerekli alanlar

### Ikinci katman

- satir detayina git
- ilgili belgeyi ac
- ilgili siparisi ac
- ilgili stok islemini ac
- ilgili cari ekstreyi ac

Sunlar ayni ekranda biriktirilmez:

- tam belge formu
- tam siparis detayi
- tam stok hareket operasyonu
- cari ekstre ve tahsilat formu ayni yuzeyde
- rapor ve islem listesi ayni ana blokta

## Hedef Sayfa Davranislari

### `/admin/finance/payables`

Varsayilan alanlar:

- toplam acik borc
- vadesi gecen borc
- bu ay gelen belge adedi
- taslak belge riski

Liste alanlari:

- tedarikci
- belge sayisi
- acik tutar
- para birimi
- son belge tarihi
- yakin vade bilgisi

Satir aksiyonlari:

- borc detayi
- tedarikci ekstresi
- ilgili belgeler

### `/admin/finance/receivables`

Varsayilan alanlar:

- toplam acik alacak
- vadesi gecen alacak
- tahsilat bekleyen siparis sayisi
- iade etkisi olan kayit sayisi

Liste alanlari:

- musteri
- siparis veya belge adedi
- acik bakiye
- odeme durumu ozeti
- son islem tarihi

Satir aksiyonlari:

- alacak detayi
- musteri ekstresi
- ilgili siparisler

### `/admin/finance/accounts/[id]`

Bu ekran yalnizca tek cari icin calisir.

Bolumler:

- cari ozet karti
- bakiye kartlari
- hareket listesi
- filtreler

Hareket tipleri:

- belge
- tahsilat
- odeme
- iade
- manuel duzeltme

### `/admin/finance/reports/stock-value`

Amac:

- stok modulu icindeki degerleme verisini finans diline cevirmek

Kapsam:

- toplam stok degeri
- depo bazli stok degeri
- kategori bazli stok degeri
- maliyet yontemi etkisi

Kurallar:

- bu ekran stok operasyon sayfasi degildir
- sayim, transfer veya manuel stok aksiyonu bu ekranda acilmaz

## Service Katmani Tasarimi

Onerilen dosya yapisi:

- `src/modules/finance/contracts/finance-overview.contract.ts`
- `src/modules/finance/contracts/payables.contract.ts`
- `src/modules/finance/contracts/receivables.contract.ts`
- `src/modules/finance/contracts/accounts.contract.ts`
- `src/modules/finance/contracts/collections.contract.ts`
- `src/modules/finance/contracts/payments.contract.ts`
- `src/modules/finance/contracts/reports.contract.ts`

- `src/modules/finance/services/finance-overview.service.ts`
- `src/modules/finance/services/payables.service.ts`
- `src/modules/finance/services/receivables.service.ts`
- `src/modules/finance/services/accounts.service.ts`
- `src/modules/finance/services/collections.service.ts`
- `src/modules/finance/services/payments.service.ts`
- `src/modules/finance/services/reports.service.ts`

- `src/modules/finance/repositories/finance.repository.ts`

Repository kurallari:

- finans repository yalnizca kendi sorgu ihtiyaclari icin kullanilir
- diger modullerin repository'lerine UI veya API katmani ulasmaz
- moduller arasi is mantigi service seviyesinde birlestirilir

## Veri Modeli Yol Haritasi

Ilk asamada mevcut veriyle cikarilabilecek yapilar:

- supplier payables
- customer receivables
- order linked receivable summary
- inventory linked payable summary
- document linked account movement preview

Ikinci asamada eklenmesi muhtemel tablolar:

- `FinanceAccount`
- `FinanceAccountEntry` (ertelendi; bkz. asagida)
- `CollectionRecord`
- `PaymentRecord`
- `AllocationLink`

`FinanceAccountEntry` durumu:

- Ayri DB tablosu henuz acilmadi; mevcut ihtiyac `accounts.service` (payables + receivables birlestirici liste) ve `counterparty-ledger.service` (musteri/tedarikci ekstre projeksiyonu) ile karsilanir.
- `AdminFinanceAccountEntry` yalnizca UI/API contract'idir; kalici hareket kaynagi `CashTransaction`, `CollectionRecord`, `PaymentRecord` ve belge ozetleridir.
- Tek satirlik birlestirici tablo ihtiyaci netlestiginde migration ayri bir faz olarak planlanir.

Bu yeni tablolar eklenirse kurallar:

- musteri ve tedarikci kimligi mevcut domain modelleriyle iliskilenir
- belge veya siparis kaynagi nullable referans alanlariyla baglanir
- manuel hareketler acikca isaretlenir
- audit ve izlenebilirlik zorunlu tutulur

## Admin Route Backlog

### Faz 1

Hedef:

- mevcut `payables` ekranini mimari referans haline getirmek
- finans ana route haritasini acmak

Isler:

1. `/admin/finance` overview route tasarla
2. `/admin/finance/payables` ekranini KPI + liste + detay akisina sabitle
3. finance menu altinda gelecekteki route'lar icin bilgi mimarisi kur

### Faz 2

Hedef:

- musteri alacaklari omurgasini kurmak

Isler:

1. `receivables.contract.ts`
2. `receivables.service.ts`
3. `/admin/finance/receivables`
4. musteri bazli acik bakiye gorunumu

### Faz 3

Hedef:

- cari ekstre deneyimini ayri route olarak sunmak

Isler:

1. `/admin/finance/customers/[slug]` (dokumanda `[id]` yerine slug kullanilir)
2. `/admin/finance/suppliers/[slug]`
3. `/admin/finance/accounts/[id]` musteri veya tedarikci kimligine yonlendirir
4. hareket tipleri ve kaynak baglantilarini standardize etmek

Durum:

- `finance-movement-reference.service.ts` ile `collection:`, `payment:`, `order:` referans sozlugu
- cari ekstre linkleri merkezi `/finance/accounts/{id}` route'u uzerinden acilir
- cari ekstre satir ve ozet metinleri `counterparty-ledger-copy.resolver.ts` + `tr.json`

### Faz 3A (cari kimlik baglantisi)

Hedef:

- gelir/gider ve otomatik finans hareketlerinde musteri/tedarikci kimligini domain modellerine baglamak
- cari ekstre route'larini acmak

Isler:

1. `CashTransaction` uzerinde `customerAccountId`, `supplierId`, `counterpartyKind`
2. `counterparty-lookup.service.ts` ve `/api/admin/finance/counterparties`
3. `/admin/finance/customers/[slug]` ve `/admin/finance/suppliers/[slug]`
4. gelir/gider formunda kayitli cari secimi + kayitsiz fallback
5. tahsilat/odeme kaynakli hareketlerde FK + `sourceReferenceId` standardi

Kabul:

- manuel hareketler `MANUAL` sourceType ile kalir
- kayitli cari secimi zorunlu degil; `UNREGISTERED` acikca desteklenir
- UI katmani yalnizca finance API uzerinden cari arar

### Faz 4

Hedef:

- tahsilat ve odeme hareketlerini sisteme almak

Isler:

1. `collections` modulu
2. `payments` modulu
3. acik kayitlarla eslestirme akisi
4. hareket detay ekranlari

### Faz 4B (eslestirme ve hareket detayi)

Durum:

- `FinanceAllocationLink` tablosu ve tahsilat/odeme olusturma sirasinda belge/siparis dagitimi
- `/admin/finance/transactions/[id]` finans hareket detay ekrani
- odeme kaynakli eski `CashTransaction` satirlari icin supplier FK backfill

Kabul:

- tahsilat kaydi siparis belgelerine FIFO dagitilir; kalan tutar siparis hedefinde kalir
- odeme kaydi tedarikci belgelerine FIFO dagitilir
- hareket detayinda eslestirme ozeti acilabilir panelde gosterilir

### Faz 4C (manuel eslestirme ve satir dagitimi)

Durum:

- otomatik FIFO dagitim belge satirlarina (`BUSINESS_DOCUMENT_LINE`) iner
- tahsilat/odeme detayinda manuel eslestirme paneli
- `POST /api/admin/finance/allocations/replace`
- siparis tahsilat oncesi belge e-postasindan musteri karti baglama (`commerceService.linkCustomerAccountFromOrderDocuments`)

Kabul:

- manuel eslestirme tutarlari kayit tutari ile birebir eslesmelidir
- satir secimi yalnizca ilgili siparis/tedarikci belgelerinden yapilir

Migration: `20260727010000_finance_phase3_4c_allocation_lines` (`BUSINESS_DOCUMENT_LINE`, `businessDocumentLineId`, legacy COLLECTION `sourceReferenceId` backfill)

Dogrulama: `npm run verify:finance:phase4c` (movement reference, FIFO satir dagitimi, tahsilat/odeme akis sirasi, manuel replace route, cari redirect smoke)

## Admin Manuel Kontrol Listesi (Faz 3 / 4C)

Amac: Otomatik dogrulama (`npm run verify:finance:phase4c`) gectikten sonra, yonetim panelinde finans akislarinin gercek veri ile beklendigi gibi calistigini kisa elle kontrol etmek.

On kosullar:

- `finance.manage` yetkisi olan bir backoffice kullanicisi ile giris yapilmis olmali
- Migration `20260727010000_finance_phase3_4c_allocation_lines` uygulanmis olmali
- Test icin acik alacakli bir siparis (tercihen fatura satirlari olan) ve tedarikci borcu olan bir tedarikci kaydi hazir olmali

Adimlar:

1. **Otomatik zincir**
   - `npm run verify:finance:phase4c` komutu hatasiz bitmeli.
   - Staging veya yerel DB ile: `npm run verify:finance` (cari lookup dahil).

2. **Cari ekstre yonlendirmesi (Faz 3)**
   - Finans > Cari hareketler listesinden kayitli bir musteri veya tedarikci icin ekstre linkini acin; URL slug tabanli `/admin/finance/customers/...` veya `/admin/finance/suppliers/...` olmali.
   - Ayni carinin kimlik id'si ile `/admin/finance/accounts/{id}` adresine gidin; slug ekstre route'una yonlendirilmeli, 404 olmamali.

3. **Tahsilat oncesi musteri baglantisi (Faz 4C)**
   - Siparis henuz musteri kartina bagli degilse, ilgili is belgesinde counterparty e-postasi olan bir siparis secin.
   - Tahsilat kaydi olusturun; siparis detayinda veya cari ekstrede musteri kartinin olusturulmus veya baglanmis oldugunu dogrulayin.

4. **Otomatik satir eslestirmesi**
   - Yeni tahsilat sonrasi tahsilat detayinda (veya ilgili gelir/gider hareket detayinda) acilir "Acik kayit eslestirmesi" panelinde belge satiri (`BUSINESS_DOCUMENT_LINE`) dagitimi gorunmeli; tutar kayit tutari ile eslesmeli.
   - Kismi tahsilat senaryosunda kalan tutarin siparis (`ORDER`) hedefinde kaldigini kontrol edin.

5. **Manuel satir eslestirmesi — tahsilat**
   - `/admin/finance/collections/{orderId}` detayinda "Manuel kayit eslestirmesi" panelini acin.
   - Belge satirlari secerek tutarlari kayit tutarina esitleyin ve kaydedin; basari mesaji ve sayfa yenilemesi sonrasi ozet dengeli olmali.
   - Bilerek toplam tutari kayit tutarindan farkli gondermeyi deneyin; API hata mesaji gostermeli, kayit bozulmamali.

6. **Manuel satir eslestirmesi — odeme**
   - `/admin/finance/payments/{supplierKey}` detayinda ayni manuel panel akisini tedarikci belge satirlari icin tekrarlayin.

7. **Gelir / gider hareket detayi**
   - Tahsilat veya odeme kaynakli bir hareket icin `/admin/finance/transactions/{id}` acin.
   - Eslestirme ozeti, cari ekstre linki (kayitli cari varsa) ve `collection:` / `payment:` kaynak referansi tutarli olmali.

8. **Gelir / gider formu (Faz 3A)**
   - Manuel gelir veya gider kaydinda kayitli musteri/tedarikci secimi ve kayitsiz karşı taraf fallback'i calismali; kayitli cari secildiginde ekstre linki acilabilmeli.

9. **Belge → finans hareket onizlemesi (Faz 7A)**
   - Is belgesi drawer veya borc detayindan “Finans hareketleri” linki `/admin/finance/business-documents/{documentId}/movements` acmali; salt okuma ozet gorunmeli.
   - Alacak veya tahsilat detayinda (`/admin/finance/receivables/{orderId}` ve `/admin/finance/collections/{orderId}`) siparis belgeleri listelenmeli; belge satirindan ayni movements route’una gidilebilmeli.
   - Finans > Cari hareketler listesinde satir menusunden finans hareket onizleme linki acilabilmeli (alacak/borc tipine gore).

10. **Envanter baglantili borc ozeti (Faz 7B)**
    - Tedarikci borc/odeme detayinda “Envanter baglantisi” paneli acilinca ozet yuklenmeli; stok hareketi veya envanter yazma aksiyonu olmamali.

11. **Finans raporlari (Faz 5)**
    - `/admin/finance/reports` hub’indan aging, cashflow, stok degeri ve performans raporlari acilmali; rapor sayfalari salt okuma, stok/belge operasyon formu icermemeli.

12. **Vade ve gecikme (PF1)**  
    - `/admin/finance/payables` ve `/admin/finance/receivables` ust KPI kartlari service tutarlari ile uyumlu olmali.  
    - `overdueOnly=1` filtresi yalniz vadesi gecen kayitlari gostermeli.  
    - `npm run verify:finance:due-date` hatasiz calismali.  
    - Matris: [FINANCE_PARASUT_GAP_MATRIX.md](./FINANCE_PARASUT_GAP_MATRIX.md).

13. **Cari kart finans alanlari (PF2)**  
    - `/admin/customer-accounts` ve `/admin/suppliers` formlarinda varsayilan vade ve kredi limiti kaydedilebilmeli.  
    - Cari ekstre (`/admin/finance/customers|suppliers/[slug]`) finans kosullari ozetini gostermeli.  
    - Tahsilat/odeme detayinda varsayilan vade ipucu salt okuma olmali.  
    - `npm run verify:finance:counterparty-payment-terms` hatasiz calismali.

Basarisizlikta:

- Ilgili API route ve service loglarina bakin; UI'da is kurali hatasi service katmanindan gelmeli, dogrudan repository cagrisi olmamali.
- Migration ve `npm run verify:finance:phase4c` ciktisini tekrar kontrol edin.

### Faz 5

Hedef:

- karar destek raporlarini ayrik route'larda acmak

Isler:

1. aging report
2. cashflow report
3. stock-value report
4. tahsilat/odeme performans kartlari

Durum:

- `/admin/finance/reports/performance` tahsilat ve odeme tamamlanma oranlarini ve kalan acik bakiyeleri raporlar
- aging, cashflow ve stock-value ayri route’larda `reports.service` uzerinden
- reports hub kart listesine performans raporu eklendi
- rapor kullanici metinleri `tr.json` + `finance-reports-copy.resolver.ts`
- belge finans preview metinleri `document-finance-preview-copy.resolver.ts`
- `verify-finance-i18n-copy.ts` (resolver anahtarları ↔ `tr.json`; alacak fallback, eşleştirme hata metinleri, tahsilat/ödeme/nakit doğrulamaları)
- `verify-finance-reports.ts` (`verify:finance:phase4c` zinciri)

## Iyilestirme ve Sonraki Faz Plani

Bu bolum, mevcut Faz 1–5 tamamlandiktan sonra kalan tutarlilik, denetim, UX ve yol haritasi maddelerini uygulama sirasiyla tanimlar. Tum maddeler `DEVELOPMENT_RULES.md` ile uyumludur: Contract → Repository → Service, UI’da is kurali yok, metinler yalnizca `src/i18n/tr.json`, API route’lar ince adapter.

### Oncelik Ozeti

| Sira | Faz | Odak | Tahmini kapsam |
|------|-----|------|----------------|
| 0 | Operasyon | Migration + verify + manuel liste | Operasyon |
| 1 | 6A | Referans ve eslestirme tutarliligi | Kucuk |
| 2 | 6B | Finans audit kaydi | Orta |
| 3 | 6C | Cari ekstre linkleri | Kucuk |
| 4 | 6D | Satir bazli kalan acik tutar | Orta |
| 5 | Surec | CI / release train | Kucuk |
| 6 | 7A | Belge → cari hareket onizlemesi | Orta |
| 7 | 7B | Envanter → borc ozeti baglantisi | Orta–Buyuk |
| — | 8 | `FinanceAccountEntry` tablosu | Ertelenmis (ihtiyac netlesince) |

**Durum (2026-07):** Faz 0 operasyon maddeleri surecte; Faz 6A–6E, 7A ve 7B kod + `verify:finance:phase4c` kapsaminda tamamlandi. Faz 8 kalici tablo acilmadan sanal projeksiyon ile karsilanir.

**Paraşüt finans hizalama:** Ayri faz plani [FINANCE_PARASUT_ALIGNMENT_PLAN.md](./FINANCE_PARASUT_ALIGNMENT_PLAN.md) (PF0–PF10). Mevcut 6A–7B tamamlanan omurganin uzerine insa edilir; tam on muhasebe parity PF8/PF10 ile urun kararina baglidir.

---

### Faz 0 — Operasyonel kapanis (kod degil)

Hedef: Tum ortamlarda mevcut finans semasi ve dogrulama zinciri calisir durumda olsun.

Isler:

1. Migration zinciri uygulanmis olsun (ozellikle `20260727010000_finance_phase3_4c_allocation_lines` ve oncesi finans migration’lari).
2. Her deploy oncesi `npm run verify:finance:phase4c`; DB erisimi olan ortamlarda `npm run verify:finance` (cari lookup dahil).
3. Kritik release’lerde `docs/FINANCE_MODULE_ARCHITECTURE.md` icindeki **Admin Manuel Kontrol Listesi (Faz 3 / 4C)**.

Kabul: Staging ve production’da verify hatasiz; manuel listede bloklayici madde yok.

---

### Faz 6A — Referans standardi ve odeme eslestirme tutarliligi

Durum:

- `buildFinanceTransferReference` ile transfer nakit hareketleri standardize edildi
- odeme olusturmada satir sonrasi kalan tutar belge (`BUSINESS_DOCUMENT`) FIFO fallback
- finans overview nakit hareketleri aciklamasi guncellendi

### Faz 6B — Finans yazma islemleri audit

Durum:

- tahsilat/odeme POST route audit (mevcut)
- manuel eslestirme `POST /api/admin/finance/allocations/replace` audit eklendi
- `verify-finance-audit-wiring.ts`

### Faz 6C — Cari ekstre → hareket detayi

Durum:

- `counterparty-ledger.service.ts` nakit satirlari `/finance/transactions/[id]` linkine yonlendirir

### Faz 6D — Satir bazli kalan acik tutar

Durum:

- `sumAllocatedAmountsByBusinessDocumentLineIds` repository sorgusu
- otomatik/manuel eslestirmede acik satir cap dogrulamasi
- manuel panel satir seceneklerinde guncel acik tutar

### Faz 6E — Surec ve CI

Durum:

- `phase5-quality-gates.yml` icinde `verify:finance:phase4c` ve seed sonrasi `verify:finance:counterparty` (lookup API + DB)
- `RELEASE_TRAIN.md` finans regression maddesi
- `npm run verify:finance` meta script (`phase4c` + `counterparty`; lookup icin calisan DB gerekir)

---

### Faz 6A — Referans standardi ve odeme eslestirme tutarliligi (plan detayi)

Hedef: Tahsilat, odeme ve transfer kaynak referanslari tek sozlukte; odeme tarafinda bos satir senaryosu tahsilat ile ayni mantiga yaklasir.

Isler:

1. **`finance-movement-reference.service.ts`**
   - Transfer icin `buildFinanceMovementReference("transfer", ...)` kullanimi tasarla (mevcut `accountId:targetId:iso` bilgisini tek `id` parcasinda koruyarak veya normalize ederek).
   - `cash-transactions.service.ts` transfer ciftini bu referansa gecir; geriye donuk okuma icin `parseFinanceMovementReference` legacy `transfer:` stringlerini desteklemeye devam etsin.

2. **`allocation.service.ts` — odeme**
   - `createPaymentAllocations`: belge satiri yoksa veya dagitim bos donerse, tahsilattaki gibi anlamli fallback (or. tedarikci duzeyinde `BUSINESS_DOCUMENT` FIFO veya acik kayit ozeti icin acikca bos + UI mesaji) tanimla; davranisi dokumante et.
   - Contract’ta odeme ozeti bos oldugunda UI’nin gosterecegi durum net olsun.

3. **`finance-overview.service.ts`**
   - Nakit hareketleri bolum aciklamasini guncelle (“sonraki faz” ifadesini kaldir; tahsilat/odeme entegrasyonu mevcut).

4. **i18n (`tr.json`)**
   - Overview ve gerekirse odeme “eslestirme yok” bos durum metinleri.

5. **Verify**
   - `verify-finance-movement-reference.ts`: transfer round-trip.
   - `verify-finance-allocation-lines.ts` veya smoke: odeme fallback senaryosu (unit mantik).
   - `verify:finance:phase4c` guncel kalsin.

Kabul:

- Yeni transfer hareketleri standardize referans tasir; eski kayitlar parse edilebilir.
- Odeme kaydinda satir olmasa bile kullanici/rapor tarafinda tutarsiz “sessiz bos” kalmaz (fallback veya acik bos durum).
- Finans ana sayfa metni guncel.

Bagimlilik: Faz 0.

---

### Faz 6B — Finans yazma islemleri audit

Hedef: Tahsilat, odeme, manuel eslestirme ve (istege bagli) manuel nakit hareketi degisiklikleri izlenebilir olsun.

Isler:

1. **`audit-log.service.ts`**
   - Mevcut `recordFinanceAction` entity tiplerini genislet: `FINANCE_COLLECTION`, `FINANCE_PAYMENT`, `FINANCE_ALLOCATION` (veya tek allocation entity + metadata).

2. **Service cagrilari (UI degil)**
   - `collections.service.ts`: kayit olusturma.
   - `payments.service.ts`: kayit olusturma.
   - `allocation.service.ts`: `replaceCollectionAllocations` / `replacePaymentAllocations` (onceki/sonraki ozet hash veya tutar metadata).
   - Isteg bagli: `cash-transactions.service.ts` manuel `MANUAL` kayitlar.

3. **Contract**
   - Audit payload alanlari service icinde sabitlensin; secret/tam PAN vb. yazilmasin.

4. **Verify**
   - Statik smoke: ilgili service dosyalarinda `recordFinanceAction` cagrisi varligi (or. `verify-finance-audit-wiring.ts`).

Kabul: Basarili tahsilat/odeme/manuel eslestirmede audit satiri olusur; RBAC `audit.read` ile okunabilir.

Bagimlilik: Faz 6A (referanslar audit metadata’da tutarli olsun).

---

### Faz 6C — Cari ekstre → hareket detayi

Hedef: Ekstredeki nakit satirlari arama yerine dogrudan hareket detayina gitsin (Faz 4B route).

Isler:

1. **`counterparty-ledger.service.ts`**
   - `listCashTransactionsForCustomerAccount` / supplier listesinde `transaction.id` zaten var; `financeHref` → `/${locale}/admin/finance/transactions/${id}`.

2. **UI**
   - `finance-counterparty-ledger` (veya ilgili manager): mobilde de tiklanabilir link; ozet ekraninda ekstra detay acma.

3. **i18n**
   - Gerekirse “Hareket detayi” etiketi.

Kabul: Ekstrede gelir/gider satirina tiklaninca `/finance/transactions/[id]` acilir.

Bagimlilik: Yok (Faz 4B mevcut).

---

### Faz 6D — Satir bazli kalan acik tutar (cift eslestirme onleme)

Hedef: Manuel ve otomatik eslestirmede ayni belge satirina toplam tahsis, satirin acik tutarini asmasin.

Isler:

1. **Repository**
   - Siparis veya tedarikci icin satir bazinda mevcut `FinanceAllocationLink` toplamlarini donen sorgular (soft-deleted haric).

2. **`allocation.service.ts`**
   - `buildLineOptions` / `getOrderAllocationContexts` / `getSupplierAllocationContexts`: `openAmount = satir tutari - daha once eslesen`.
   - `replace*`: her kalem icin kalan acik cap dogrulamasi (mevcut kayit haric tutularak replace senaryosu).

3. **Contract**
   - `AdminFinanceAllocationLineOption.openAmount` anlami dokumante; sifir kalan satirlar listeden dusulebilir.

4. **Verify**
   - Unit: iki tahsilat senaryosunda ikinci tahsis cap’i.

Kabul: Ayni satira iki tahsilat toplami satir tutarini asamaz; UI’da gosterilen acik tutar guncel.

Bagimlilik: Faz 6A odeme fallback netlestikten sonra (satir yok senaryosu ile celismesin).

---

### Faz 6E — Surec ve CI (finans zinciri)

Hedef: Release ve CI’da finans regresyonu tekrarlanabilir olsun.

Isler:

1. **`phase5-quality-gates.yml`**: Mevcut `verify:finance:phase4c` korunur.
2. **Istege bagli**: CI DB hazirsa `verify:finance:counterparty` (lookup API) ayni job’a eklenir; degilse nightly veya staging-only dokumante edilir. *(Uygulandi: `phase5-quality-gates.yml` seed sonrasi.)*
3. **`docs/RELEASE_TRAIN.md`**: Finans adimi — `verify:finance:phase4c` + Faz 0 manuel liste referansi.
4. **`package.json`**: `verify:finance` meta script (phase4c + counterparty) dokumantasyon amacli.

Kabul: Release train dokumani finansi kapsar; CI’da en az phase4c calisir.

Bagimlilik: Faz 6A verify guncellemeleri.

---

### Faz 7A — Belge baglantili cari hareket onizlemesi

Hedef: Belge detayindan veya finans listelerinden, cari ekstrede gorulecek hareket onizlemesine gecis (ayri modul ekrani kurmadan link/route).

Isler:

1. **Contract + service**
   - Or. `document-finance-preview.service.ts` (documents modulunden finance service’e degil, finance modulunde documents service uzerinden): belge id → ilgili tahsilat/odeme/nakit ozet DTO.

2. **Route**
   - Belge admin detayinda veya finans payables/receivables satirinda “Finans hareketleri” linki (ayri route veya mevcut documents detayinda acilir panel — `ozet -> detay` ilkesi).

3. **Sinir**
   - UI belge dispatch/stok formu acmaz; yalnizca okuma + link.

Kabul: Kullanici belgeden ilgili finans kayitlarini gorur ve detay route’una gidebilir.

Bagimlilik: Faz 6B audit (onizleme salt okuma).

Durum:

- `document-finance-preview.service.ts`, movement preview API ve `/admin/finance/business-documents/[documentId]/movements`
- belge drawer ve borc detayinda finans hareketleri linki
- alacak detayinda siparis belgeleri ve `/finance/collections/[orderId]` linki
- cari hareketler (`/finance/accounts`) satirinda `financeMovementPreviewHref`
- `verify-finance-document-movement-preview.ts`
- `verify-finance-receivables-7a-projection.ts` (`verify:finance:phase4c` zinciri)

---

### Faz 7B — Envanter baglantili borc ozeti

Hedef: `inventory linked payable summary` yol haritasi maddesi; payables ile envanter maliyet/stok otoritesi arasinda service seviyesinde ozet (tek ekranda stok operasyonu yok).

Durum:

- `inventoryService.listTransactionSummariesForFinance`
- `inventory-payable-summary.service.ts` ve borc/odeme detayinda acilir envanter paneli
- `verify-finance-inventory-payable-summary.ts`

Isler (plan):

1. **`docs/INVENTORY_COSTING_POLICY.md` / `INVENTORY_STOCK_AUTHORITY.md`** ile uyumlu okuma modeli tanimla.
2. **Service**: tedarikci + urun/variant bazinda acik borc ve envanter deger ozetini birlestiren rapor veya payables detay zenginlestirmesi.
3. **Route**: `/admin/finance/payables` detayinda acilir “Envanter baglantisi” paneli veya `/admin/finance/reports/...` alt route.
4. **Verify**: salt okuma + fixture/mock ozet mantigi.

Kabul: Borc ozeti envanter referansi tasir; stok hareketi finans ekranindan yapilmaz.

Bagimlilik: Envanter modulu API’leri stabil; Faz 7A ile cakismamasi icin ayri route.

---

### Faz 8 — `FinanceAccountEntry` / `FinanceAccount` (ertelenmis)

Hedef: Tek tabloda birlestirici hareket ihtiyaci is olarak netlestiginde acilir.

Tetikleyiciler (ornek):

- Cari ekstre + accounts listesi performans sorunu
- Dis muhasebe export tek satir format zorunlulugu
- Denetimde tek hareket defteri raporu

Isler (ihtiyac aninda):

1. Schema + migration (`FinanceAccountEntry`, gerekirse `FinanceAccount`).
2. Projection job veya write-through: mevcut `CashTransaction`, `CollectionRecord`, `PaymentRecord` kaynaklari.
3. `counterparty-ledger` ve `accounts.service` read path’lerini kademeli gecis.

Simdi: Kalici tablo acilmaz; sanal projeksiyon `finance-account-entry-projection.service.ts` uzerinden `accounts.service.listAccountEntries` sunulur (Faz 7A receivables/belge linkleri dahil).

Durum:

- `financeMovementPreviewHref` cari hareketler listesinde (alacak/borc)
- alacak detayinda siparis belgeleri + tahsilat linki (7A tamamlama)
- `verify-finance-receivables-7a-projection.ts`

---

### Uygulama Sirasi (ozet)

```text
Faz 0 (ops) → 6A → 6E (paralel 6A sonrasi) → 6B → 6C (paralel 6B)
→ 6D → 7A → 7B → [Faz 8 ihtiyaca gore]
```

Paralel calisabilir: 6C + 6E; 7A ve 7B ayri gelistiricilerde farkli route’lar.

### Her faz icin ortak kontrol listesi

- [ ] Contract guncellendi mi?
- [ ] Is kurali yalnizca service’te mi?
- [ ] API route ince adapter mi?
- [ ] Yeni metinler `tr.json`’da mi?
- [ ] Mobil liste/detay kontrol edildi mi?
- [ ] `verify:finance:*` veya yeni verify script eklendi mi?
- [ ] Mimari dokuman “Durum” bolumu guncellendi mi?

## Uygulama Sirasinda Kacinilacaklar

- tek sayfada urun, stok, siparis, belge ve cari detayini bir araya toplamak
- UI katmaninda farkli modullerin verisini dogrudan birlestirmek
- finans ekranlarinda stok operasyon formu veya belge dispatch operasyonu acmak
- tum finans alanini tek route altinda sekmelerle asiri yogunlastirmak
- drawer icinde ikinci drawer veya ucuncu detay katmani olusturmak

## Karar Ozeti

Bu repo icin uygun hedef su sekildedir:

- finans, diger modullerle entegre ama onlardan bagimsiz route sinirlari olan bir modul ailesi olarak gelistirilir
- `payables`, `receivables`, `accounts`, `collections`, `payments`, `reports` ayri sorumluluk alanlari olarak ele alinir
- varsayilan ekranlar sade tutulur
- detaylar link veya ayri route ile acilir
- service katmani entegrasyon merkezi olur

Bu tasarim, mevcut modular monolith yapisina ve `DEVELOPMENT_RULES.md` icindeki katman kurallarina uygundur.
