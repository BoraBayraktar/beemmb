# Paraşüt Bazlı Stok Revizyon Planı

Bu dokuman, mevcut BEEMMB stok yonetimini Paraşüt'teki stok ve depo operasyonlarina daha yakin hale getirmek icin fazli bir uygulama plani sunar.

Not:

- Faz 1 analiz ciktisi tamamlandi
- detayli Faz 1 bosluk matrisi icin `docs/PARASUT_PHASE1_GAP_ANALYSIS.md` dosyasina bakin

## 1. Amac

Hedef:

- Mevcut basit stok yapisini depo bazli operasyon moduline donusturmek
- Urun karti, stok hareketleri, sayim, transfer, kritik stok ve entegrasyon akislarini netlestirmek
- E-ticaret siparisleri, alim/satim ve ileride e-irsaliye benzeri belge akislarini ayni inventory omurgasina baglamak

## 2. Mevcut Durum Ozeti

Repoda bugun bulunan temel yapi:

- `Product.stock` halen birincil stok alani gibi davraniyor
- `Warehouse`, `InventoryItem`, `InventoryLevel`, `StockReservation`, `InventoryMovement` modelleri mevcut
- Admin inventory ekraninda listeleme, filtreleme, son hareketler ve manuel stok duzeltme var
- Checkout sirasinda rezervasyon ve commit mantigi calisiyor
- Urun formu stok modulu gibi degil, klasik katalog formu gibi calisiyor

Sinirlar:

- Urun kartinda barkod, birim, alis fiyati, kritik stok, varsayilan alis/satis deposu yok
- Depolar arasi transfer, stok sayim, kritik stok bildirimi ve belge bazli operasyon ekranlari yok
- Hareket tipleri var ama is akislarina ayrilmis form altyapisi yok
- Raporlama Paraşüt seviyesinde degil

## 3. Hedef Yetkinlikler

Paraşüt'e benzer hedef kapsam:

- Coklu depo
- Varsayilan depo ve depo bazli stok izleme
- Urun giris/cikis gecmisi
- Kritik stok seviyesi ve bildirim
- Mobil/barkod odakli urun bulma ve islem baslatma zemini
- Alim/satim sonrasi otomatik stok guncelleme
- Depolar arasi transfer
- Stok sayim ve fark hareketleri
- E-ticaret ve harici sistem senkronu icin entegrasyon zemini
- Stok maliyeti, potansiyel satis degeri, dusuk stok ve hareket raporlari

## 4. Fazli Uygulama Plani

### Faz 1 - Inventory cekirdegini dogru otorite haline getirme

Amac:

- `Product.stock` merkezli kurgudan `InventoryLevel` merkezli kurguya gecmek

Kapsam:

- `Product.stock` alanini legacy summary alanina dusurmek
- Tum stok okuma/yazma operasyonlarini inventory aggregate uzerinden gecirmek
- `inventoryService` icinde tek bir stok hesaplama dogrusu tanimlamak
- `Product.stock` ile inventory toplamlarinin gecis doneminde uyumunu koruyacak senkron strateji belirlemek
- resmi stok otoritesi ve gecis kurallarini repo dokumani olarak netlestirmek (`docs/INVENTORY_STOCK_AUTHORITY.md`)

Veri modeli:

- Yeni alan gerekmeyebilir
- Ancak summary senkronizasyon kurali net tanimlanmali

API/Service:

- `inventoryService.getProductAvailability` tek otorite olur
- Katalog ve commerce servisleri dogrudan `Product.stock` okumayi birakir

UI:

- Mevcut inventory ekrani ayni kalabilir
- Urun listesindeki stok gostergeleri inventory toplamindan beslenir

Kabul kriterleri:

- Siparis, urun detay ve admin listeleme ayni stok kaynagindan veri okur
- `Product.stock` ile inventory toplam farki tespit edilebiliyorsa raporlanir

Risk:

- Gecis asamasinda eski stok kodu ile yeni aggregate cakisma riski

### Faz 2 - Urun karti ve depo tanimlarini genisletme

Amac:

- Paraşüt benzeri urun/stok form altyapisini kurmak

Kapsam:

- Urun kartina stok modulu alanlari eklemek
- Depo yonetimini admin panelde ilk sinif module donusturmek

Veri modeli onerisi:

- `Product`
  - `barcode`
  - `unitType`
  - `purchasePrice`
  - `vatRate`
  - `stockTrackingEnabled`
  - `productType` (`PHYSICAL`, `SERVICE`, `RAW_MATERIAL`, `SEMI_FINISHED`)
