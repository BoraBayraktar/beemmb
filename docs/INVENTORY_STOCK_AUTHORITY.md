# Inventory Stock Authority

Bu doküman, BEEMMB stok yönetiminde resmi stok otoritesini ve geçiş kurallarını tanımlar.

## Karar

Tek stok doğrusu `InventoryItem` + `InventoryLevel` aggregate yapısıdır.

- Depo bazlı gerçek stok durumu `InventoryLevel.onHand` ve `InventoryLevel.reserved` üzerinden hesaplanır.
- Kullanılabilir stok hesabı: `max(0, onHand - reserved)`
- Ürün seviyesindeki `Product.stock` alanı artık birincil stok alanı değildir.

## `Product.stock` Rolü

`Product.stock` alanı bundan sonra sadece `legacy summary` alanıdır.

Anlamı:

- Aktif depolardaki aggregate kullanılabilir stok toplamının özet kopyasıdır.
- Raporlama veya kullanıcı arayüzü bu alanı birincil veri kaynağı olarak kullanmamalıdır.
- Yeni stok yazma akışları `Product.stock` üstünden doğrudan işlem yapamaz.

İzin verilen kullanım:

- Geriye dönük uyumluluk
- Geçiş dönemi gözlemi
- Aggregate olmayan eski yüzeyler için fallback
- Aggregate henüz oluşmamış storefront/katalog özetleri için kontrollü okuma

İzin verilmeyen kullanım:

- Sipariş öncesi stok doğrulaması
- Admin stok kararları
- Depo bazlı operasyonlar
- Rezervasyon ve commit akışları
- Yeni UI veya servis mantığında `Product.stock` değerini doğrudan “stok var/yok otoritesi” gibi yorumlamak

## Okuma Kuralları

Bir modül stok okuyacaksa:

1. Önce inventory aggregate üzerinden okur.
2. `Product.stock` sadece aggregate henüz oluşmamış ürünlerde fallback olarak düşünülebilir.
3. Fallback kullanımı geçici kabul edilir ve azaltılmalıdır.

## Yazma Kuralları

Stok yazan tüm akışlar inventory aggregate üzerinden geçmelidir:

- manuel stok düzeltme
- stok giriş
- stok çıkış
- transfer
- sayım uygulama
- rezervasyon hold / release
- order commit

`Product.stock` doğrudan yazılmaz.

İstisna:

- aggregate güncellendikten sonra summary senkronizasyonu için servis/repository içinde türetilmiş olarak güncellenebilir

## Senkronizasyon Kuralı

Aggregate güncellendiğinde:

1. ilgili `InventoryLevel` kayıtları yazılır
2. gerekiyorsa `InventoryMovement` ve `InventoryTransaction` üretilir
3. aktif depo seviyelerinden aggregate kullanılabilir stok tekrar hesaplanır
4. sonuç `Product.stock` alanına summary olarak yazılır

Bu nedenle `Product.stock` bir kaynak değil, sonuç alanıdır.

## Geçiş Dönemi Kuralları

- Commerce ve admin akışları aggregate tabanlı kalmalıdır.
- Yeni endpoint veya servislerde `Product.stock` referansı eklenmemelidir.
- Legacy kullanım tespit edilirse inventory servisine taşınmalıdır.
- Fallback gerekiyorsa kod içinde açıkça `legacy summary fallback` niyetiyle isimlendirilmelidir.
- Harici sistemlerden gelen stok yazımları sadece `InventoryIntegrationMapping` üzerinden eşlenmiş ve açıkça izin verilmiş kayıtlarla uygulanmalıdır.
- Harici stok eventleri `ExternalStockEvent` olarak idempotent biçimde kaydedilmeden aggregate üstünde işlenmemelidir.

## Sprint 1 Uygulama Matrisi

- Commerce sipariş uygunluğu: inventory aggregate otoritesi, `Product.stock` yalnızca aggregate bootstrap fallback
- Katalog/storefront listeleme: inventory aggregate otoritesi, aggregate yoksa legacy summary fallback
- Admin ürün listesi: inventory aggregate otoritesi, aggregate yoksa legacy summary fallback
- Inventory availability contract: inventory aggregate otoritesi, aggregate yoksa legacy summary fallback
- Inventory yazma akışları: doğrudan aggregate yazımı, summary senkronizasyonu türetilmiş sonuç

## Eşzamanlılık Kuralları

Sayım uygulama sırasında aşağıdaki korumalar zorunludur:

- Sayım satırındaki `systemOnHand` ile güncel `InventoryLevel.onHand` aynı değilse uygulama reddedilir.
- İlgili depo seviyesinde aktif rezervasyon etkisi varsa uygulama reddedilir.
- Kritik stok yazma akışları serializable transaction ve tekrar deneme korumasıyla çalıştırılmalıdır.
- Kullanıcı sayımı yeniden gözden geçirip güncel duruma göre tekrar uygulamalıdır.

Amaç:

- sipariş / rezervasyon / sayım yarışında sessiz veri bozulmasını önlemek

## Sprint 1 Sonucu

Sprint 1 itibarıyla resmi kural şudur:

`Inventory aggregate = tek stok doğrusu`

`Product.stock = legacy summary`
