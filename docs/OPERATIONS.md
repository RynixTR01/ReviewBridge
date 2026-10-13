# ReviewBridge Production Operations

This checklist reflects the current application code. It contains variable names only; never commit secret values.

## Vercel production variables

Set these for the Production environment and redeploy after changing them:

- `DATABASE_URL` — Neon production connection string.
- `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` — Neon Auth configuration.
- `APIFY_API_TOKEN` and `APIFY_WEBHOOK_SECRET` — review collection and signed Apify callbacks.
- `CRON_SECRET` — protects the daily maintenance and opt-in automatic-sync job.
- `NEXT_PUBLIC_APP_URL` — canonical production URL used in callbacks and email links. `VERCEL_URL` is a fallback for the automatic-sync dispatcher.
- `LEMONSQUEEZY_WEBHOOK_SECRET` — required; the webhook rejects requests when it is absent.
- `LEMONSQUEEZY_PRO_VARIANT_ID` and `LEMONSQUEEZY_AGENCY_VARIANT_ID` — exact IDs from the Lemon Squeezy variants. When either ID is configured, unknown variants are rejected instead of being inferred from a product name.
- `NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL` and `NEXT_PUBLIC_LEMONSQUEEZY_AGENCY_URL` — checkout links shown in the dashboard.
- `RESEND_API_KEY` — optional welcome email delivery.

## Release verification

1. Review the GitHub Actions checks and Vercel preview before merging.
2. Confirm production migrations are present: webhook event ledger, stable review IDs, welcome-email guard, widget controls/preferences, daily widget metrics, source auto-sync preference, Lemon subscription guard, widget allowed domains, and widget style/sync retry fields.
3. In the live dashboard, test sign-in, one manual Google/Trustpilot sync, widget preview, embed rendering, domain allowlist behavior, and account deletion on a disposable test account.
4. Enable automatic sync per source only when the Apify account is configured and its usage is understood. The Vercel cron runs daily; scheduled sync is opt-in and limited by the plan cooldown.
5. Confirm widget metrics move after an embed view and CTA click. They contain daily aggregate counts only and are deleted after 90 days.
6. Review provider data-access terms and privacy/terms wording with a qualified human before enabling additional platforms or describing legal compliance.
7. Configure an external uptime monitor to request `/api/health`; it returns only `{ "status": "ok" }` when Neon is reachable and HTTP 503 otherwise. This endpoint does not send alerts itself.

## Current release constraints

- Vercel Cron runs only on Production deployments. Preview deployments do not run the schedule.
- Scheduled refresh is daily because the project currently has one daily cron invocation; manual sync remains available subject to plan cooldowns.
- Failed provider runs, timeouts, and processing errors receive at most three scheduled retries with increasing delays (15 minutes, 1 hour, then 6 hours). The daily Vercel Cron cadence means actual retry dispatch can be later than those minimum delays. Configuration errors and invalid source URLs still need correction.
- ReviewBridge has a database-backed `/api/health` check. An external monitor must be configured in Vercel/monitoring separately to deliver uptime alerts.
- The lightweight rate limiter is per serverless process. It helps with bursts but is not a distributed DDoS defense.
- Daily widget counts are approximate public-embed metrics and should not be treated as billing or unique-visitor analytics.
- Adding source platforms, A/B experiments, or team workspaces requires separate provider/legal, traffic, and access-control decisions.
