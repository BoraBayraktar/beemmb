# Release Train and Ownership

## Release Cadence

- Branching model:
  - `main` is always releasable.
  - Short-lived feature branches are merged through reviewed pull requests.
- Release train:
  - Weekly scheduled release window.
  - Emergency patch lane for production incidents.

## Phase 5 Quality Gates

A change is release-ready only if all gates pass:

1. `npm run lint`
2. `npm run build`
3. `APP_URL=http://localhost:3000 npm run verify:platform`
4. `APP_URL=http://localhost:3000 npm run verify:integrations`
5. Existing regression suite (`verify:*` scripts)
6. Finans regression suite: CI’da `verify:finance:phase4c` (app ayaktayken; rapor route wiring dahil) ve seed sonrası `verify:finance:counterparty` (DB lookup). Yerelde tam zincir: `npm run verify:finance` — movement reference, satır/belge eşleştirme, audit wiring, belge hareket önizlemesi, alacak projeksiyonu, envanter–borç özeti, Faz 3/4C smoke, finans raporları ve cari arama.
7. E-belge regression suite (`npm run verify:edocument`; UBL builder, resmi doğrulama adapter, evidence package, provider registry, connector ve dispatch service guard kontrolleri)

CI enforcement:

- Workflow: `.github/workflows/phase5-quality-gates.yml`
- Aggregate local command: `npm run verify:phase5`

## Domain Ownership

- Catalog: `src/modules/catalog/**`
- Commerce + Pricing: `src/modules/commerce/**`, `src/modules/pricing/**`
- Integration: `src/modules/integration/**`
- E-belge: `src/modules/edocument/**`, `src/modules/documents/**` e-belge dispatch/evidence yüzeyleri
- Identity: `src/modules/identity/**`
- Storefront: `src/modules/storefront/**`
- Platform: `src/lib/**`, `middleware.ts`, `next.config.ts`

## Escalation Path

1. Domain owner triages issue.
2. Platform owner joins when infra/security impact exists.
3. Incident commander approves patch release when needed.
