# Pazarama Faz 0-5 Tamamlama Notu

Bu dokuman, 19 Temmuz 2026 itibariyla BEEMMB icindeki Pazarama entegrasyonunun Faz 0-5 kapsamini hangi sinirlarla tamamladigimizi kayda gecirir.

## Faz 0

- Pazarama entegrasyonunun ilk canli kapsamı `siparis iceri alma -> satir esleme -> siparis olusturma` olarak sabitlendi.
- Auth modeli `OAuth2 client_credentials` olarak kurgulandi.
- Kullanilan auth adresi: `https://isortagimgiris.pazarama.com/connect/token`
- Kullanilan siparis import adresi: `https://isortagimapi.pazarama.com/order/getOrdersForApi`
- Bu karar mevcut ulasilabilen entegrasyon giris sayfasi ve kamuya acik Pazarama orneklerinden turetildi; ilk canli dogrulamada gerekirse yalnizca client katmani revize edilecek.

## Faz 1

- `IntegrationChannel` icine `PAZARAMA` eklendi.
- Prisma migration ve Prisma client uyumu tamamlandi.
- `PazaramaClient`, `PazaramaConnector` ve `pazarama-order-import.service` eklendi.
- Pazarama siparisleri mevcut `MarketplaceOrderPackage` ve `MarketplaceOrderLine` modellerine normalize edildi.
- Admin tarafinda ayri `Pazarama` entegrasyon sayfasi acildi.

## Faz 2

- Icice yazilmadan, mevcut pazaryeri review akisi tekrar kullanildi.
- Paket detay, satir esleme, satir ignore ve `createOrderFromPackage` akislari Pazarama ile hizalandi.
- Bu fazda outbound status, split ve katalog sync acilmadi.

## Faz 3

- Merkez entegrasyon ekraninda Pazarama kanal olarak gorunur hale getirildi.
- Job listesi, filtreler ve capability ozeti Pazarama kanalini taniyor.
- Sol menu ve entegrasyon alt menusu Pazarama baglantisini iceriyor.

## Faz 4

- Token alma ve order import hata kodlari ayristirildi:
  - `PAZARAMA_AUTH_FAILED`
  - `PAZARAMA_AUTH_TOKEN_MISSING`
  - `PAZARAMA_GET_ORDERS_FAILED`
- Queue, retry ve dead-letter yapisi ortak entegrasyon omurgasi uzerinden tekrar kullanildi.
- Secret degerler mevcut encryption servisi uzerinden saklaniyor.

## Faz 5

- Faz 5 burada `urun/fiyat/stok senkronuna gecmeden onceki hazirlik ve sinirlandirma` olarak tamamlandi.
- Capability set bilerek su sekilde sinirlandi:
  - `supportsOrderImport: true`
  - `supportsProductSync: false`
  - `supportsPriceSync: false`
  - `supportsStockSync: false`
  - `supportsStatusPicking: false`
  - `supportsStatusInvoiced: false`
  - `supportsPackageSplit: false`
- Bu sinir, gelistirme kurallarindaki fazli ilerleme prensibini korur.

## Faz 5 Sonrasi Backlog

Asagidaki maddeler Faz 6 ve sonrasi icin ayrildi:

- Pazarama product sync
- Pazarama price sync
- Pazarama stock sync
- Batch sonuc takibi
- Status update / shipment / invoice bildirimleri
- Marka, kategori, attribute mapping gereksinimleri
- Varsa webhook destegi

## Dogrulama

Bu kapsam icin teknik dogrulama komutlari:

```bash
npx prisma generate
npx tsc --noEmit --incremental false
```

Her iki komut da bu rollout sonunda basarili calisti.
