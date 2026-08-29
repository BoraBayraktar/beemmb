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

## 7) Multi-Tenant ve Veri Izolasyonu Kurallari

- Beemmb, tek kod tabaninda hem kendi ic admin paneli hem de modul bazinda
  baska sirketlere satilabilen bir SaaS platformu olarak calisir. Her sirket
  bir Tenant'tir; her kullanici tam olarak bir Tenant'a aittir (coklu-tenant
  uyelik yoktur).
- Uygulama durumu (asama degil, canli mimari): Tenant / ModuleCatalog /
  TenantModuleEntitlement modelleri, src/lib/tenant-context.ts, src/lib/prisma.ts
  icindeki tenant-isolation extension'i, src/modules/platform, menude cift kontrol
  (layout.tsx -> filterMenuByPermissionsAndEntitlements) ve src/lib/cache-key.ts
  halihazirda uretimde aktiftir. Bunlar yeniden planlanacak gelecek fazlar degil,
  uzerine insa edilecek mevcut altyapidir. Role/RolePermission/UserRoleAssignment
  de tenant-scoped'dir (Faz 2 tamamlandi).
- Menude bir ogenin gorunmesi icin IKI kontrol de gecmelidir: (1) kullanicinin
  rolunde o menu ogesine ait izin VE (2) tenant'in aboneliginde o modulun
  entitlement'i acik. Ikisinden biri eksikse menu ogesi hic gorunmez.
- Her yeni is-verisi modeli tenantId alani tasimak ZORUNDADIR.
- Global @unique alan tanimlamak YASAKTIR; her unique kisit @@unique([tenantId, ...])
  seklinde tenant-composite olmalidir. Istisna: Tenant, ModuleCatalog, Permission gibi
  platform-geneli katalog modelleri.
- Tum Prisma sorgulari src/lib/prisma.ts'teki merkezi tenant-isolation extension'i
  uzerinden gecer; hicbir modul kendi PrismaClient ornegini olusturamaz.
- Yeni bir is-verisi modeli TENANT_SCOPED_MODELS listesine eklenmeden production'a
  alinamaz; bu liste kod incelemesinde zorunlu kontrol noktasidir.
- BOOTSTRAP ISTISNASI: bir model, tenant context KURULMADAN ONCE sorgulanmak
  zorundaysa (login/auth akisi -- User, SocialAccount; RBAC izin kontrolu --
  Role, RolePermission, UserRoleAssignment) TENANT_SCOPED_MODELS listesine
  BILINCLI olarak eklenmez ve src/lib/prisma.ts'te neden eklenmedigi yorumla
  belgelenir. Bu istisna SADECE gercek bootstrap (context henuz yokken calisan)
  cagrilar icindir. Ayni modelin context KURULDUKTAN SONRA calisan diger
  erisimleri (orn. admin panelinde kullanici/rol CRUD listeleme, guncelleme,
  silme) bu istisnadan YARARLANAMAZ -- bu cagrilar tenantId'yi repository
  metoduna acik parametre olarak almak ve where kosuluna kendisi eklemek
  ZORUNDADIR (bkz. identity.repository.ts / rbac.repository.ts). Bu ayrimi
  atlamak, gercek bir uretim hatasina (tenant'lar arasi kullanici/rol sizintisi)
  neden olmustur -- yeni bir bootstrap-istisnali model eklerken bu iki cagri
  turunu (context'ten once vs. sonra) ayri ayri denetle.
- Bir API route veya Server Component sayfasi, tenant-scoped bir servis/repository
  cagirmadan ONCE runWithTenantContext(...) ile context kurmak ZORUNDADIR; context
  kurulmadan yapilan cagri fail-closed olarak hata firlatir (sessizce filtresiz
  sonuc DONMEZ). Yeni bir route/page eklerken bu sarmalama unutulmamalidir --
  unutulmasi (context kurulmadan servis cagirmak) gecmiste kalici 500 hatasina
  neden olmustur.
- Redis cache key'leri src/lib/cache-key.ts icindeki buildTenantCacheKey() uzerinden
  uretilir; ham string concat ile tenant-scoped cache key yazmak YASAKTIR.
- Yeni bir satilabilir modul eklenirken admin-menu.ts'teki node'a moduleKey atanmasi ve
  ModuleCatalog'a karsilik gelen kaydin seed edilmesi ZORUNLUDUR.
- isSuperAdmin bayragi yalnizca RBAC izin kontrolunde gecerlidir (Beemmb'nin platform
  operatoru oldugunu gosterir); veri sorgusu seviyesinde hicbir modul bu bayragi
  izolasyon bypass sebebi olarak kullanamaz.
- Platform yonetimi (Tenant/ModuleCatalog/TenantModuleEntitlement CRUD) sadece
  src/modules/platform icinden, requirePlatformOperator() guard'i ile yapilir; bu
  modul asla is-verisi modeli sorgulamaz.
- Postgres Row-Level Security (RLS) gelecekteki bir sertlestirme fazidir; su anda
  hem yerel hem prod DB rolleri Postgres superuser oldugundan (RLS superuser icin
  daima bypass edilir) RLS aktif edilemez -- rol duzeyinde (Prisma Postgres
  konsolundan non-superuser rol saglanmasi) bir on kosul cozulmeden bu faz
  denenmemelidir. RLS gelene kadar uygulama-katmani izolasyonu (Prisma extension)
  tek guvenlik sinirdir.

## Uygulama Notu

- Kod incelemesi, lint ve mimari kontroller bu dosyaya gore yapilir.
- Bu dosyayla celisen bir degisiklik kabul edilmez.
