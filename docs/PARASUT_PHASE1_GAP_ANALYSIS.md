# Paraşüt Hizalama Faz 1 Çıktısı

Bu doküman, BEEMMB stok yönetiminin Paraşüt stok modülüne hizalanması için Faz 1 analiz ve boşluk matrisi çıktısıdır.

## Amaç

Faz 1'in amacı, uygulamadaki mevcut stok yönetimi omurgasını analiz etmek, Paraşüt benzeri hedef yapıya göre eksikleri görünür hale getirmek ve sonraki fazlar için uygulanabilir backlog çıkarmaktır.

## Analiz Kapsamı

İncelenen alanlar:

- domain modeli
- servis ve repository akışları
- admin stok ekranları
- işlem formları
- sayım ve depo yönetimi
- raporlama
- audit ve izlenebilirlik

İncelenen temel dosyalar:

- `docs/PARASUT_INVENTORY_REVISION_PLAN.md`
- `src/modules/inventory/contracts/inventory.contract.ts`
- `src/modules/inventory/services/inventory.service.ts`
- `src/modules/inventory/repositories/inventory.repository.ts`
- `src/ui/admin/inventory-manager.tsx`
- `src/app/[locale]/admin/(panel)/inventory/page.tsx`
- `src/app/[locale]/admin/(panel)/inventory/transactions/page.tsx`
- `src/app/[locale]/admin/(panel)/inventory/counts/page.tsx`
- `src/app/[locale]/admin/(panel)/inventory/warehouses/page.tsx`

## Mevcut Durum Özeti

Bugün elde olan yapı:

- depo bazlı inventory omurgası aktif durumda
- stok görünümü `InventoryManager` altında alt sayfalara ayrılmış durumda
- stok listesi, hareketler, sayımlar ve depolar ayrı route'larda sunuluyor
- drawer tabanlı işlem formları mevcut
- stok giriş, stok çıkış, transfer ve manuel düzeltme akışları var
- stok sayımı, sayım satırı güncelleme ve uygulama akışları var
- kritik stok ve uyarı paneli var
- raporlama katmanında değerleme, devir, yavaş hareket eden ürünler ve ABC analizi var
- entegrasyon paneli ve işlem özeti var

## Paraşüt'e Yakınlık Değerlendirmesi

Genel yakınlık seviyesi:

- çekirdek stok modeli: yüksek
- operasyon ekranları: orta-yüksek
- ürün stok kartı deneyimi: orta
- hareket ve belge izlenebilirliği: orta
- sayım süreci olgunluğu: orta-yüksek
- ticari karar destek katmanı: orta
- muhasebe/alış bağlantısı: düşük-orta

## Boşluk Matrisi

### 1. Inventory çekirdeği

Mevcut:

- depo bazlı stok toplamı hesaplanıyor
- stok kullanılabilirlik mantığı servis katmanında toplanmış
- kritik stok ve fark raporları üretilebiliyor

Eksik:

- `Product.stock` alanının sadece legacy summary alanı olarak kurumsal biçimde sınırlandırıldığı açık bir kural seti yok
- tüm modüllerde "tek stok doğrusu" mimari olarak belge seviyesinde netleştirilmiş değil
- stok otoritesi geçiş kuralları operasyon dokümanı olarak repoda yok

Durum:

- `docs/INVENTORY_STOCK_AUTHORITY.md` ile resmileştirildi, uygulama guard'ları ile desteklenmeye devam edilmeli

### 2. Ürün stok kartı

Mevcut:

- ürün drawer içinde barkod, birim tipi, ürün tipi, satış fiyatı, alış fiyatı, depo dağılımı ve son hareketler gösteriliyor
- tercih edilen satış deposu bilgisi mevcut

Eksik:

- Paraşüt'e benzer ayrı "ürün kartı / stok kartı / ticari kart" ayrımı daha da net değil
- tedarik ve maliyet odaklı alanlar karar ekranı gibi gruplanmış değil
- ürün kartında hareket geçmişi ve belge ilişkisi daha kompakt hale getirilmeli

Durum:

- Faz 3 için ana iyileştirme alanı

### 3. İşlem bazlı hareket yönetimi

Mevcut:

- stok giriş
- stok çıkış
- transfer
- manuel düzeltme
- hareket özeti
- kaynak belge alanları

Eksik:

- belge tipi, belge numarası ve işlem nedeni daha görünür bir UX ile sunulmuyor
- hareketlerin operasyon dili Paraşüt kadar yalın değil
- işlem ekranında daha güçlü görev odaklı filtre ve belge ilişkisi gerekiyor

Durum:

- Faz 4 için ana odak

### 4. Stok sayımı

Mevcut:

