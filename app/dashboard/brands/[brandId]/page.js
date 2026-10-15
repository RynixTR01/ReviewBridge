import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Müşteri alanı", "Client space")} — ReviewBridge` };
}

export default async function BrandClientSpacePage({ params }) {
  const { brandId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const brand = await queryOne(
    `SELECT b.id, b.name, b.website_domain, owner_profile.email AS owner_email,
            CASE WHEN b.owner_user_id = $2 THEN 'owner' ELSE m.role END AS access_role
     FROM public.agency_brands b
     JOIN public.users owner_profile ON owner_profile.id = b.owner_user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = b.id AND m.user_id = $2
     WHERE b.id = $1 AND (b.owner_user_id = $2 OR m.user_id = $2)
       AND (b.owner_user_id = $2 OR owner_profile.plan = 'agency')`,
    [brandId, user.id],
  );
  if (!brand) notFound();
  const sources = await query(
    `SELECT s.id, s.business_name, s.platform, s.sync_status, s.last_synced_at,
            COALESCE(review_stats.review_count, 0)::int AS review_count,
            review_stats.average_rating,
            COALESCE(widget_list.widgets, '[]'::json) AS widgets
     FROM public.sources s
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS review_count, round(avg(rating)::numeric, 1) AS average_rating
       FROM public.reviews WHERE source_id = s.id
     ) review_stats ON true
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object('id', w.id, 'title', w.widget_title, 'token', w.embed_token)
                       ORDER BY w.created_at DESC) AS widgets
       FROM public.widgets w WHERE w.source_id = s.id
     ) widget_list ON true
     WHERE s.brand_id = $1
     ORDER BY s.business_name`,
    [brand.id],
  );
  const canCustomizeWidgets = brand.access_role === "owner" || brand.access_role === "editor";
  return <main className="mx-auto max-w-4xl space-y-6">
    <header className="rounded-2xl border border-border bg-white p-5 sm:p-7">
      <Link href="/dashboard/brands" className="text-sm text-primary underline">{t(locale, "Markalara dön", "Back to brands")}</Link>
      <h1 className="mt-3 text-2xl font-bold text-foreground">{brand.name}</h1>
      <p className="mt-1 text-sm text-muted">{brand.website_domain || "—"} · {t(locale, "Müşteri alanı", "Client space")} · {brand.access_role === "owner" ? t(locale, "Sahip", "Owner") : brand.access_role === "client" ? t(locale, "Müşteri", "Client") : brand.access_role === "editor" ? t(locale, "Düzenleyici", "Editor") : t(locale, "Görüntüleyici", "Viewer")}</p>
      {brand.access_role === "editor" && <p className="mt-3 text-xs text-muted">{t(locale, "Bu markanın widget ayarlarını düzenleyebilirsiniz. Diğer markalara erişemezsiniz.", "You can edit this brand's widget settings. You cannot access other brands.")}</p>}
      {(brand.access_role === "client" || brand.access_role === "viewer") && <p className="mt-3 text-xs text-muted">{t(locale, "Bu alan yalnızca bu markanın kaynak ve widget bilgilerini gösterir. Erişim salt okunurdur.", "This space shows only this brand's sources and widgets. Access is read-only.")}</p>}
    </header>
    <section className="space-y-3">
      {sources.length === 0 && <p className="rounded-xl border border-border bg-white p-4 text-sm text-muted">{t(locale, "Bu markaya henüz kaynak eklenmemiş.", "No sources have been added to this brand yet.")}</p>}
      {sources.map((source) => <article key={source.id} className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-foreground">{source.business_name}</h2><p className="text-xs text-muted">{source.platform === "first_party" ? t(locale, "Doğrudan geri bildirim", "Direct feedback") : source.platform} · {source.sync_status}</p></div><p className="text-sm font-semibold text-primary">{source.average_rating || "—"} ★ · {source.review_count} {t(locale, "yorum", "reviews")}</p></div>
        {source.last_synced_at && <p className="mt-2 text-xs text-muted">{t(locale, "Son eşitleme", "Last sync")}: {new Date(source.last_synced_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">{source.widgets.map((widget) => <div key={widget.id} className="flex flex-wrap gap-2">
          <Link href={`/preview/${widget.token}`} className="rounded-lg border border-border px-3 py-2 text-xs text-primary underline">{widget.title || t(locale, "Widget önizlemesi", "Widget preview")}</Link>
          {canCustomizeWidgets && <Link href={`/dashboard/widget/${widget.id}`} className="rounded-lg border border-border px-3 py-2 text-xs text-primary underline">{t(locale, "Widget'ı düzenle", "Edit widget")}</Link>}
        </div>)}</div>
      </article>)}
    </section>
  </main>;
}
