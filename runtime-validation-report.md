# Runtime Validation Report

**Generated:** 2026-10-15  
**Target:** `C:\Users\utente\Downloads\rush-presale\rush-presale`  
**Runtime:** Node.js 24.15.0, Windows, local PostgreSQL test schema `rush_presale_test`

## Summary

| Step | Status | Exit Code | Details |
|---|---|---:|---|
| Clean install | PASS | 0 | `npm ci`; 100 packages; 0 npm vulnerabilities; postinstall generated Prisma Client. |
| Prisma validation | PASS | 0 | Valid schema with both datasource URLs supplied. |
| Startup / health | PASS | 0 | Production build started in preview mode; `/api/health` returned 200. |
| Integration and unit tests | PASS | 0 | 23 tests passed, 0 failed, 0 skipped. |
| Build/typecheck | PASS | 0 | `npm run build` compiled and completed Next.js TypeScript checks. |
| Browser smoke / responsive | PASS | n/a | Home/product UI, labels, price, consent, noindex, 360/390px widths, reduced-motion preference. |
| External Stripe E2E | UNVERIFIED | n/a | No Stripe test credentials/webhook or Turnstile keys available; no remote payment attempted. |

**Overall:** NEEDS MANUAL PREVIEW CONFIGURATION — application build and local flows pass, but Stripe/Turnstile, email, Vercel cron, database backups and legal identity must be configured/verified before sharing a fully functional preview.

## Test evidence

- `npm test`: 23 passed, 0 failed, 0 skipped; includes checkout consent, threshold at/above 15, webhook ordering/duplication, simultaneous duplicate webhooks, concurrent cron/refund, date boundaries, admin auth, try-on consent/failure, threshold editing and exports.
- `npm run build`: exit 0; generated routes include `/api/health` and `/api/admin/settings/threshold`.
- Browser flow: `/` → `/presale`; correct RUSH title, 25€ price, sizes, conditions, required consent, PRE-SALE CTA.
- Mobile checks: document content width matched layout width at 360px and 390px; reduced-motion media preference was detected.
- Access-control probes: unauthenticated admin API and unauthorized cron returned 401.
- Preview noindex probes: home, product and admin login returned 200 with `X-Robots-Tag: noindex, nofollow, noarchive`.
- Test-only credentials were passed only as process environment overrides and directed exclusively to the loopback PostgreSQL `rush_presale_test` schema.

## Per-capability environment

- Docker: UNAVAILABLE — Docker daemon was not available; PostgreSQL service was available locally, so integration tests ran on a dedicated loopback test schema.
- Node.js: AVAILABLE — `v24.15.0`.
- Browser: AVAILABLE — integrated Chromium browser; checked rendered UI and viewport layout.
- Browser E2E framework: no repository Playwright suite found. Browser validation was a manual smoke flow; the full real Stripe payment flow remains unverified.
- External provider configuration: Turnstile and Stripe test credentials were not supplied; checkout remained fail-closed.

## Issues discovered and addressed

| Issue | Fix | Evidence |
|---|---|---|
| Concurrent identical Stripe webhook could return 500 on unique event ID conflict. | Treat only the `StripeWebhookEvent` unique conflict as successful duplicate delivery. | Concurrent duplicate webhook test passes with both responses 200 and one outbox record. |
| Admin could not configure the threshold from the dashboard. | Added protected threshold API and UI; lock after first confirmed payment. | Integration test checks update, invalid input and post-payment rejection. |
| Export omitted production status. | Added production status to CSV and Excel order sheets. | Integration test asserts both formats and size summary. |
| Admin test fixture persisted across repeated runs. | Test reset now removes its admin fixture. | Repeated full test run passes. |
