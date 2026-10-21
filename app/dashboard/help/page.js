import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import FaqAccordion from "./FaqAccordion";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Yardım", "Help")} — ReviewBridge` };
}

export default async function YardımPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t(locale, "Yardım", "Help")}</h1>
        <p className="text-muted mt-1">{t(locale, "Yanıtları bulun ve destek alın.", "Find answers and get support.")}</p>
      </div>

      {/* FAQ Section */}
      <section className="mb-6 rounded-xl border border-border p-4 text-sm text-muted">
        <h2 className="font-semibold text-foreground">{t(locale, "Tarama deneme sınırı", "Scan attempt limits")}</h2>
        <p className="mt-2">{t(locale, "Hesap başına saatte Free: 5, Pro: 20, Ajans: 60 tarama başlatma denemesi yapılabilir. Yeni kaynak ekleme ve yeniden denemeler aynı sınırı kullanır; başarısız denemeler de sayılır. Kaynak bazındaki eşitleme bekleme süreleri ayrıca geçerlidir.", "Each account can attempt to start 5 scans per hour on Free, 20 on Pro, or 60 on Agency. Adding sources and retrying scans share this limit, including failed attempts. Per-source sync cooldowns also apply.")}</p>
      </section>
      <div className="mb-10">
        <h2 className="text-lg font-bold text-foreground mb-4">{t(locale, "Sık sorulan sorular", "Frequently asked questions")}</h2>
        <FaqAccordion />
      </div>

      <section id="widget-installation" className="mb-10 rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">{t(locale, "Yorum bileşenini sitenize ekleyin", "Install the review widget")}</h2>
        <p className="mt-2 text-sm text-muted">{t(locale, "Önce panelde bir kaynağı açıp Yerleştirme kodu bölümündeki tek satırlık kodu kopyalayın. Kodu yorumların görünmesini istediğiniz sayfa içeriğine ekleyin.", "Open a source in your dashboard and copy the one-line script from its Embed code section. Add it to the page content where you want the reviews to appear.")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted-bg p-4"><h3 className="font-semibold text-foreground">WordPress</h3><p className="mt-1 text-sm text-muted">{t(locale, "Sayfayı düzenleyip Özel HTML bloğuna kodu ekleyin veya Widget kurulumları bölümünden eklentiyi indirin. Eklentiyi yükledikten sonra [reviewbridge token=\"WIDGET_TOKEN\"] kısa kodunu kullanın.", "Edit the page and add the embed code to a Custom HTML block, or download the plugin from Widget installations. After installing it, use [reviewbridge token=\"WIDGET_TOKEN\"].")}</p><Link href="/dashboard/installations" className="mt-2 inline-block text-sm font-medium text-primary underline">{t(locale, "Eklentiyi indir", "Download plugin")}</Link></div>
          <div className="rounded-xl bg-muted-bg p-4"><h3 className="font-semibold text-foreground">Shopify</h3><p className="mt-1 text-sm text-muted">{t(locale, "Tema düzenleyicisinde Custom Liquid bloğu ekleyin, kodu yerleştirin ve kaydedin.", "Add a Custom Liquid block in the theme editor, paste the code, and save.")}</p></div>
          <div className="rounded-xl bg-muted-bg p-4"><h3 className="font-semibold text-foreground">Webflow</h3><p className="mt-1 text-sm text-muted">{t(locale, "Sayfaya bir Embed öğesi ekleyip kodu yapıştırın, sonra sayfayı yayınlayın.", "Add an Embed element, paste the code, and publish the page.")}</p></div>
          <div className="rounded-xl bg-muted-bg p-4"><h3 className="font-semibold text-foreground">{t(locale, "Diğer siteler", "Other websites")}</h3><p className="mt-1 text-sm text-muted">{t(locale, "HTML destekleyen sayfa düzenleyicisinde kodu içerik alanına ekleyin. Script'in sitenizin güvenlik politikası tarafından engellenmediğini kontrol edin.", "Paste the code into a page editor that supports HTML. Check that your site's security policy does not block the script.")}</p></div>
        </div>
        <ol className="mt-4 list-inside list-decimal space-y-1 text-sm text-muted">
          <li>{t(locale, "Önce Bileşen önizlemesi bağlantısını açıp yorumların geldiğini kontrol edin.", "Open the widget preview first and confirm reviews appear.")}</li>
          <li>{t(locale, "Kodu kaydedip sitenizi yayınlayın; sayfayı gizli pencerede açarak son görünümü doğrulayın.", "Save the code and publish your site; verify the result in a private browser window.")}</li>
          <li>{t(locale, "Görünmüyorsa sayfa önbelleğini temizleyin, script engelleyicileri ve içerik güvenlik politikasını kontrol edin.", "If it does not appear, clear the page cache and check script blockers and the Content Security Policy.")}</li>
        </ol>
        <p className="mt-3 text-xs text-muted">{t(locale, "Kurulum ekranı widget'ın açıldığı alan adını gösterir; alan adı sahipliğini kanıtlamaz. Son görünümü canlı sayfada kontrol edin.", "The installation screen shows where a widget loaded; it does not prove domain ownership. Check the final appearance on the live page.")}</p>
      </section>

      {/* Kaynaklar Section */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">{t(locale, "Kaynaklar", "Resources")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/help#google-maps-url"
            className="bg-white border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary-light transition-colors">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{t(locale, "Google Haritalar bağlantı kılavuzu", "Google Maps URL guide")}</h3>
            <p className="text-xs text-muted">{t(locale, "Bağlamak için doğru profil bağlantısını bulun.", "Find the correct listing URL to connect.")}</p>
          </Link>

          <Link
            href="/dashboard/upgrade"
            className="bg-white border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{t(locale, "Fiyatlar ve planlar", "Pricing & plans")}</h3>
            <p className="text-xs text-muted">{t(locale, "Planları karşılaştırın ve yükseltin.", "Compare plans and upgrade.")}</p>
          </Link>

          <a
            href="mailto:support@reviewbridge.app"
            className="bg-white border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{t(locale, "Destekle iletişime geçin", "Contact support")}</h3>
            <p className="text-xs text-muted">{t(locale, "24 saat içinde yanıt veririz.", "We respond within 24 hours.")}</p>
          </a>
        </div>
      </div>
    </div>
  );
}
