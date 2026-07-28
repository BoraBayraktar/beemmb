# BEEMMB Development Rules

Bu dosya BEEMMB gelistirme standardi icin tek kaynak (single source of truth) olarak kullanilir.
Tum yeni gelistirmeler ve refactor islemleri bu kurallara uygun yapilmalidir.

## 1) Modular Monolith ve Katman Sinirlari

- UI katmani Prisma veya repository katmanina dogrudan erisemez.
- Her modul Contract -> Repository -> Service akisiyla tasarlanir.
- Moduller birbiriyle yalnizca service katmani uzerinden haberlesir.
- API adapter veya UI katmaninda is kurali yazma; is kurali service katmaninda olur.

## 2) i18n Kurallari

- Lokalizasyon altyapisi i18n uzerinden yonetilir.
- Key kaynaklari sadece tek dosyadir:
  - src/i18n/tr.json
- i18n alt yapısını koru.
- Sadece Türkçe dil kullan. 

## 3) Responsive UI Kurallari

- Tum ekranlar mobile-first yaklasimla gelistirilir.
- UI tam mobil uyumlu ve responsive olmalidir.
- Kritik sayfalar (liste, detay, form) mobil/tablet/desktop viewportlarinda kontrol edilmelidir.

## 4) API ve Service Layer Zorunlulugu

- Tum API route'lari service layer uzerinden calisir.
- API route katmani Prisma veya DB'ye dogrudan erisemez.
- API route, yalnizca request parsing + response mapping gorevi gorur.

## 5) Redis Merkezi Cache

- Cache katmani merkezi Redis (distributed cache) ile kurulur.
- Read agirlikli endpointlerde TTL bazli cache stratejisi uygulanir.
- Yazma operasyonlarinda ilgili key invalidation kurallari tanimlanir.

## 6) Genel UI / UX Prensipleri

- shadgn/ui kütüphanesini kullan.
- Radius Tailwind CSS kullan.
- Bu kurallar yalnizca tek bir modul icin degil, tum yonetim paneli ve tum uygun uygulama yuzeyleri icin gecerlidir.
- Varsayilan ekran her zaman sade, hizli anlasilir ve aksiyon odakli olmalidir.
- Kullanici ilk bakista sadece temel isi yapabilmelidir; ileri detaylar varsayilan acik gelmemelidir.
- Her karmasik ekran `ozet -> detay -> teknik detay` katman mantigiyla tasarlanmalidir.
- Ana aksiyonlar her zaman gorunur olmali; ikincil veya teknik bilgiler acilabilir alanlar icinde sunulmalidir.
- Belge, log, maliyet, entegrasyon, projection, mapping ve benzeri derin bilgiler ancak ihtiyac halinde gosterilmelidir.
- Varsayilan gorunumde kullanici teknik terimlerle bogulmamali; once is dili, sonra sistem detayi gelmelidir.
- Liste ekranlari sade filtrelerle acilmali; gelismis filtreler acilabilir panel veya ikinci katman icinde sunulmalidir.
- Uzun formlar tek parca ve yorucu olmamali; bolumler, step akislari, drawer yapisi veya sekmeler ile yonetilmelidir.
- Ayni bilgi ayni yogunlukta birden fazla yerde tekrar edilmemelidir.
- Bos durumlar yalnizca “veri yok” dememeli; kullaniciyi bir sonraki dogru aksiyona yonlendirmelidir.
- Mobilde sadece responsive daraltma degil, onceliklendirilmis bilgi siralamasi uygulanmalidir.
- Yeni bir UI alani eklenirken once su soru sorulmalidir:
  - Bu bilgi ilk bakista gercekten gerekli mi?
  - Degilse varsayilan yuzey yerine detay katmanina alinmalidir.
- Modul tasariminda “kucuk isletme / buyuk isletme” gibi kullaniciya acik etiketlemeler yapilmaz; sade deneyim varsayilan olur, derinlik ihtiyac halinde acilir.

## Uygulama Notu

- Kod incelemesi, lint ve mimari kontroller bu dosyaya gore yapilir.
- Bu dosyayla celisen bir degisiklik kabul edilmez.
