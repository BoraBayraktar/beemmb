# BEEMMB

BEEMMB, modular monolith mimarisi ile gelistirilen cok asamali e-ticaret sistemidir.
Bu ilk implementasyon, Faz 1 kapsaminda public urun vitrinini sunar.

## Gelistirme Kurallari

Tum gelistirmelerde tek referans dosya: [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)

## Mimari Kurallar

- UI katmani Prisma veya repository katmanina dogrudan erisemez.
- API route katmani Prisma veya repository katmanina dogrudan erisemez.
- API route -> Service -> Repository -> Prisma akisi zorunludur.
- Soft delete zorunludur: `deleted`, `deletedDate`, `deletedUserId`.
- Lokalizasyon sadece `tr.json` ve `en.json` dosyalariyla yonetilir.
- Cache katmani merkezi Redis uzerinden calisir.

## Proje Yapisi

```text
src/
	app/
		[locale]/...           # Locale tabanli UI
		api/...                # HTTP adapter katmani
	modules/
		catalog/
			contracts/
			repositories/
			services/
	lib/
		prisma.ts
		redis.ts
		i18n.ts
	i18n/
		tr.json
		en.json
prisma/
	schema.prisma
	seed.ts
```

## Lokal Gelistirme

1. Ortam degiskenlerini hazirlayin.

```bash
cp .env.local.example .env.local
```

Next.js local calismada `.env.local` dosyasini kullanir. Bu repoda onerilen duzen:

- Local development: `.env.local` -> local PostgreSQL / Redis / MinIO
- Vercel production: Vercel Project Settings -> Environment Variables

Not:

- `.env.local` dosyasini production connection string ile doldurmayin.
- Vercel uzerindeki production veritabani bilgileri repodaki `.env` veya `.env.local` dosyalarinda tutulmamalidir.

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

Uygulama varsayilan olarak `http://localhost:3000/tr` adresine yonlenir.

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

## Faz 1 Ozellikleri

- ticari alanlar: `sku`, `stock`, `compareAtPrice`
- is kurali: `compareAtPrice` degeri `price` degerinden buyuk olmali
- storefront ve urun detayinda stok/indirim bilgisi goruntulenir
- sepet ve checkout akisi: `/{locale}/cart`
- commerce endpointleri:
	- `POST /api/commerce/quote`
	- `POST /api/commerce/checkout`

## Faz 3 Tamamlama Notlari (Siparis + Odeme + Fiyatlandirma)

- Siparis yasam dongusu ve audit trail:
	- durum gecmisi + odeme durumu gecmisi kalici olarak tutulur
	- admin status / payment status guncellemeleri actor bilgisiyle loglanir
- Odeme durum akisi eklendi:
	- `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`
- Promosyon/fiyatlandirma servisi eklendi (Contract -> Repository -> Service):
	- checkout/quote akisinda `promotionCode` desteklenir
	- `subtotal`, `discountTotal`, `total` hesaplanir
- Dashboard raporu genisletildi:
	- toplam siparis, toplam gelir, toplam indirim, odenen siparis, bekleyen odeme

## Faz 4 Tamamlama Notlari (Pazaryeri Entegrasyon Katmani)

- Integration modulu Contract -> Repository -> Service deseni ile eklendi.
- Connector mimarisi:
	- Trendyol ve n11 icin kanal connector siniflari
	- job type bazli dispatch islemleri (`PRODUCT_SYNC`, `PRICE_SYNC`, `STOCK_SYNC`)
- Queue + retry + idempotency:
	- `IntegrationSyncJob` tablosu ile kuyruk
	- `idempotencyKey` ile tekrar eden job deduplikasyonu
	- max attempt ve gecikmeli retry davranisi
- Dead-letter ve manuel yeniden deneme:
	- `IntegrationDeadLetter` tablosu ile kalici hata kaydi
	- admin panelde dead-letter listeleme ve `retry` aksiyonu
- Yeni admin endpointleri:
	- `GET /api/admin/integrations/jobs`
	- `POST /api/admin/integrations/jobs` (enqueue)
	- `POST /api/admin/integrations/worker` (queue process)
	- `GET /api/admin/integrations/dead-letters`
	- `POST /api/admin/integrations/dead-letters/{jobId}/retry`
- Yeni admin ekrani:
	- `/{locale}/admin/integrations`

## Faz 5 Tamamlama Notlari (Olcekleme ve Operasyonel Olgunluk)

- Gozlemlenebilirlik:
	- request-id propagation (`x-request-id`) middleware katmaninda aktif
	- sistem endpointleri: `GET /api/system/health`, `GET /api/system/ready`
	- structured JSON log yardimcilari (`src/lib/observability.ts`)
