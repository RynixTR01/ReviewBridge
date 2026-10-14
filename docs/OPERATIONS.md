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
- During the current test phase, use Lemon Squeezy **test-mode** checkout links, test variant IDs, and the matching test webhook signing secret together. A test checkout link alone does not switch webhook verification to test mode. Keep live values separate, and only replace the test configuration when the business is ready to accept real payments.
- `RESEND_API_KEY` — optional welcome email delivery, sync failure alerts, and source-limit notices.
- `RESEND_FROM_EMAIL` — verified sender address for opt-in sync failure and source-limit alerts. If unset, emails are skipped; dashboard states remain available.
- Source-limit email notices are opt-in in Settings and sent at most once per account every 30 days. They require the same verified Resend sender configuration.

## Verified production state

- On 13 October 2026, `CRON_SECRET` was added as a Vercel **Production** secret. On 14 October, Vercel confirmed the Cron feature is enabled for `/api/cron/cleanup-stale-syncs` with schedule `0 0 * * *` (00:00 UTC). The Hobby plan allows a one-hour flexible window. The log view showed no invocation in its last-30-minute range; longer retention requires Observability Plus, so the first scheduled run is not yet verified. Do not manually trigger it in production: opted-in sources can start billable Apify runs.
- On 14 October, Vercel showed `LEMONSQUEEZY_PRO_VARIANT_ID`, `LEMONSQUEEZY_AGENCY_VARIANT_ID`, and `LEMONSQUEEZY_WEBHOOK_SECRET` in the **Production** environment. The variant IDs came from the Lemon Squeezy test catalog and the webhook secret was just updated. No end-to-end test checkout/webhook has been run. The existing `NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL` and `NEXT_PUBLIC_LEMONSQUEEZY_AGENCY_URL` entries are scoped to all environments and date from 18 April; their test/live mode was not verified, so confirm they match the test variants before testing upgrades. No live payment has been verified.
- PR #17 passed GitHub Actions unit tests, lint, build, and Playwright E2E. Its production deployment reached **Ready** on 14 October 2026 and Vercel assigned `review-bridge.vercel.app` to it. The browser health endpoint could not be independently reopened during this check, so this confirms Vercel deployment status and domain assignment, not a fresh database query.
- PR #19 and PR #20 passed GitHub Actions and Vercel preview checks. PR #19 moved Apify credentials to the recommended bearer header; PR #20 switched to Apify's canonical actor endpoint and added callback-flow tests. The PR #20 production deployment reached **Ready** on 14 October 2026. These mocked tests verify request and callback handling, not a live Apify-to-Neon production sync.
- PR #21 added mocked Lemon Squeezy webhook flow coverage for missing/invalid signatures, exact variant mapping, duplicate delivery, and stale/cancellation events. Its GitHub Actions and Vercel preview passed; the production deployment for commit `7f325d7` reached **Ready** on 14 October 2026. No real purchase or webhook replay was performed.
- PR #22 added the Pro/Agency floating review banner. GitHub Actions and the Vercel preview passed; its Neon migration was tested on a temporary branch derived from production and applied to production before merge. The production deployment for commit `317eb42` reached **Ready** on 14 October 2026.
- PR #28 added score-based NPS/CSAT follow-up prompts, optional source-limit email notices, and the first uptime-history view. Its full GitHub CI including Playwright passed; migration `20261014_11_usage_limit_emails.sql` was tested on an isolated Neon branch and then applied to production. The production deployment reached **Ready** on 14 October 2026; `/api/health` returned `{"status":"ok"}` and `/status` showed Neon reachable with the first successful health sample. The status history was later expanded to a seven-day hourly view.
- PR #30 prevents email-alert opt-ins until Resend is configured. It passed GitHub CI and Vercel preview; production commit `d790dc8` reached **Ready** on 14 October 2026. `/api/health` returned `{"status":"ok"}` and `/status` showed Neon reachable.
- PR #31 released the in-app notification center; PR #32 added a private CSV export of the signed-in user's retained history. Both passed unit tests, lint, build, and Playwright CI; both Vercel production deployments reached **Ready** on 14 October 2026. The export route returned `401 Unauthorized` without a session; the latest live `/api/health` returned `{"status":"ok"}`.
- PR #35 expanded public uptime history to seven days, and PR #36 added Vercel BotID Basic verification to public feedback and surveys. Unit tests, lint, build, and Playwright passed; PR #36 production deployment for commit `c568b89` reached **Ready** on 14 October 2026. A fresh browser check returned `{"status":"ok"}`, and `/status` showed Neon reachable with the seven-day hourly view.
- Migration `20261014_12_user_notifications.sql` was tested on an isolated branch and applied to production on 14 October 2026. The app release adds localized in-app notices for terminal sync failures, source limits, feedback, and survey responses, with per-user deduplication and 180-day cleanup.
- On 14 October 2026, Vercel's environment-variable list did not contain `RESEND_API_KEY` or `RESEND_FROM_EMAIL`. The Settings page therefore keeps new email-alert opt-ins disabled until both are configured; after setup, verify the sender in Resend and test delivery with a disposable account.
- The Apify token was rotated by the account owner on 14 October 2026 and entered as a Vercel Secret. The token value was not shared in chat. Verify the currently active Apify token in the dashboard before future rotations.
- The Apify account page checked on 13 October showed $0.02 of $5.00 included usage; its two latest Google Maps actor runs each cost $0.01 and succeeded. This account-level view does not prove that a ReviewBridge production sync delivered its webhook successfully.

