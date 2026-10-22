import { getNeonClient, query } from "@/lib/db";
import { runMonitoredMaintenance } from "@/lib/maintenance-health";
import { finishSyncHistory } from "@/lib/sync-history";
import { scheduleSyncRetry } from "@/lib/sync-retry";
import { deliverSyncFailureAlerts } from "@/lib/sync-alerts";
import { deliverDueSurveyInvitations } from "@/lib/survey-invitations";
import { EXPIRE_BILLING_SQL } from "@/lib/billing-state";

export const maxDuration = 60;

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runMonitoredMaintenance(getNeonClient(), 'cleanup-stale-syncs', () => runCleanup(request));
}

async function runCleanup(request) {
  const deadline = Date.now() + 50_000;
  try {
    // We only allow GET requests. In Vercel, cron jobs hit the endpoint via GET.
    // Ensure we are authorized. Vercel cron jobs send a secure header.
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await query(EXPIRE_BILLING_SQL, [null]);

    // Calculate the threshold time: 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Find sources stuck in 'pending' for more than 15 minutes and mark as error
    const data = await query(
      `UPDATE public.sources
       SET sync_status = 'error', last_sync_error = 'Sync timed out. Please try again.',
           apify_run_id = NULL, sync_started_at = NULL
       WHERE sync_status = 'pending'
         AND sync_started_at IS NOT NULL
         AND sync_started_at < $1
       RETURNING id`,
      [fifteenMinutesAgo]
    );

    await Promise.all((data || []).map(async ({ id }) => {
      await scheduleSyncRetry(query, id, "Eşitleme zaman aşımına uğradı.");
      await finishSyncHistory({ sourceId: id, status: "error", errorMessage: "Eşitleme zaman aşımına uğradı." });
    }));

    await query("DELETE FROM public.widget_daily_metrics WHERE metric_date < CURRENT_DATE - INTERVAL '90 days'");
    await query("DELETE FROM public.widget_experiment_daily WHERE metric_date < CURRENT_DATE - INTERVAL '90 days'");
    await query("DELETE FROM public.request_rate_limits WHERE expires_at < NOW()");
    await query("DELETE FROM public.customer_survey_daily_limits WHERE response_day < CURRENT_DATE - INTERVAL '2 days'");
    await query("DELETE FROM public.customer_survey_responses WHERE created_at < NOW() - INTERVAL '365 days'");
    await query("DELETE FROM public.user_notifications WHERE created_at < NOW() - INTERVAL '180 days'");
    await query(
      `UPDATE public.survey_invitations
       SET status = 'failed', attempt_count = LEAST(attempt_count + 1, 3),
           claimed_at = NULL, last_error_code = 'delivery_unknown'
       WHERE status = 'pending' AND claimed_at < NOW() - INTERVAL '30 minutes'`,
    );
    await query(
      `UPDATE public.survey_invitations invitation
       SET status = 'cancelled', recipient_email = NULL, unsubscribe_token = NULL,
           claimed_at = NULL, last_error_code = 'expired'
       FROM public.survey_invitation_campaigns campaign
       WHERE campaign.id = invitation.campaign_id
         AND invitation.status IN ('pending', 'failed')
         AND campaign.scheduled_at < NOW() - INTERVAL '90 days'`,
    );
    await query(
      `UPDATE public.survey_invitation_campaigns
       SET status = 'cancelled'
       WHERE status = 'scheduled' AND scheduled_at < NOW() - INTERVAL '90 days'`,
    );
    await query(
      `DELETE FROM public.survey_invitation_campaigns
       WHERE status IN ('sent', 'partial', 'cancelled') AND created_at < NOW() - INTERVAL '180 days'`,
    );
    await query(
      `DELETE FROM public.agency_brand_invitations
       WHERE (accepted_at IS NOT NULL AND accepted_at < NOW() - INTERVAL '180 days')
          OR (expires_at < NOW() - INTERVAL '30 days' AND accepted_at IS NULL)`,
    );

    const surveyInvitations = deadline - Date.now() > 15_000
      ? await deliverDueSurveyInvitations({ limit: 20, maxDurationMs: 15_000 })
      : { sent: 0, failed: 0, deferred: true };

    let autoSyncStarted = 0;
    let autoSyncFailed = 0;
    let autoSyncDeferred = 0;
    if (process.env.APIFY_API_TOKEN) {
      const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
      const baseUrl = base ? new URL(base) : null;
      if (baseUrl && ["https:", "http:"].includes(baseUrl.protocol)) {
        const dueSources = await query(
          `WITH ranked_sources AS (
             SELECT s.id, s.platform, s.sync_status, s.sync_retry_after,
                    s.sync_retry_count, s.auto_sync_enabled, s.last_synced_at,
                    u.plan,
                    row_number() OVER (
                      PARTITION BY s.user_id
                      ORDER BY s.created_at ASC, s.id ASC
                    )::int AS source_position
             FROM public.sources s
             JOIN public.users u ON u.id = s.user_id
           )
           SELECT id
           FROM ranked_sources
           WHERE platform IN ('google', 'trustpilot')
             AND source_position <= CASE plan WHEN 'agency' THEN 2147483647
                                                WHEN 'pro' THEN 5 ELSE 1 END
             AND sync_status IS DISTINCT FROM 'pending'
             AND (
               (sync_retry_after IS NOT NULL AND sync_retry_after <= NOW()
                 AND sync_retry_count < 3)
               OR (auto_sync_enabled = true AND sync_status IS DISTINCT FROM 'error'
                 AND (last_synced_at IS NULL OR last_synced_at < NOW() -
                   CASE plan WHEN 'agency' THEN INTERVAL '30 minutes'
                               WHEN 'pro' THEN INTERVAL '2 hours'
                               ELSE INTERVAL '24 hours' END))
             )
           ORDER BY sync_retry_after ASC NULLS LAST, last_synced_at ASC NULLS FIRST
           LIMIT 25`,
        );

        for (let index = 0; index < (dueSources || []).length; index += 5) {
          if (deadline - Date.now() < 5_000) {
            autoSyncDeferred = dueSources.length - index;
            break;
          }
          const batch = dueSources.slice(index, index + 5);
          const results = await Promise.allSettled(batch.map(({ id }) =>
            fetch(new URL(`/api/sync/${encodeURIComponent(id)}`, baseUrl), {
              method: "POST",
              headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
              signal: AbortSignal.timeout(Math.min(15_000, Math.max(1_000, deadline - Date.now()))),
              cache: "no-store",
            }),
          ));
          for (const result of results) {
            if (result.status === "fulfilled" && result.value.ok) autoSyncStarted += 1;
            else autoSyncFailed += 1;
          }
        }
      }
    }

    if (autoSyncFailed > 0) {
      console.error("Scheduled sync dispatch had failures.", { autoSyncStarted, autoSyncFailed });
    }

    const alerts = await deliverSyncFailureAlerts({ maxDurationMs: Math.max(0, deadline - Date.now()) });

    return Response.json({ 
      success: autoSyncFailed === 0 && autoSyncDeferred === 0,
      message: `Cleaned up ${data.length} stale syncs.`,
      autoSyncStarted,
      autoSyncFailed,
      autoSyncDeferred,
      surveyInvitations,
      alerts,
    }, { status: autoSyncFailed || autoSyncDeferred ? 503 : 200 });

  } catch (err) {
    console.error("Scheduled cleanup failed.", { name: err?.name });
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