- Guvenlik kontrolleri:
	- CSP, HSTS, Permissions-Policy, nosniff ve frame koruma headerlari
	- API endpointlerinde `Cache-Control: no-store`
- Operasyonel olgunluk:
	- backup/restore + DR runbook: `docs/OPERATIONS.md`
	- release train ve domain ownership modeli: `docs/RELEASE_TRAIN.md`
	- CODEOWNERS tanimi: `.github/CODEOWNERS`

	## Faz 6 Tamamlama Notlari (Soru SLA + Bildirim)

	- `UserNotification` modeli eklendi (`IN_APP`, `EMAIL`).
	- Yeni urun sorusu acildiginda backoffice kullanicilarina bildirim fan-out edilir.
	- Admin ust panelde bildirim rozeti + dropdown listeleme eklendi.
	- Deep-link destekli soru odaklama aktif: `/admin/product-questions?questionId=...`.
	- Soru SLA esigi artik ortam degiskeni ile yonetilir: `PRODUCT_QUESTION_SLA_HOURS`.
	- E-posta kuyruk worker endpointi: `POST /api/admin/notifications/worker`.

## Faz 2 Baslangici (Auth + Rol)

- `identity` modulu Contract -> Repository -> Service yapisinda eklendi.
- API auth endpointleri service layer uzerinden calisir:
	- `POST /api/identity/login`
	- `POST /api/identity/logout`
	- `GET /api/identity/me`
- Admin urun yonetimi endpointleri:
	- `GET /api/admin/products` (ADMIN, EDITOR)
	- `POST /api/admin/products` (ADMIN, EDITOR)
	- `PATCH /api/admin/products/{id}` (ADMIN, EDITOR)
	- `DELETE /api/admin/products/{id}` (yalnizca ADMIN, soft delete)
- Admin kategori yonetimi endpointleri:
	- `GET /api/admin/categories` (ADMIN, EDITOR)
	- `POST /api/admin/categories` (ADMIN, EDITOR)
	- `PATCH /api/admin/categories/{id}` (ADMIN, EDITOR)
	- `DELETE /api/admin/categories/{id}` (yalnizca ADMIN, soft delete)
- Admin kullanici yonetimi endpointleri:
	- `GET /api/admin/users` (yalnizca ADMIN)
	- `POST /api/admin/users` (yalnizca ADMIN)
	- `PATCH /api/admin/users/{id}` (yalnizca ADMIN)
	- `DELETE /api/admin/users/{id}` (yalnizca ADMIN, soft delete)
- Admin siparis endpointleri:
	- `GET /api/admin/orders` (ADMIN, EDITOR)
	- `GET /api/admin/orders/{id}` (ADMIN, EDITOR)
	- `PATCH /api/admin/orders/{id}` (yalnizca ADMIN, durum + odeme durumu guncelleme)
	- `DELETE /api/admin/orders/{id}` (yalnizca ADMIN, soft delete)
- Commerce endpointleri:
	- `POST /api/commerce/quote`
	- `POST /api/commerce/checkout`
- Backoffice giris sayfasi: `/{locale}/admin/login`
- Backoffice dashboard: `/{locale}/admin`
- Backoffice urun yonetimi: API tabanli server-side arama, kategori filtreleme, sayfalama ve form validasyon mesajlari
- Modern UI/UX: atmosferik arka plan, premium kart sistemi, responsive glass header ve gelistirilmis tipografi

Seed sonrasi varsayilan admin hesabi:

- E-mail: `admin@beemmb.local`
- Sifre: `Admin123!`

Seed sonrasi varsayilan editor hesabi:

- E-mail: `editor@beemmb.local`
- Sifre: `Editor123!`

RBAC dogrulamasi icin:

```bash
npm run verify:rbac
```

Admin urun CRUD entegrasyon dogrulamasi icin:

```bash
npm run verify:crud
```

Admin kategori yonetimi entegrasyon dogrulamasi icin:

```bash
npm run verify:categories
```

Admin kullanici yonetimi entegrasyon dogrulamasi icin:

```bash
npm run verify:users
```

Ana sayfa storefront entegrasyon dogrulamasi icin:

```bash
npm run verify:storefront
```

Checkout entegrasyon dogrulamasi icin:

```bash
npm run verify:checkout
```

Admin siparis entegrasyon dogrulamasi icin:

```bash
npm run verify:orders
```

Pazaryeri entegrasyon katmani dogrulamasi icin:

```bash
npm run verify:integrations
```

Platform (health/readiness/security headers) dogrulamasi icin:

```bash
npm run verify:platform
```

MinIO tabanli gorsel yukleme entegrasyon dogrulamasi icin:

```bash
npm run verify:media
```