## Release verification

1. Review the GitHub Actions checks and Vercel preview before merging.
2. Confirm production migrations `20261014_01_widget_floating_layout.sql` through `20261014_12_user_notifications.sql` are present. These were tested on isolated Neon branches and applied in the releases that introduced them. Do not replay already-applied migrations: `scripts/apply-production-migrations.mjs` applies only migrations 11 and 12 and is pinned to the production branch hostname; it requires `NEON_TARGET_BRANCH=production`. The preview runner explicitly rejects that hostname.
3. In the live dashboard, test sign-in, widget preview, embed rendering, domain allowlist behavior, and account deletion on a disposable test account. Run a manual Google/Trustpilot sync only after the provider access gate in step 6 is satisfied for that source.
4. Enable automatic sync per source only after the provider access gate is satisfied, the Apify account is configured, and its usage is understood. The Vercel cron runs daily; scheduled sync is opt-in and limited by the plan cooldown.
5. Confirm widget metrics move after an embed view and CTA click. They contain daily aggregate counts only and are deleted after 90 days.
6. Complete the [provider access gate](COMPETITIVE_GAP_ROADMAP.md#sağlayıcı-erişimi-ve-veri-kullanımı-için-karar-kapısı) before adding a connector or claiming compliance: record each provider's written permission or API agreement, eligible businesses, permitted storage/display, refresh/deletion deadlines, attribution/branding, and privacy wording; have the account owner and qualified counsel review the actual Apify-to-Neon-to-widget flow. Do not treat an Apify actor or public review page as a license. Google Business Profile and Places APIs, and Trustpilot Data Solutions, each have separate access and content rules; switching endpoints alone does not close this gate.
7. Configure an external uptime monitor to request `/api/health`; it returns only `{ "status": "ok" }` when Neon is reachable and HTTP 503 otherwise. This endpoint does not send alerts itself.
8. For direct feedback, submit a disposable response and check pending → approved → unpublished. Do not publish test customer data. For agency access, verify one brand's viewer cannot edit and an editor cannot see another brand. For A/B experiments, compare only after meaningful traffic and confirm event counts on both variants.
9. For opt-in email alerts, set `RESEND_FROM_EMAIL` to a verified sending address. Test sync failure alerts and source-limit notices with a disposable account in a non-production environment. Historical sync failures are marked as handled by the migration and do not trigger a backlog of email.

## Current release constraints

- Vercel Cron runs only on Production deployments. Preview deployments do not run the schedule.
- Scheduled refresh is daily because the project currently has one daily cron invocation; manual sync remains available subject to plan cooldowns.
- Failed provider runs, timeouts, and processing errors receive at most three scheduled retries with increasing delays (15 minutes, 1 hour, then 6 hours). The daily Vercel Cron cadence means actual retry dispatch can be later than those minimum delays. Configuration errors and invalid source URLs still need correction.
- ReviewBridge has a database-backed `/api/health` check. An external monitor must be configured in Vercel/monitoring separately to deliver uptime alerts.
- GitHub Actions checks production every 15 minutes and a second 30-minute workflow opens/resolves a GitHub issue on outages. GitHub notification settings control whether issue/failed-run alerts reach the account owner. This provides an alert path, but it is not an independent third-party uptime provider; the public status history covers the last 7 days and is not an SLA archive.
- Public endpoint limits use shared Neon counters with HMACed client identity; public feedback and survey forms reject filled honeypots and use Vercel BotID Basic verification. The BotID check is limited to those browser form submissions; payment, Apify webhook, and cron routes are not challenged. Vercel Bot Protection is also enabled in Log mode: it records matching requests without challenging or blocking them. If Neon is temporarily unavailable, the app falls back to per-instance memory. A managed challenge and distributed DDoS defense are not enabled by this configuration.
- Daily widget counts are approximate public-embed metrics and should not be treated as billing or unique-visitor analytics.
- New external source platforms still require a documented provider license and content lifecycle design. The first-party feedback form is a separate, consent-based source and does not grant rights to display Google/Trustpilot content.
- A/B events and installation hosts are approximate observations, not verified users or proof of domain ownership. The public `/status` page shows the current health check and the last 7 days of scheduled GitHub checks in an hourly view; it is not a historical uptime SLA.
- Lemon Squeezy remains in test mode; live checkout and sale-related work is intentionally deferred.

