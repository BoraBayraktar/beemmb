# BEEMMB

BEEMMB, Turkiye pazarina ozgu gereksinimlere (GIB e-belge/UBL-TR, on muhasebe, yerli pazaryerleri) odaklanmis, modular monolith mimarisiyle gelistirilen kurumsal e-ticaret / ERP-lite platformudur.

Sistem su ana omurgalari kapsar: katalog + depo bazli envanter yonetimi, siparis/checkout, musteri cari + kasa/banka/mutabakat/cek-senet finans modulu, GIB uyumlu e-belge (UBL-TR) uretim ve dispatch zinciri, coklu pazaryeri (Trendyol, Hepsiburada, N11, Pazarama) senkronizasyon katmani, ince taneli rol/izin (RBAC v2) yonetimi ve append-only audit kanit zinciri.

## Gelistirme Kurallari

Tum gelistirmelerde tek referans dosya: [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)

## Mimari Kurallar

- UI katmani Prisma veya repository katmanina dogrudan erisemez.
- API route katmani Prisma veya repository katmanina dogrudan erisemez.
- API route -> Service -> Repository -> Prisma akisi zorunludur.
- Her modul Contract -> Repository -> Service uclusuyle tasarlanir; moduller birbiriyle yalnizca service katmani uzerinden konusur.
- Soft delete zorunludur: `deleted`, `deletedDate`, `deletedUserId`.
- Lokalizasyon sadece `src/i18n/tr.json` uzerinden yonetilir; proje bilincli olarak tek dile (Turkce) indirgenmistir.
- Cache katmani merkezi Redis uzerinden calisir (read-agirlikli endpointlerde TTL + yazimda invalidation).
- shadcn/ui + Tailwind CSS kullanilir; ekranlar "ozet -> detay -> teknik detay" katmanlamasiyla tasarlanir.

> **Not:** Bu repo standart bir Next.js kurulumu degildir. Next.js 16 surumunde API'ler, konvansiyonlar ve dosya yapisi egitim verisinden farkli olabilir; kod yazmadan once `node_modules/next/dist/docs/` altindaki ilgili rehberi okuyun.

## Proje Yapisi

```text
src/
  app/
    [locale]/...              # Locale tabanli UI (storefront + admin panel)
    api/...                   # HTTP adapter katmani (yalnizca parse + response mapping)
  modules/
    identity/                 # Auth, oturum, RBAC v2 (rol/izin) yonetimi
    catalog/                  # Urun/kategori/marka katalogu, CSV import/export
    inventory/                # Depo bazli stok: hareket, rezervasyon, sayim, transfer
    commerce/                 # Sepet/checkout/quote, pazaryeri siparis donusumu
    customers/                # Musteri cari hesap
    pricing/                  # Promosyon/fiyatlandirma
    storefront/                # Vitrin/anasayfa bolumleri
    documents/                 # E-belge yasam dongusu, dispatch, webhook, evidence
    edocument/                  # GIB UBL-TR fatura/irsaliye uretimi ve validasyonu
    finance/                    # Cari, kasa/banka, tahsilat/odeme, mutabakat, defter
    integration/                # Trendyol/Hepsiburada/N11/Pazarama connector + sync
    system/                     # Audit log/anchor, medya depolama, bildirim
    <modul>/
      contracts/
      repositories/
      services/
  lib/
    prisma.ts
    redis.ts
    auth.ts
    i18n.ts
    observability.ts          # Yapilandirilmis JSON log + request-id
  i18n/
    tr.json                   # Tek lokalizasyon kaynagi
prisma/
  schema.prisma
  seed.ts
docs/                          # Finans/envanter/GIB/operasyon planlama dokumanlari
scripts/                       # verify-*.mjs|.ts dogrulama betikleri (test stratejisi)
```

## Lokal Gelistirme

1. Ortam degiskenlerini hazirlayin.

`.env.local` dosyasi olusturun (repoda ornek `.env` dosyasi bulunmaz, asagidaki degiskenleri ihtiyaca gore doldurun):

- Local development: `.env.local` -> local PostgreSQL / Redis / MinIO
- Vercel production: Vercel Project Settings -> Environment Variables

Not:

- `.env.local` dosyasini production connection string ile doldurmayin.
- Vercel uzerindeki production veritabani bilgileri repodaki `.env` veya `.env.local` dosyalarinda tutulmamalidir.

Temel degiskenler:

- `DATABASE_URL` — PostgreSQL baglanti dizesi (Prisma datasource)
- `REDIS_URL`, `REDIS_CONNECT_TIMEOUT_MS` — merkezi cache
- `AUTH_SECRET` — oturum/JWT imzalama ve entegrasyon secret turetimi icin ortak sir
- `APP_URL` (yoksa `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` fallback) — OAuth callback taban URL'i
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MEDIA_PUBLIC_BASE_URL` — medya depolama

Sosyal girisleri aktif etmek isterseniz su alanlari da doldurun:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `FACEBOOK_OAUTH_CLIENT_ID`
- `FACEBOOK_OAUTH_CLIENT_SECRET`
- `APPLE_OAUTH_CLIENT_ID`
- `APPLE_OAUTH_TEAM_ID`
- `APPLE_OAUTH_KEY_ID`
- `APPLE_OAUTH_PRIVATE_KEY`

Callback URL'leri:

- Google: `http://localhost:3000/api/identity/oauth/google/callback`
- Facebook: `http://localhost:3000/api/identity/oauth/facebook/callback`
- Apple: `http://localhost:3000/api/identity/oauth/apple/callback`

2. Altyapi servislerini kaldirin.

```bash
docker compose up -d
```