- `InventoryLevel`
  - `reorderPoint`
  - `safetyStock`
  - gerekirse `preferredSales`
  - gerekirse `preferredPurchase`
- `Warehouse`
  - `description`
  - `address`
  - `contactName`
  - `contactPhone`
  - `priority`

Formlar:

- Urun Karti
  - temel urun bilgileri
  - stok takibi acik/kapali
  - barkod
  - birim
  - alis fiyati / satis fiyati
  - kritik stok seviyesi
  - varsayilan alis deposu
  - varsayilan satis deposu
- Depo Formu
  - kod
  - ad
  - aktif/pasif
  - varsayilanlik
  - iletisim ve adres

Kabul kriterleri:

- Fiziksel urun ve hizmet ayrimi yapilabilir
- Urun olusturma/guncelleme ekranlari yeni alanlari destekler
- Depo tanimlari kod degil, yonetilebilir entity haline gelir

Risk:

- Eski urun CRUD akisi ile yeni stok alanlarinin validation uyumsuzlugu

### Faz 3 - Islem bazli stok formlari ve hareket defteri

Amac:

- Sadece “manuel stok duzeltme” yerine operasyon tiplerine ayrilmis islem ekranlari sunmak

Kapsam:

- Stok giris
- Stok cikis
- Manuel duzeltme
- Hasar/hurda cikisi
- Iade girisi/cikisi
- Depolar arasi transfer

Veri modeli:

- `InventoryMovementType` genisletilir
- Gerekirse ust seviye belge tablosu eklenir:
  - `InventoryTransaction`
  - `InventoryTransactionLine`

Onerilen hareket tipleri:

- `INITIAL_LOAD`
- `MANUAL_ADJUSTMENT`
- `PURCHASE_RECEIPT`
- `SALES_ISSUE`
- `TRANSFER_OUT`
- `TRANSFER_IN`
- `COUNT_ADJUSTMENT`
- `RETURN_IN`
- `RETURN_OUT`
- `DAMAGE_WRITE_OFF`
- `RESERVATION_HOLD`
- `RESERVATION_RELEASE`
- `ORDER_COMMIT`

UI:

- “Stok Islemleri” ana ekrani
- Islem tipine gore dinamik form
- Hareket defteri filtreleri:
  - tarih
  - urun
  - sku/barkod
  - depo
  - islem tipi
  - referans belge

Kabul kriterleri:

- Her stok degisimi bir hareket kaydi uretir
- Transfer tek hareket degil, cikis + giris olarak izlenebilir
- Hareketlerin kaynagi ve notu zorunlu izlenebilir

Risk:

- Tek tablo/tek hareketten belge bazli harekete geciste servislerin yeniden ayrismasi gerekir

### Faz 4 - Sayim, kritik stok ve bildirim motoru

Amac:

- Operasyonel kontrol seviyesini Paraşüt benzeri olgunluga getirmek

Kapsam:

- Sayim fisleri
- Sayim farki uygulama
- Kritik stok dashboard'u
- Bildirim mekanizmasi

Veri modeli onerisi:

- `StockCount`
- `StockCountLine`
- `InventoryAlert`

Formlar:

- Sayim Olustur
  - depo secimi
  - sayim tarihi
  - urun filtreleri
- Sayim Satiri
  - sistem stogu
  - sayilan stok
  - fark
  - aciklama

Bildirimler:

- Kritik stok altina dusen urunler
- Stok tukenmesi
- Uzun suredir hareket gormeyen urunler

Kabul kriterleri:

- Sayim onayi sonrasi fark kadar `COUNT_ADJUSTMENT` hareketi olusur
- Kritik stok listesi admin panelde ayri gorulebilir
- Bildirimler servis katmanindan uretilir

Risk:

- Sayim sirasinda eszamanli siparis akislariyla veri yarisi olusabilir

### Faz 5 - Raporlama ve karar destek katmani

Amac:

- Stok verisini sadece operasyonel degil yonetsel olarak da kullanmak

Kapsam:

- Depo bazli mevcut stok raporu
- Dusuk stok raporu
- Stok hareket ozeti
- Elde bulunan stok maliyeti
- Tahmini satis degeri
- Potansiyel kar
- Donemsel stok giris/cikis trendi

Veri ve servis:

- Read-optimized sorgular
- Gerekirse Redis cache
- Gerekirse raporlama projection tablolari

Kabul kriterleri:

- Admin panelde raporlar filtrelenebilir
- CSV export sunulur
- Buyuk listelerde sorgu performansi kabul edilebilir seviyede olur

Risk:

- Operasyonel tablolardan dogrudan rapor cekmek performansi bozabilir

