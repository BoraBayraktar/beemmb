# Vercel Deployment Notes

This project can run on Vercel as a Node.js Next.js application.

## Build mode

The production build script uses `next build --webpack` from [`package.json`](/Users/borabayraktar/Documents/GitHub/beemmb/package.json:8).

This is intentional. In this repository, Turbopack production build was hanging during `Creating an optimized production build ...`, so the deploy path is pinned to Webpack for a more predictable Vercel build.

The root layout also avoids remote Google Font fetching so production builds are not coupled to external font downloads.

Database migrations are intentionally not executed inside `npm run build`. Run `npm run db:migrate` against the target database before deploying or as a separate release step. This keeps Vercel artifact builds independent from database connectivity and prevents transient Prisma schema-engine failures from blocking the build phase.

## Environment separation

Use different sources for local and production configuration:

- Local development: `.env.local`
- Production on Vercel: Vercel Project Settings -> Environment Variables

Do not treat `.env.vercel` as the production runtime source of truth. If Vercel CLI creates local env helper files, keep them local-only and do not copy production database credentials into `.env.local`.

## Required environment variables

- `DATABASE_URL`: required for Prisma and all catalog/admin/server flows.
- `AUTH_SECRET`: required for login/session signing.
- `APP_URL`: should match the production Vercel URL or your custom domain.

## Recommended environment variables

- `REDIS_URL`: enables distributed cache and allows `/api/system/ready` to report healthy Redis status.
- `REDIS_CONNECT_TIMEOUT_MS`: optional, defaults to `1000` so unreachable Redis does not stall request/build flow for too long.
- `CRON_SECRET`: secures Vercel Cron invocations. Vercel sends this as `Authorization: Bearer <value>`.
- `MARKETPLACE_SYNC_SECRET`: optional marketplace-specific cron secret. If set, marketplace system endpoints also accept it.

If `REDIS_URL` is omitted, the application can still serve requests, but cache-backed features fall back to degraded behavior and readiness checks may not report fully healthy infrastructure.

## Scheduled jobs

[`vercel.json`](/Users/borabayraktar/Documents/GitHub/beemmb/vercel.json:1) registers daily production crons:

- Path: `/api/system/integrations/trendyol-sync`
- Schedule: `0 3 * * *` (03:00 UTC)
- Scope: queues active Trendyol order imports, processes the integration queue, and follows up Trendyol stock/price batch results.

- Path: `/api/system/integrations/n11-sync`
- Schedule: `30 3 * * *` (03:30 UTC)
- Scope: queues active N11 order imports, processes the integration queue, and follows up N11 order/product/price/stock task results.

- Path: `/api/system/integrations/hepsiburada-sync`
- Schedule: `0 4 * * *` (04:00 UTC)
- Scope: queues active Hepsiburada order imports and processes the integration queue.

- Available but not yet registered in [`vercel.json`](/Users/borabayraktar/Documents/GitHub/beemmb/vercel.json:1):
- Path: `/api/system/integrations/n11-task-follow-up`
- Scope: only checks pending N11 task results for successful `PRODUCT_SYNC`, `PRICE_SYNC`, and `STOCK_SYNC` jobs.

Vercel Cron only runs on production deployments. For more frequent Trendyol syncing, update the cron expression in `vercel.json` after confirming the Vercel plan supports the desired interval.

## Optional integrations

- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MEDIA_PUBLIC_BASE_URL`

These are required only if you want product/media uploads to work in production.

### Cloudflare R2 mapping for media uploads

This repository uses an S3-compatible storage client for product image uploads, so Cloudflare R2 works without code changes.

Map your R2 settings into the existing variables like this:

- `MINIO_ENDPOINT=<your-cloudflare-account-id>.r2.cloudflarestorage.com`
- `MINIO_PORT=443`
- `MINIO_USE_SSL=true`
- `MINIO_ACCESS_KEY=<r2-access-key-id>`
- `MINIO_SECRET_KEY=<r2-secret-access-key>`
- `MINIO_BUCKET=<your-r2-bucket-name>`
- `MEDIA_PUBLIC_BASE_URL=<your-public-r2-domain>`

Notes:

- The R2 S3 API endpoint format is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- The S3 region value for R2 is `auto`, and `us-east-1` is also accepted by compatible tools. This repo does not need a separate region env var for the current MinIO client setup.
- `MEDIA_PUBLIC_BASE_URL` should be the public bucket URL or your custom public domain, for example `https://pub-<hash>.r2.dev`.
- If the bucket is not public, uploads may succeed but the returned product image URL will not be browser-accessible.

- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL_FROM`
- `NOTIFICATION_EMAIL_WEBHOOK_URL`
- `NOTIFICATION_EMAIL_WEBHOOK_SECRET`

These are required only for live notification email delivery.

## Optional social login variables

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `FACEBOOK_OAUTH_CLIENT_ID`
- `FACEBOOK_OAUTH_CLIENT_SECRET`
- `APPLE_OAUTH_CLIENT_ID`
- `APPLE_OAUTH_TEAM_ID`
- `APPLE_OAUTH_KEY_ID`
- `APPLE_OAUTH_PRIVATE_KEY`

These are required only if you want Google and Apple login to be active.

## OAuth callback URLs

Set `APP_URL` to the exact public base URL of the environment, then use these callback URLs in the provider consoles:

- Google callback: `${APP_URL}/api/identity/oauth/google/callback`
- Facebook callback: `${APP_URL}/api/identity/oauth/facebook/callback`
- Apple callback: `${APP_URL}/api/identity/oauth/apple/callback`

Common local values when `APP_URL=http://localhost:3000`:

- Google callback: `http://localhost:3000/api/identity/oauth/google/callback`
- Facebook callback: `http://localhost:3000/api/identity/oauth/facebook/callback`
- Apple callback: `http://localhost:3000/api/identity/oauth/apple/callback`

Common production pattern:

- Google callback: `https://your-domain.com/api/identity/oauth/google/callback`
- Facebook callback: `https://your-domain.com/api/identity/oauth/facebook/callback`
- Apple callback: `https://your-domain.com/api/identity/oauth/apple/callback`

## Runtime behavior

- The localized app tree is forced to `nodejs` runtime in [`src/app/[locale]/layout.tsx`](/Users/borabayraktar/Documents/GitHub/beemmb/src/app/[locale]/layout.tsx:1).
- The same layout is marked `force-dynamic` so Vercel does not try to pre-render data-backed routes at build time.

This is important because storefront, admin, auth, Prisma, Redis, and media flows are request-time concerns in this app.

## Health endpoints

- `/api/system/health`: lightweight liveness check.
- `/api/system/ready`: database + Redis readiness check.

For Vercel smoke testing, use `/api/system/health` first. Use `/api/system/ready` only after production environment variables are configured.
