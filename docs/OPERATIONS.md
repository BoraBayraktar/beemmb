# Operations Runbook

## Observability Baseline

- Request tracing: each response carries `x-request-id` from middleware.
- Liveness endpoint: `GET /api/system/health`
- Readiness endpoint: `GET /api/system/ready`
- Structured logs: JSON logs are emitted via `src/lib/observability.ts`.

## Backup Policy

- Database: daily full PostgreSQL backup and hourly WAL archive snapshots.
- Retention:
  - Daily backups: 30 days
  - Weekly backups: 12 weeks
  - Monthly backups: 12 months
- Encryption: backups must be encrypted at rest and in transit.

## Restore Procedure

1. Select target backup timestamp.
2. Restore PostgreSQL to isolated recovery instance.
3. Run smoke checks:
   - `npm run verify:platform`
   - `APP_URL=<recovery-url> npm run verify:rbac`
4. Promote recovered database and update application environment.

## Disaster Recovery

- RPO target: 1 hour
- RTO target: 4 hours
- Incident flow:
  1. Declare incident and freeze deployments.
  2. Restore database from latest valid backup.
  3. Validate with platform + integration verifies.
  4. Re-enable traffic and monitor error rates.

## Security Controls

- Security headers enforced via Next.js config and middleware.
- API endpoints are no-store cached by default.
- RBAC is mandatory for admin and integration worker routes.

## Operational Verification

- Run the full operational verification chain after infrastructure changes:

```bash
APP_URL=http://localhost:3000 npm run verify:platform
APP_URL=http://localhost:3000 npm run verify:integrations
APP_URL=http://localhost:3000 npm run verify:orders
```

## Finans modulu dogrulama

Finans Faz 3 / 4C degisikliklerinden veya finans migration'larindan sonra:

1. Otomatik zincir:

```bash
npm run verify:finance:phase4c
```

2. Admin panelinde elle kontrol listesi: `docs/FINANCE_MODULE_ARCHITECTURE.md` dosyasindaki **Admin Manuel Kontrol Listesi (Faz 3 / 4C)** bolumu.

## Notification Email Live Test

Canli e-posta testi icin asagidaki degiskenlerden en az biri tanimli olmalidir:

- `RESEND_API_KEY` + `NOTIFICATION_EMAIL_FROM`
- veya `NOTIFICATION_EMAIL_WEBHOOK_URL`

Test adimlari:

1. Ortam degiskenlerini ayarlayin.
2. Canli transport zorunlu test komutunu calistirin:

```bash
npm run test:notification-email-live
```

Bu komut bir backoffice kullanicisi icin test EMAIL bildirimi uretir ve kuyrugu `requireLiveTransport=true` ile isler. Transport tanimli degilse hata ile cikar.

## Notification Worker Cron Plan

Amaç: e-posta kuyrugunu kisa araliklarla islemek ve cakisma durumunda ikinci processin cikmasini saglamak.

Kullanilacak komut:

```bash
npm run worker:notifications:cron
```

Ornek cron (her 2 dakikada bir):

```bash
*/2 * * * * cd /path/to/beemmb && npm run worker:notifications:cron >> /var/log/beemmb-notification-worker.log 2>&1
```

Onerilen araliklar:

- dusuk trafik: 5 dakika
- orta trafik: 2 dakika
- yuksek trafik: 1 dakika

## macOS Launchd Kurulumu

macOS ortaminda cron yerine launchd kullanmak daha sagliklidir. Repo icindeki hazir dosyalar:

- `scripts/run-notification-worker-launchd.sh`
- `launchd/com.beemmb.notification-worker.plist`

Kurulum adimlari:

1. Plist dosyasini LaunchAgents klasorune kopyalayin.

```bash
mkdir -p ~/Library/LaunchAgents
cp /Users/borabayraktar/Documents/GitHub/beemmb/launchd/com.beemmb.notification-worker.plist ~/Library/LaunchAgents/
```

1. Plist icindeki repo yolunun sizin ortaminizla eslestiginden emin olun.
1. Servisi yukleyin ve calistirin.

```bash
launchctl unload ~/Library/LaunchAgents/com.beemmb.notification-worker.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.beemmb.notification-worker.plist
launchctl start com.beemmb.notification-worker
```

1. Loglari kontrol edin.

```bash
tail -f ~/Library/Logs/beemmb-notification-worker.log
tail -f ~/Library/Logs/beemmb-notification-worker.error.log
```

Not: Launchd scripti repo icindeki `.env` dosyasini otomatik yukler. Bu sayede `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM` ve `NOTIFICATION_EMAIL_WEBHOOK_URL` degiskenleri servis tarafinda gorunur.