### Faz 6 - Entegrasyon katmani ve dis sistem senkronu

Amac:

- Paraşüt'teki e-ticaret ve is belge akislarina benzer entegrasyon hazirligi kurmak

Kapsam:

- Siparis -> stok hareketi
- Alim kaydi -> stok girisi
- E-irsaliye/e-fatura benzeri belge referanslari
- Pazaryeri/ERP/dis stok sistemi sync

Veri modeli onerisi:

- `InventoryIntegrationMapping`
- `ExternalStockEvent`
- `InventoryTransaction.externalReference`

Teknik yaklasim:

- `IntegrationSyncJob` uzerinden idempotent queue mantigi
- Gelen ve giden stok eventleri ayri loglanir
- Retry ve dead-letter mekanizmasi kullanilir

Kabul kriterleri:

- Harici sistemden gelen stok guncellemesi referans numarasi ile izlenir
- Ayni event iki kez islenmez
- Sync hatalari admin tarafinda izlenebilir

Sprint 2 notu:

- `InventoryIntegrationMapping` ve `ExternalStockEvent` omurgasi inventory modulu icinde kuruldu
- inbound event uygulamasi yalnizca explicit mapping ve izinli kayitlar uzerinden calisir

Sprint 3 notu:

- stok girisi akisi satin alma belge bilgileriyle genisletildi
- `PurchaseReceipt` ve `PurchaseReceiptLine` uzerinden belge bazli stok girisi izi eklendi
- stok hareketleri belge numarasi, tedarikci ve harici referans ile daha kurumsal izlenebilir hale getirildi

Sprint 4 notu:

- belge referanslari artik `InventoryTransaction` ustunde merkezilesti
- hareket metadata icindeki belge baglamina ek olarak transaction seviyesi belge tarihi, dis referans ve taraf bilgisi saklaniyor
- transaction liste ve detay ekranlari belge baglamini bu merkezi modelden okuyor

Sprint 5 notu:

- inventory operasyon gecmisi genel `AuditLog` listesinden ayrildi
- `InventoryHistoryEvent` projection modeli ile inventory'ye ozel kalici gecmis omurgasi kuruldu
- inventory panelindeki operasyon gecmisi artik bu projection katmanindan okunuyor

Sprint 6 notu:

- raporlamada resmi maliyet yaklasimi `Ağırlıklı ortalama maliyet` olarak netlestirildi
- `InventoryItem` uzerinde `averageUnitCost` ve `lastPurchaseUnitCost` tutuluyor
- satin alma girislerinde maliyet kaydi guncelleniyor, raporlar varsayilan olarak ortalama maliyetten besleniyor

Risk:

- Inventory otoritesi ic sistem mi dis sistem mi olacak karari erken verilmelidir

## 5. Teknik Mimari Notlari

Bu repo kurallarina gore:

- UI dogrudan Prisma'ya gitmemeli
- API route'lari sadece parsing/response mapping yapmali
- Is kurallari service katmaninda kalmali
- Cache invalidation yazma operasyonlarina eklenmeli

Onerilen modul dagilimi:

- `inventory/contracts`
- `inventory/services`
- `inventory/repositories`
- `inventory/ui`
- `inventory/reporting`
- `inventory/integrations`

## 6. Once Yapilmasi Gereken Kararlar

Uygulamaya gecmeden once netlestirilmesi gerekenler:

- Stok otoritesi tamamen inventory aggregate mi olacak?
- Hizmet urunlerinde stok kapali mi olacak?
- Barkod tekil mi olacak, urun mu varyant mi seviyesinde tutulacak?
- Varyant yapisi gerekecek mi?
- Maliyet hesabinda ortalama maliyet mi, son alim maliyeti mi kullanilacak?
- Harici sistemler stok yazabilecek mi, sadece okuyacak mi?

## 7. Tavsiye Edilen Uygulama Sirasi

En dusuk riskli sira:

1. Faz 1
2. Faz 2
3. Faz 3
4. Faz 4
5. Faz 5
6. Faz 6

## 8. Ilk Sprint Onerisi

Ilk sprintte alinabilecek net kapsam:

1. `Product.stock` bagimlilik haritasini cikar
2. Inventory aggregate'i tek kaynak yap
3. Urun kartina `stockTrackingEnabled`, `barcode`, `unitType`, `purchasePrice` alanlarini ekle
4. Depo CRUD ekranini ekle
5. Manuel adjustment ekranini islem tipi tabanli yeni yapinin ilk parcasi olarak ayir

Beklenen ciktı:

- Geriye donuk uyumlu ama gelecege hazir bir inventory temeli