- sayım oluşturma
- satır güncelleme
- toplu satır güncelleme
- sayım uygulama
- varyans mantığı

Eksik:

- sayım önizleme ve fark özeti daha kurumsal bir iş akışına dönüştürülmeli
- uygulama öncesi onay ekranı ve sonuç özeti daha güçlü olmalı
- sayım akışı Paraşüt'teki kadar operasyon merkezli hissettirmiyor

Durum:

- Faz 5 için güçlü aday

### 5. Raporlama

Mevcut:

- düşük stok
- depo performansı
- hareket özeti
- trend
- tutarlılık
- hızlı dönen ürünler
- yavaş hareket eden stoklar
- ABC dağılımı
- devir hızı

Eksik:

- raporların karar aksiyonları ile bağı daha da güçlendirilmeli
- bazı raporlar hâlâ yönetici kartı değil, veri listesi hissi veriyor
- stok değerleme çıktısı muhasebe bağlamında daha resmî hale getirilmeli

Durum:

- Faz 6 kapsamında derinleştirilmeli

### 6. Toplu işlemler

Mevcut:

- toplu stok güncelleme
- toplu tercih edilen depo atama
- toplu sayım satırı güncelleme

Eksik:

- CSV deneyimi ve satır bazlı geri bildirim daha kullanıcı dostu olabilir
- içe/dışa aktarma akışları Paraşüt seviyesinde kurumsal değil
- örnek şablon ve işlem geçmişi eksik

Durum:

- Faz 7 konusu

### 7. UX ve navigasyon

Mevcut:

- alt sayfalara bölünmüş yapı
- sticky üst navigasyon
- drawer tabanlı formlar
- yönetici özeti ve analiz modu
- toplu işlemleri varsayılan kapalı gösteren sadeleştirme

Eksik:

- bazı yoğun alanlarda hâlâ fazla bilgi tek anda gösteriliyor
- ürün ve hareket kartlarında görev odaklı yoğunluk azaltma devam etmeli
- kompakt görünüm, kolon kontrolü ve görünürlük tercihleri yok

Durum:

- Faz 8 iyileştirme alanı

## Riskler

### Mimari riskler

- `Product.stock` ile aggregate stok arasında geçiş dönemi tutarsızlığı
- legacy alan kullanan modüllerin yeni stok otoritesinden sapması

### Operasyon riskleri

- sayım uygulanırken eşzamanlı sipariş veya rezervasyon etkileri
- hareket kayıtlarının belge bağlamı zayıf kalırsa audit değeri düşmesi

### UX riskleri

- aynı ekranda çok fazla operasyon olması
- teknik detayların normal kullanıcı görünümünü kirletmesi

## Hızlı Kazanımlar

Kısa sürede yüksek etki üretecek işler:

1. ürün drawer içinde stok kartı bölümlendirmesini güçlendirmek
2. hareket kayıtlarında belge ve neden bilgisini öne almak
3. sayım uygulama öncesi fark özeti eklemek
4. rapor kartlarını aksiyon bazlı hale getirmek
5. teknik detayları geliştirici görünümüne taşımaya devam etmek

## Önceliklendirilmiş Faz Sonrası Backlog

### Kritik

- stok otoritesi kurallarını netleştirme
- ürün stok kartını Paraşüt mantığına daha yakın bölümlendirme
- hareket ve belge izlenebilirliğini güçlendirme

### Önemli

- sayım akışında önizleme ve sonuç özetini derinleştirme
- raporları karar ekranına dönüştürme
- toplu işlem UX'ini sadeleştirme

### İyi olur

- kompakt görünüm
- görünür kolon yönetimi
- gelişmiş dışa aktarma ve şablon desteği

## Faz 1 Sonucu

Faz 1 tamamlandı.

Sonuç:

- mevcut yapının Paraşüt'e yaklaşan güçlü alanları netleştirildi
- eksik operasyon ve UX başlıkları faz bazlı ayrıştırıldı
- Faz 2 ve sonrası için uygulanabilir iş listesi ortaya çıkarıldı

## Faz 2'ye Giriş Kriterleri

Faz 2'ye geçmeden önce aşağıdaki kararlar net olmalı:

- `Product.stock` alanının rolü tam olarak ne olacak
- stok kartında hangi alanlar "temel ürün", hangileri "stok", hangileri "ticari" bölümünde yer alacak
- belge bağlamı için ek veri alanı mı kullanılacak yoksa ayrı transaction üst modeli mi daha fazla genişletilecek

## Faz 2 Başlangıç Önerisi

İlk uygulanacak geliştirme sırası:

1. stok otoritesi ve legacy alan sınırlarını belgelemek
2. ürün stok kartı bölümlerini sadeleştirmek
3. belge ilişkisini hareket detaylarında görünür hale getirmek
