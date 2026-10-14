import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Kurulum durumu", "Installation status")} — ReviewBridge` };
}

export default async function InstallationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const rows = await query(
    `SELECT w.id, w.widget_title, s.business_name, i.site_host, i.first_seen_at, i.last_seen_at, i.views
     FROM public.widgets w
     JOIN public.sources s ON s.id = w.source_id AND s.user_id = w.user_id
     JOIN public.users owner_profile ON owner_profile.id = w.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
     LEFT JOIN public.widget_installations i ON i.widget_id = w.id
     WHERE w.user_id = $1 OR (owner_profile.plan = 'agency' AND m.user_id = $1)
     ORDER BY s.business_name, i.last_seen_at DESC NULLS LAST`,
    [user.id],
  );
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">{t(locale, "Widget kurulumları", "Widget installations")}</h1><p className="mt-1 text-sm text-muted">{t(locale, "Widget bir web sayfasında açıldığında görülen alan adlarını burada izleyin. Bu kayıt alan adı sahipliğini doğrulamaz.", "See the domains where a widget has loaded. This observation does not verify domain ownership.")}</p></div>
    <div className="space-y-3">{rows.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz widget yok.", "No widgets yet.")}</p>}{rows.map((row, index) => <article key={`${row.id}:${row.site_host || index}`} className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap justify-between gap-2"><div><strong className="text-foreground">{row.widget_title || row.business_name}</strong><p className="text-xs text-muted">{row.business_name}</p></div><Link href={`/dashboard/widget/${row.id}`} className="text-sm text-primary underline">{t(locale, "Widget'ı aç", "Open widget")}</Link></div>
      {row.site_host ? <p className="mt-3 text-sm text-foreground">{row.site_host} · {row.views} {t(locale, "yükleme", "loads")} · {t(locale, "Son görülme", "Last seen")}: {new Date(row.last_seen_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</p> : <p className="mt-3 text-sm text-muted">{t(locale, "Henüz dış bir sitede yüklenme görülmedi. Kodu sitenize ekleyip sayfayı açın.", "No load has been observed on an external site. Add the code to your site and open the page.")}</p>}
    </article>)}</div>
    <Link href="/dashboard/help#widget-installation" className="text-sm text-primary underline">{t(locale, "Kurulum rehberini aç", "Open installation guide")}</Link>
  </div>;
}
