import { queryOne, query } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { isAllowedWidgetDomain } from "@/lib/widget-rendering";

const EVENT_COLUMNS = {
  view: "views",
  source_click: "review_source_clicks",
  cta_click: "review_cta_clicks",
};
export async function POST(request, { params }) {
  const { token } = await params;
  if (!token || !/^[a-zA-Z0-9_-]{12,128}$/.test(token)) return new Response(null, { status: 400 });
  if (isRateLimited(request, token, { limit: 120 })) return new Response(null, { status: 429 });

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const metric = EVENT_COLUMNS[payload?.event];
  if (!metric) return new Response(null, { status: 400 });

  const widget = await queryOne("SELECT id, allowed_domains FROM public.widgets WHERE embed_token = $1", [token]);
  if (!widget) return new Response(null, { status: 404 });
  if (!isAllowedWidgetDomain(request, widget.allowed_domains)) return new Response(null, { status: 403 });

  await query(
    `INSERT INTO public.widget_daily_metrics (widget_id, metric_date, ${metric})
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (widget_id, metric_date) DO UPDATE
       SET ${metric} = LEAST(public.widget_daily_metrics.${metric} + 1, 100000), updated_at = NOW()`,
    [widget.id],
  );
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
