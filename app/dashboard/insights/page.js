import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import AiReviewSummary from "./AiReviewSummary";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Yorum eğilimleri", "Review insights")} — ReviewBridge` };
}

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const sources = await query(
    `SELECT s.id, s.business_name, s.platform, b.name AS brand_name
     FROM public.sources s
     JOIN public.users owner_profile ON owner_profile.id = s.user_id
     LEFT JOIN public.agency_brands b ON b.id = s.brand_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
     WHERE s.user_id = $1 OR (owner_profile.plan = 'agency' AND m.user_id = $1)
     ORDER BY s.business_name`,
    [user.id],
  );
  const ids = sources.map((source) => source.id);
  const stats = ids.length ? await query(
    `SELECT source_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE body IS NOT NULL AND length(trim(body)) > 0 AND reviewed_at >= now() - interval '365 days')::int AS written_count,
       round(avg(rating)::numeric, 1) AS average,
       count(*) FILTER (WHERE rating <= 2)::int AS low_count,
       count(*) FILTER (WHERE rating = 1)::int AS stars_1,
       count(*) FILTER (WHERE rating = 2)::int AS stars_2,
       count(*) FILTER (WHERE rating = 3)::int AS stars_3,
       count(*) FILTER (WHERE rating = 4)::int AS stars_4,
       count(*) FILTER (WHERE rating = 5)::int AS stars_5,
       count(*) FILTER (WHERE reviewed_at >= now() - interval '30 days')::int AS recent_count,
       round(avg(rating) FILTER (WHERE reviewed_at >= now() - interval '30 days')::numeric, 1) AS recent_average,
       count(*) FILTER (WHERE reviewed_at >= now() - interval '60 days' AND reviewed_at < now() - interval '30 days')::int AS prior_count,
       round(avg(rating) FILTER (WHERE reviewed_at >= now() - interval '60 days' AND reviewed_at < now() - interval '30 days')::numeric, 1) AS prior_average
     FROM public.reviews WHERE source_id = ANY($1::uuid[]) AND rating BETWEEN 1 AND 5
     GROUP BY source_id`,
    [ids],
  ) : [];
  const lowReviews = ids.length ? await query(
    `SELECT source_id, rating, body, reviewed_at FROM (
       SELECT source_id, rating, body, reviewed_at,
              row_number() OVER (PARTITION BY source_id ORDER BY reviewed_at DESC) AS position
       FROM public.reviews
       WHERE source_id = ANY($1::uuid[]) AND rating <= 2 AND body IS NOT NULL
     ) recent WHERE position <= 3 ORDER BY reviewed_at DESC`,
    [ids],
  ) : [];
  const statsBySource = new Map(stats.map((item) => [item.source_id, item]));
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">{t(locale, "Yorum eğilimleri", "Review insights")}</h1><p className="mt-1 text-sm text-muted">{t(locale, "Puan dağılımını ve son 30 günün önceki 30 günle karşılaştırmasını inceleyin. Az yorumlu dönemler güvenilir bir eğilim göstermez. İsterseniz her kaynak için ayrıca yapay zekâ özeti oluşturabilirsiniz.", "Explore rating distribution and compare the last 30 days with the prior 30. Low-volume periods do not establish a reliable trend. You can also generate an AI summary for each source.")}</p></div>
    {sources.length === 0 && <p className="text-sm text-muted">{t(locale, "Önce bir yorum kaynağı ekleyin.", "Add a review source first.")}</p>}
    {sources.map((source) => {
      const row = statsBySource.get(source.id);
      const count = Number(row?.total || 0);
      const recent = Number(row?.recent_count || 0);
      const prior = Number(row?.prior_count || 0);
      const difference = recent >= 5 && prior >= 5 ? Number(row.recent_average) - Number(row.prior_average) : null;
      return <section key={source.id} className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-foreground">{source.business_name}</h2>
        <p className="text-xs text-muted">{source.brand_name ? `${source.brand_name} · ` : ""}{source.platform === "first_party" ? t(locale, "Doğrudan geri bildirim", "Direct feedback") : source.platform}</p>
        {count === 0 ? <p className="mt-3 text-sm text-muted">{t(locale, "Henüz yayınlanmış yorum yok.", "No published reviews yet.")}</p> : <>
          <p className="mt-3 text-sm text-foreground"><strong>{row.average} ★</strong> · {count} {t(locale, "yorum", "reviews")} · {row.low_count} {t(locale, "düşük puanlı", "low ratings")}</p>
          <div className="mt-3 grid grid-cols-5 gap-2" aria-label={t(locale, "Yıldız dağılımı", "Rating distribution")}>{[5, 4, 3, 2, 1].map((star) => <div key={star} className="min-w-0 rounded-lg bg-muted-bg p-2 text-center text-xs"><strong className="block text-foreground">{star} ★</strong><span className="text-muted">{row[`stars_${star}`]}</span></div>)}</div>
          <p className="mt-3 text-sm text-muted">{t(locale, "Son 30 gün", "Last 30 days")}: {recent} · {row.recent_average || "—"} ★ &nbsp;|&nbsp; {t(locale, "Önceki 30 gün", "Prior 30 days")}: {prior} · {row.prior_average || "—"} ★</p>
          {difference !== null && <p className="mt-1 text-xs text-muted">{t(locale, "Ortalama puan değişimi", "Average rating change")}: {difference > 0 ? "+" : ""}{difference.toFixed(1)} ★</p>}
          {lowReviews.some((item) => item.source_id === source.id) && <div className="mt-4 border-t border-border pt-3"><h3 className="text-sm font-semibold text-foreground">{t(locale, "Dikkat gerektiren son yorumlar", "Recent reviews to examine")}</h3>{lowReviews.filter((item) => item.source_id === source.id).map((item, index) => <p key={`${item.reviewed_at}-${index}`} className="mt-2 line-clamp-3 break-words text-sm text-muted">{item.rating} ★ · {item.body}</p>)}</div>}
        </>}
        <AiReviewSummary sourceId={source.id} locale={locale} reviewCount={Number(row?.written_count) || 0} />
      </section>;
    })}
  </div>;
}
