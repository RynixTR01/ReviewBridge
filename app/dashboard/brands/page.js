import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { assignSourceBrandAction, removeBrandMemberAction } from "@/app/actions/brands";
import CreateBrand from "./CreateBrand";
import AddMember from "./AddMember";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Markalar", "Brands")} — ReviewBridge` };
}

export default async function BrandsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const profile = await queryOne("SELECT plan FROM public.users WHERE id = $1", [user.id]);
  const isAgencyOwner = profile?.plan === "agency";
  const [ownedBrands, sharedBrands, sources, members] = await Promise.all([
    isAgencyOwner ? query("SELECT id, name, website_domain FROM public.agency_brands WHERE owner_user_id = $1 ORDER BY created_at DESC", [user.id]) : [],
    query(`SELECT b.id, b.name, b.website_domain, m.role, u.email AS owner_email
           FROM public.agency_brand_members m
           JOIN public.agency_brands b ON b.id = m.brand_id
           JOIN public.users u ON u.id = b.owner_user_id AND u.plan = 'agency'
           WHERE m.user_id = $1 ORDER BY b.name`, [user.id]),
    isAgencyOwner ? query("SELECT id, business_name, platform, brand_id FROM public.sources WHERE user_id = $1 ORDER BY created_at DESC", [user.id]) : [],
    isAgencyOwner ? query(`SELECT m.brand_id, m.user_id, m.role, u.email
      FROM public.agency_brand_members m
      JOIN public.agency_brands b ON b.id = m.brand_id
      JOIN public.users u ON u.id = m.user_id
      WHERE b.owner_user_id = $1 ORDER BY u.email`, [user.id]) : [],
  ]);
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">{t(locale, "Markalar ve müşteriler", "Brands and clients")}</h1><p className="mt-1 text-sm text-muted">{t(locale, "Kaynakları marka bazında gruplayın ve her markanın ekibini ayrı yönetin.", "Group sources by brand and manage each brand's team separately.")}</p></div>
    {isAgencyOwner ? <>
      <CreateBrand />
      <section className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{t(locale, "Kaynakları düzenle", "Organize sources")}</h2>
        {sources.length === 0 && <p className="text-sm text-muted">{t(locale, "Önce bir kaynak ekleyin.", "Add a source first.")}</p>}
        {sources.map((source) => <form key={source.id} action={assignSourceBrandAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
          <div><strong className="text-foreground">{source.business_name}</strong><p className="text-xs text-muted">{source.platform}</p></div>
          <div className="flex gap-2"><input type="hidden" name="sourceId" value={source.id} /><select name="brandId" defaultValue={source.brand_id || ""} aria-label={t(locale, "Marka seç", "Choose brand")} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">{t(locale, "Markasız", "Unassigned")}</option>{ownedBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><button className="rounded-lg bg-primary px-3 py-2 text-sm text-white">{t(locale, "Kaydet", "Save")}</button></div>
        </form>)}
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{t(locale, "Marka ekipleri", "Brand teams")}</h2>
        {ownedBrands.map((brand) => <div key={brand.id} className="rounded-xl border border-border bg-white p-4">
          <strong>{brand.name}</strong><p className="text-xs text-muted">{brand.website_domain || "—"} · {sources.filter((source) => source.brand_id === brand.id).length} {t(locale, "kaynak", "sources")}</p>
          <p className="mt-2 text-xs text-muted">{t(locale, "Görüntüleyici kaynakları ve istatistikleri görür; düzenleyici widget ayarlarını değiştirebilir ve eşitleme başlatabilir.", "Viewers can see sources and metrics; editors can change widget settings and start syncs.")}</p>
          <AddMember brandId={brand.id} />
          {members.filter((member) => member.brand_id === brand.id).map((member) => <form key={member.user_id} action={removeBrandMemberAction} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-sm"><span className="break-all">{member.email} · {member.role}</span><input type="hidden" name="brandId" value={brand.id} /><input type="hidden" name="memberId" value={member.user_id} /><button className="text-danger underline">{t(locale, "Kaldır", "Remove")}</button></form>)}
        </div>)}
      </section>
    </> : <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted">{t(locale, "Kendi markalarınızı oluşturmak için Ajans planı gerekir.", "You need the Agency plan to create your own brands.")} <Link href="/dashboard/upgrade" className="text-primary underline">{t(locale, "Planları gör", "View plans")}</Link></div>}
    {sharedBrands.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{t(locale, "Benimle paylaşılan markalar", "Brands shared with me")}</h2>{sharedBrands.map((brand) => <div key={brand.id} className="rounded-xl border border-border bg-white p-4"><strong>{brand.name}</strong><p className="text-xs text-muted">{brand.website_domain || "—"} · {brand.owner_email} · {brand.role}</p><Link href="/dashboard" className="mt-2 inline-block text-sm text-primary underline">{t(locale, "Kaynakları gör", "View sources")}</Link></div>)}</section>}
  </div>;
}