`docker-compose.yml` uc servis ayaga kaldirir: `postgres` (5432), `redis` (6379), `minio` (9000/9001) + `minio-init` (bucket'i otomatik olusturur).

3. Veritabani istemcisini olusturun ve seeding yapin.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Not: Migration tablosu olmayan eski lokal ortamlarda gecis asamasinda bir kez `npm run db:push` calistirilabilir.

Shadow database zinciri bozuk eski ortamlarda yeni migration eklemek icin manual workflow kullanin:

```bash
npm run db:migrate:manual -- add_financial_accounts_cash_transactions
```

Bu komut:

- mevcut veritabani ile `prisma/schema.prisma` arasindaki SQL diff'i uretir
- migration SQL'ini `prisma/migrations/` altina yazar
- SQL'i veritabanina uygular
- migration kaydini `_prisma_migrations` tablosunda applied olarak isaretler
- Prisma client'i yeniden uretir

4. Uygulamayi baslatin.

```bash
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000/tr` adresine yonlenir (route yapisi `[locale]` dinamik segmentini korur, ancak middleware pratikte yalnizca `tr` locale'ini zorunlu kilar).

MinIO lokal ortamda su adreslerde calisir:

- API: `http://localhost:9000`
- Console: `http://localhost:9001`

Varsayilan kimlik bilgileri:

- Username: `minioadmin`
- Password: `minioadmin`

Admin urun yonetimi ekranindaki gorsel yukleme akisi MinIO bucket'ina (`beemmb-media`) dosya yukler ve urune otomatik URL atar.

## Notification ve SLA Ortam Degiskenleri

- `PRODUCT_QUESTION_SLA_HOURS`: Urun soru moderasyonundaki SLA asim esigi, saat cinsinden (varsayilan: `24`).
- `NOTIFICATION_EMAIL_FROM`: Bildirim e-posta gonderici adresi.
- `RESEND_API_KEY`: Resend ile e-posta gonderimi icin API anahtari.
- `NOTIFICATION_EMAIL_WEBHOOK_URL`: Alternatif e-posta gateway webhook adresi.
- `NOTIFICATION_EMAIL_WEBHOOK_SECRET`: Webhook header'i icin opsiyonel secret (`x-webhook-secret`).

Bildirim e-posta kuyruğunu manuel calistirmak icin:

```bash
npm run worker:notifications -- 20
```

Canli e-posta transport testi icin:

```bash
npm run test:notification-email-live
```

Cron-safe worker tetigi icin:

```bash
npm run worker:notifications:cron
```

## E-Belge (GIB) Ortam Degiskenleri

- `EDOCUMENT_SENDER_TAX_NUMBER`, `EDOCUMENT_SENDER_NAME`, `EDOCUMENT_SENDER_TAX_OFFICE`, `EDOCUMENT_SENDER_EMAIL`, `EDOCUMENT_SENDER_ADDRESS` — gonderici (kendi isletme) e-belge kimlik bilgileri.
- `EDOCUMENT_INVOICE_NUMBER_PREFIX`, `EDOCUMENT_DEFAULT_VAT_RATE` — belge numaralandirma ve varsayilan KDV orani.
- `EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER`, `EDOCUMENT_SHIPMENT_CARRIER_NAME`, `EDOCUMENT_SHIPMENT_VEHICLE_PLATE`, `EDOCUMENT_SHIPMENT_DRIVER_NAME`, `EDOCUMENT_SHIPMENT_DRIVER_TCKN` — e-Irsaliye tasiyici/arac/surucu alanlari.
- `EDOCUMENT_PROVIDER_MODE` — `mock` veya canli saglayici modu.
- `EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL`, `EDOCUMENT_LIVE_PROVIDER_USERNAME`, `EDOCUMENT_LIVE_PROVIDER_SECRET_KEY`, `EDOCUMENT_LIVE_PROVIDER_PROTOCOL`, `EDOCUMENT_LIVE_PROVIDER_TIMEOUT_MS` — canli e-belge saglayici baglanti bilgileri.
- `EDOCUMENT_XSD_VALIDATOR_COMMAND`/`_ARGS`, `EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND`/`_ARGS` — resmi UBL-TR XSD/Schematron dogrulama araclari (`src/modules/edocument/schemas/gib/`).
- `DOCUMENT_PROVIDER_SECRET` — belge saglayici webhook/entegrasyon sir dogrulamasi (yoksa `AUTH_SECRET` fallback).

## Pazaryeri Entegrasyon Ortam Degiskenleri

- `MARKETPLACE_INTEGRATION_SECRET` — pazaryeri credential sifreleme sirri (yoksa `DOCUMENT_PROVIDER_SECRET` / `AUTH_SECRET` fallback zinciri).
- `MARKETPLACE_SYNC_SECRET`, `CRON_SECRET` — worker/cron tetikleme endpointlerinin sistem-to-sistem yetkilendirmesi.

## Finans Ortam Degiskenleri

- `FINANCE_BANK_SANDBOX_STATEMENT_JSON` — banka sandbox ekstre simulasyonu icin ornek veri.
- `FINANCE_ONLINE_COLLECTION_WEBHOOK_SECRET` — online tahsilat webhook dogrulamasi.
- `FINANCE_INTEGRATION_ACTOR_USER_ID` — otomatik finans hareketlerinde actor olarak kullanilacak sistem kullanicisi.

## Audit / WORM Ortam Degiskenleri

- `AUDIT_WORM_ENDPOINT`, `AUDIT_WORM_PORT`, `AUDIT_WORM_USE_SSL`, `AUDIT_WORM_ACCESS_KEY`, `AUDIT_WORM_SECRET_KEY`, `AUDIT_WORM_BUCKET`, `AUDIT_WORM_PUBLIC_BASE_URL` — audit kanit paketleri icin ayri (veya MinIO ile paylasilan) WORM depolama; tanimlanmazsa `MINIO_*` degiskenlerine duser.
- `AUDIT_EVIDENCE_LOCAL_DIR` — yerel gelistirmede kanit paketlerinin diske yazilacagi dizin.

## Ana Modul Ozeti

- **Katalog + Envanter**: Urun/kategori/marka/varyant katalogu, depo bazli stok seviyeleri, stok hareketi/rezervasyon/sayim/transfer, kritik stok uyarilari, disaridan gelen stok olaylarinin (external stock events) islenmesi. Detay kurallar: [docs/INVENTORY_STOCK_AUTHORITY.md](docs/INVENTORY_STOCK_AUTHORITY.md), [docs/INVENTORY_COSTING_POLICY.md](docs/INVENTORY_COSTING_POLICY.md), [docs/INVENTORY_CONCURRENCY_RULES.md](docs/INVENTORY_CONCURRENCY_RULES.md).
- **Siparis + Checkout**: Sepet/quote/checkout akisi, siparis durum + odeme durumu gecmisi (audit trail), promosyon/fiyatlandirma servisi.
- **Finans**: Musteri cari hesap, kasa/banka islemleri, banka ekstresi import + otomatik mutabakat, cek/senet portfoyu, yevmiye defteri + mizan, gelir-gider/KDV/nakit-akis raporlari, mali musavir (Logo/Luca) CSV export. Paraşüt referans alinarak fazlanmis yol haritasi: [docs/FINANCE_PARASUT_ALIGNMENT_PLAN.md](docs/FINANCE_PARASUT_ALIGNMENT_PLAN.md), [docs/FINANCE_PARASUT_GAP_MATRIX.md](docs/FINANCE_PARASUT_GAP_MATRIX.md), mimari: [docs/FINANCE_MODULE_ARCHITECTURE.md](docs/FINANCE_MODULE_ARCHITECTURE.md).
- **E-Belge (GIB)**: UBL-TR 1.2.1 uyumlu fatura/irsaliye uretimi, resmi XSD/Schematron dogrulama, dispatch + webhook + yasam dongusu takibi, mock/canli saglayici adaptorleri. Audit kanit zinciri runbook'u: [docs/GIB_AUDIT_HARDENING_RUNBOOK.md](docs/GIB_AUDIT_HARDENING_RUNBOOK.md).
- **Pazaryeri Entegrasyonlari**: Trendyol, Hepsiburada, N11, Pazarama icin ayri connector + client siniflari; urun/fiyat/stok senkronizasyonu, siparis paketi ice aktarma, job kuyrugu (`IntegrationSyncJob`) + idempotency + dead-letter + manuel retry. Pazarama faz notlari: [docs/PAZARAMA_PHASE_0_5.md](docs/PAZARAMA_PHASE_0_5.md).
  - Not: Kargo (Yurtici/Aras/MNG/PTT/UPS vb.) firmalarina dogrudan API entegrasyonu yoktur; kargo firma adi ve takip numarasi yalnizca pazaryeri siparis paketlerinden okunur/gosterilir, Pazarama'ya "kargoya verildi" bildirimi manuel girisle geri gonderilir.
- **RBAC v2 (Rol/Izin Yonetimi)**: `Role` / `Permission` / `RolePermission` / `UserRoleAssignment` modelleriyle ince taneli yetkilendirme; admin panelin tum menu/route erisimleri bu sisteme bagli.
- **Audit**: Append-only `AuditLog` + donemsel hash sabitleme (`AuditAnchor`), WORM depolamaya kanit paketi yazimi.

## Admin Panel Alanlari

`/{locale}/admin` altinda: dashboard, urunler, kategoriler, markalar, tedarikciler, urun ozellikleri, envanter, siparisler, musteriler + cari hesaplar, finans, belgeler (documents/edocuments), pazaryeri entegrasyonlari, roller, kullanicilar, depolar, vitrin (storefront) yonetimi, urun sorulari, audit loglari, bildirimler, dosya yuklemeleri. Ayri giris sayfasi: `/{locale}/admin/login`.

Seed sonrasi varsayilan admin hesabi:

- E-mail: `admin@beemmb.local`
- Sifre: `Admin123!`

Seed sonrasi varsayilan editor hesabi:

- E-mail: `editor@beemmb.local`
- Sifre: `Editor123!`

## Dogrulama (Test Stratejisi)

Bu projede klasik birim test dosyasi (`*.test.ts`) yerine `scripts/` altinda canli-uygulama smoke/entegrasyon dogrulama betikleri (`verify-*.mjs` / `.ts`) kullanilir. Her yeni ozellik/faz icin ayri bir verify betigi eklenir; betikler uygulamayi calisir halde bulup gercek HTTP endpointlerine istek atar veya DB'ye dogrudan baglanir.

Kategoriler ve ornek komutlar:

```bash
# Platform / auth / RBAC
npm run verify:platform
npm run verify:auth
npm run verify:rbac
npm run verify:rbac:v2

# Katalog / kullanici / siparis / storefront
npm run verify:crud
npm run verify:categories
npm run verify:users
npm run verify:storefront
npm run verify:checkout
npm run verify:orders

# Envanter (sprint/hafta bazli, sprint1..sprint12 + week1..week3)
npm run verify:inventory:sprint12

# Pazaryeri entegrasyonlari
npm run verify:integrations

# Finans (alt betiklerin tumunu zincirler)
npm run verify:finance

# E-belge / GIB (tum alt betikleri zincirler)
npm run verify:edocument

# Medya yukleme, audit
npm run verify:media
npm run verify:audit:coverage
npm run verify:audit:integrity
```

Tum Faz 5 kalite kapisini yerelde tek komutla calistirmak icin:

```bash
npm run verify:phase5
```

Bu zincir CI'da `.github/workflows/phase5-quality-gates.yml` tarafindan PR/push (main) uzerinde Postgres 16 + Redis 7 servis konteynerleriyle otomatik calistirilir (migrate/seed -> lint -> build -> uygulamayi baslat -> verify zinciri). Ayrica soru-cevap akisina ozel dar kapsamli `.github/workflows/verify-questions-phase4.yml` bulunur.

## Planlama Dokumanlari (`docs/`)

- [docs/FINANCE_MODULE_ARCHITECTURE.md](docs/FINANCE_MODULE_ARCHITECTURE.md), [docs/FINANCE_PARASUT_ALIGNMENT_PLAN.md](docs/FINANCE_PARASUT_ALIGNMENT_PLAN.md), [docs/FINANCE_PARASUT_GAP_MATRIX.md](docs/FINANCE_PARASUT_GAP_MATRIX.md) — finans modulunun Paraşüt referansli faz (PF1-PF10) yol haritasi ve boşluk matrisi.
- [docs/PARASUT_INVENTORY_REVISION_PLAN.md](docs/PARASUT_INVENTORY_REVISION_PLAN.md), [docs/PARASUT_PHASE1_GAP_ANALYSIS.md](docs/PARASUT_PHASE1_GAP_ANALYSIS.md) — envanter tarafinin Paraşüt'e yaklastirma plani.
- [docs/INVENTORY_STOCK_AUTHORITY.md](docs/INVENTORY_STOCK_AUTHORITY.md), [docs/INVENTORY_COSTING_POLICY.md](docs/INVENTORY_COSTING_POLICY.md), [docs/INVENTORY_CONCURRENCY_RULES.md](docs/INVENTORY_CONCURRENCY_RULES.md), [docs/INVENTORY_EXTERNAL_STOCK_FLOW.md](docs/INVENTORY_EXTERNAL_STOCK_FLOW.md), [docs/INVENTORY_EXTERNAL_EVENT_RUNBOOK.md](docs/INVENTORY_EXTERNAL_EVENT_RUNBOOK.md), [docs/INVENTORY_LEGACY_STOCK_AUDIT.md](docs/INVENTORY_LEGACY_STOCK_AUDIT.md) — envanter is kurallari ve runbook'lari.
- [docs/GIB_AUDIT_HARDENING_RUNBOOK.md](docs/GIB_AUDIT_HARDENING_RUNBOOK.md) — audit kanit zinciri uretim/saklama/denetime ibraz sureci.
- [docs/PAZARAMA_PHASE_0_5.md](docs/PAZARAMA_PHASE_0_5.md) — Pazarama entegrasyonu faz kaydi.
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — gozlemlenebilirlik, yedekleme politikasi, felaket kurtarma.
- [docs/RELEASE_TRAIN.md](docs/RELEASE_TRAIN.md) — release penceresi, kalite kapilari, domain ownership.
- [docs/OQLID_STYLE_RECIPE.md](docs/OQLID_STYLE_RECIPE.md) — UI/tasarim stil rehberi.

## Gozlemlenebilirlik ve Guvenlik

- Request-id propagation (`x-request-id`) middleware katmaninda aktif; yapilandirilmis JSON log yardimcilari: `src/lib/observability.ts`.
- Sistem endpointleri: `GET /api/system/health`, `GET /api/system/ready`.
- Guvenlik headerlari: CSP, HSTS, Permissions-Policy, nosniff, frame koruma; API endpointlerinde `Cache-Control: no-store`.
- Backup/restore + DR runbook: [docs/OPERATIONS.md](docs/OPERATIONS.md). Release train ve domain ownership: [docs/RELEASE_TRAIN.md](docs/RELEASE_TRAIN.md), [.github/CODEOWNERS](.github/CODEOWNERS).
