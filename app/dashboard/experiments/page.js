import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { buildWidgetConversionSnippet } from "@/lib/widget-conversion-snippet";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "A/B deneyleri", "A/B experiments")} — ReviewBridge` };
}

export default async function ExperimentsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const widgets = await query(
    `SELECT w.id, w.embed_token, w.widget_title, w.experiment_enabled, w.experiment_id,
            CASE WHEN w.user_id = $1 THEN 'owner' ELSE m.role END AS access_role,
            w.experiment_label_tr, w.experiment_label_en, s.business_name
     FROM public.widgets w
     JOIN public.sources s ON s.id = w.source_id AND s.user_id = w.user_id
     JOIN public.users owner_profile ON owner_profile.id = w.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
     WHERE w.user_id = $1 OR (owner_profile.plan = 'agency' AND m.user_id = $1)
     ORDER BY s.business_name, w.created_at DESC`,
    [user.id],
  );
  const metrics = widgets.length ? await query(
    `SELECT widget_id, experiment_id, variant,
            sum(views)::int AS views, sum(cta_clicks)::int AS cta_clicks,
            sum(goal_completions)::int AS goal_completions
     FROM public.widget_experiment_daily
     WHERE widget_id = ANY($1::uuid[]) AND metric_date >= CURRENT_DATE - INTERVAL '29 days'
     GROUP BY widget_id, experiment_id, variant`,
    [widgets.map((widget) => widget.id)],
  ) : [];
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">{t(locale, "A/B düğme deneyleri", "A/B button experiments")}</h1><p className="mt-1 text-sm text-muted">{t(locale, "Son 30 günün anonim, yaklaşık görüntülenme ve tıklamaları. Düşük trafikte oran farkı güvenilir sonuç değildir.", "Approximate anonymous views and clicks for the last 30 days. A rate difference with low traffic is not reliable evidence.")}</p></div>
    {widgets.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz widget yok.", "No widgets yet.")}</p>}
    {widgets.map((widget) => {
      const current = metrics.filter((metric) => metric.widget_id === widget.id && metric.experiment_id === widget.experiment_id);
      return <section key={widget.id} className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold text-foreground">{widget.widget_title || widget.business_name}</h2><p className="text-xs text-muted">{widget.business_name} · {widget.experiment_enabled ? t(locale, "Deney açık", "Experiment on") : t(locale, "Deney kapalı", "Experiment off")}</p></div><Link href={["owner", "editor"].includes(widget.access_role) ? `/dashboard/widget/${widget.id}` : `/preview/${widget.embed_token}`} className="text-sm text-primary underline">{["owner", "editor"].includes(widget.access_role) ? t(locale, "Ayarlar", "Settings") : t(locale, "Önizle", "Preview")}</Link></div>
        {widget.experiment_enabled && <div className="mt-4 grid gap-3 sm:grid-cols-2">{["A", "B"].map((variant) => {
          const row = current.find((item) => item.variant === variant);
          const views = Number(row?.views) || 0;
          const clicks = Number(row?.cta_clicks) || 0;
          const goals = Number(row?.goal_completions) || 0;
          return <div key={variant} className="rounded-lg bg-muted-bg p-3"><strong className="text-sm text-foreground">{variant === "A" ? t(locale, "A · Normal metin", "A · Standard label") : `${variant} · ${locale === "tr" ? widget.experiment_label_tr : widget.experiment_label_en}`}</strong><p className="mt-1 text-xs text-muted">{views} {t(locale, "görüntülenme", "views")} · {clicks} {t(locale, "tıklama", "clicks")} · {views ? ((clicks / views) * 100).toFixed(1) : "0.0"}% CTR · {goals} {t(locale, "hedef", "goals")}</p></div>;
        })}</div>}
      </section>;
    })}
    <section className="rounded-xl border border-border bg-white p-4 text-sm text-muted">
      <h2 className="font-semibold text-foreground">{t(locale, "Hedef dönüşümünü ölç", "Measure a conversion goal")}</h2>
      <p className="mt-1">{t(locale, "Dönüşüm tamamlandığında teşekkür/başarı sayfasına bu kodu ekleyin. Daha önce widget'ı aynı tarayıcıda gören ziyaretçinin varyantı sayılır; kimlik veya sipariş bilgisi gönderilmez. Tarayıcı depolamayı engelliyorsa dönüşüm varyanta bağlanmaz.", "Add this code to the thank-you or success page after a conversion. It attributes the goal only when the same browser previously saw the widget; no identity or order details are sent. If browser storage is blocked, the conversion is not attributed to a variant.")}</p>
      {widgets.filter((widget) => widget.experiment_enabled).map((widget) => <pre key={widget.id} className="mt-3 overflow-x-auto rounded-lg bg-muted-bg p-3 text-xs"><strong className="mb-1 block text-foreground">{widget.widget_title || widget.business_name}</strong><code>{buildWidgetConversionSnippet({ token: widget.embed_token, widgetId: widget.id, experimentId: widget.experiment_id, appUrl: process.env.NEXT_PUBLIC_APP_URL })}</code></pre>)}
      {widgets.filter((widget) => widget.experiment_enabled).length === 0 && <p className="mt-2 text-xs">{t(locale, "Önce bir widget'ta A/B deneyini etkinleştirin.", "Enable an A/B experiment on a widget first.")}</p>}
    </section>
  </div>;
}
