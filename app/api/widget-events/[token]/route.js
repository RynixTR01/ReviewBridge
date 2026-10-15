import { queryOne, query } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { isAllowedWidgetDomain } from "@/lib/widget-rendering";
import { observedWidgetHost } from "@/lib/widget-installation";
import { experimentMetricForEvent } from "@/lib/widget-experiments";

const EVENT_COLUMNS = {
  view: "views",
  source_click: "review_source_clicks",
  cta_click: "review_cta_clicks",
  goal: "goal_completions",
};
export async function POST(request, { params }) {
  const { token } = await params;
  if (!token || !/^[a-zA-Z0-9_-]{12,128}$/.test(token)) return new Response(null, { status: 400 });
  if (await isRateLimited(request, `widget-events:${token}`, { limit: 120 })) return new Response(null, { status: 429 });

  let payload;
  try {
    const rawPayload = await request.text();
    if (rawPayload.length > 1024) return new Response(null, { status: 413 });
    payload = JSON.parse(rawPayload);
  } catch {
    return new Response(null, { status: 400 });
  }
  const metric = typeof payload?.event === "string" && Object.hasOwn(EVENT_COLUMNS, payload.event)
    ? EVENT_COLUMNS[payload.event] : null;
  if (!metric) return new Response(null, { status: 400 });

  const widget = await queryOne(
    `SELECT w.id, w.allowed_domains, w.experiment_enabled, w.experiment_id, w.show_review_button, u.plan AS user_plan
     FROM public.widgets w JOIN public.users u ON u.id = w.user_id WHERE w.embed_token = $1`,
    [token],
  );
  if (!widget) return new Response(null, { status: 404 });
  if (!isAllowedWidgetDomain(request, widget.allowed_domains)) return new Response(null, { status: 403 });

  const experimentMetric = experimentMetricForEvent(widget, payload);
  // A success-page snippet can outlive its experiment. Do not count stale or unassigned goals.
  if (payload.event === "goal" && !experimentMetric) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  await query(
    `INSERT INTO public.widget_daily_metrics (widget_id, metric_date, ${metric})
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (widget_id, metric_date) DO UPDATE
       SET ${metric} = LEAST(public.widget_daily_metrics.${metric} + 1, 100000), updated_at = NOW()`,
    [widget.id],
  );
  if (experimentMetric) {
    const column = experimentMetric;
    await query(
      `INSERT INTO public.widget_experiment_daily (widget_id, experiment_id, variant, metric_date, ${column})
       VALUES ($1, $2, $3, CURRENT_DATE, 1)
       ON CONFLICT (widget_id, experiment_id, variant, metric_date) DO UPDATE
       SET ${column} = LEAST(public.widget_experiment_daily.${column} + 1, 100000)`,
      [widget.id, widget.experiment_id, payload.variant],
    );
  }
  if (payload.event === "view") {
    const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app").hostname.toLowerCase();
    const siteHost = observedWidgetHost(request, payload.siteHost, appHost);
    if (siteHost) {
      await query(
        `INSERT INTO public.widget_installations (widget_id, site_host)
         SELECT $1, $2 WHERE
           (SELECT count(*) FROM public.widget_installations WHERE widget_id = $1) < 20
           OR EXISTS (SELECT 1 FROM public.widget_installations WHERE widget_id = $1 AND site_host = $2)
         ON CONFLICT (widget_id, site_host) DO UPDATE SET
           last_seen_at = now(), views = LEAST(public.widget_installations.views + 1, 1000000)`,
        [widget.id, siteHost],
      );
    }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
