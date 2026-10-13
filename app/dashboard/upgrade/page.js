import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: `${t(locale, "Planlar", "Plans")} — ReviewBridge`,
    description: t(locale, "ReviewBridge planlarını karşılaştırın ve yorum bileşenleriniz için daha fazla özelliğin kilidini açın.", "Compare ReviewBridge plans and unlock powerful features for your review widgets."),
  };
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default async function UpgradePage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await queryOne(
    "SELECT plan, email FROM public.users WHERE id = $1",
    [user.id]
  );

  const currentPlan = profile?.plan || "free";
  const userEmail = profile?.email || user.email || "";

  const proCheckoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL
    ? `${process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL}?checkout[email]=${encodeURIComponent(userEmail)}`
    : "#";
  const agencyCheckoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_AGENCY_URL
    ? `${process.env.NEXT_PUBLIC_LEMONSQUEEZY_AGENCY_URL}?checkout[email]=${encodeURIComponent(userEmail)}`
    : "#";

  const plans = [
    {
      key: "free",
      name: t(locale, "Ücretsiz", "Free"),
      price: "$0",
      period: t(locale, "süresiz", "forever"),
      description: t(locale, "Temel özelliklerle başlayın", "Start with the basics"),
      features: [
        { text: t(locale, "1 bağlı kaynak", "1 connected source"), included: true },
        { text: t(locale, "10 yoruma kadar gösterim", "Show up to 10 reviews"), included: true },
        { text: t(locale, "Yalnızca açık tema", "Light theme only"), included: true },
        { text: t(locale, "ReviewBridge rozeti", "ReviewBridge badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: false },
        { text: t(locale, "Yıldız puanı filtresi", "Star rating filter"), included: false },
        { text: t(locale, "Rozeti kaldır", "Remove badge"), included: false },
      ],
      cta: currentPlan === "free" ? t(locale, "Mevcut plan", "Current plan") : t(locale, "Alt plana geç", "Downgrade"),
      ctaDisabled: true,
      ctaHref: "#",
      highlight: false,
    },
    {
      key: "pro",
      name: "Pro",
      price: "$7",
      period: t(locale, "/ ay", "/ month"),
      description: t(locale, "Büyüyen işletmeler için", "For growing businesses"),
      popular: true,
      features: [
        { text: t(locale, "En fazla 5 kaynak", "Up to 5 sources"), included: true },
        { text: t(locale, "En fazla 20 yorum gösterimi", "Show up to 20 reviews"), included: true },
        { text: t(locale, "Tüm temalar (Açık, Koyu, Minimal)", "All themes (Light, Dark, Minimal)"), included: true },
        { text: t(locale, "ReviewBridge rozetini kaldır", "Remove ReviewBridge badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: true },
        { text: t(locale, "Yıldız puanı filtresi", "Star rating filter"), included: true, comingSoon: true },
        { text: t(locale, "Öncelikli eşitleme", "Priority sync"), included: true },
      ],
      cta: currentPlan === "pro" ? t(locale, "Mevcut plan", "Current plan") : currentPlan === "agency" ? t(locale, "Alt plana geç", "Downgrade") : t(locale, "Pro’ya yükselt", "Upgrade to Pro"),
      ctaDisabled: currentPlan === "pro" || currentPlan === "agency",
      ctaHref: currentPlan === "free" ? proCheckoutUrl : "#",
      highlight: true,
    },
    {
      key: "agency",
      name: t(locale, "Ajans", "Agency"),
      price: "$19",
      period: t(locale, "/ ay", "/ month"),
      description: t(locale, "Ajanslar ve yoğun kullanım için", "For agencies and high-volume use"),
      features: [
        { text: t(locale, "Sınırsız kaynak", "Unlimited sources"), included: true },
        { text: t(locale, "Bileşen başına en fazla 20 yorum", "Up to 20 reviews per widget"), included: true },
        { text: t(locale, "Tüm temalar", "All themes"), included: true },
        { text: t(locale, "Rozeti kaldır", "Remove badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: true },
        { text: t(locale, "Yıldız puanı filtresi", "Star rating filter"), included: true, comingSoon: true },
        { text: t(locale, "Markasız kullanım seçeneği", "White-label option"), included: true },
        { text: t(locale, "Öncelikli destek", "Priority support"), included: true },
      ],
      cta: currentPlan === "agency" ? t(locale, "Mevcut plan", "Current plan") : t(locale, "Ajans planına yükselt", "Upgrade to Agency"),
      ctaDisabled: currentPlan === "agency",
      ctaHref: currentPlan !== "agency" ? agencyCheckoutUrl : "#",
      highlight: false,
    },
  ];

  const faqs = [
    { q: t(locale, "İstediğim zaman iptal edebilir miyim?", "Can I cancel anytime?"), a: t(locale, "Evet. Taahhüt yoktur; istediğiniz zaman iptal edebilirsiniz.", "Yes. There is no commitment; you can cancel anytime.") },
    { q: t(locale, "Hemen ücret alınır mı?", "Will I be charged immediately?"), a: t(locale, "Evet. Yükseltme sonrası faturalandırma başlar ve özelliklere hemen erişirsiniz.", "Yes. Billing starts after you upgrade and features become available immediately.") },
    { q: t(locale, "Planımı değiştirebilir miyim?", "Can I change my plan?"), a: t(locale, "İstediğiniz zaman plan değiştirebilirsiniz. Yardım için destek ekibiyle iletişime geçin.", "You can change plans at any time. Contact support if you need help.") },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t(locale, "Panele dön", "Back to dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t(locale, "Size uygun planı seçin", "Choose the right plan for you")}</h1>
        <p className="text-muted text-lg max-w-xl mx-auto">{t(locale, "İtibarınızı güçlendirin ve daha fazla ziyaretçiyi müşteriye dönüştürün.", "Build trust and turn more visitors into customers.")}</p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all ${
                isCurrent
                  ? "border-primary shadow-lg shadow-primary/10"
                  : plan.highlight
                  ? "border-primary/30 shadow-md"
                  : "border-border shadow-sm"
              }`}
            >
              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                  {t(locale, "Mevcut plan", "Current plan")}
                </div>
              )}

              {/* En popüler badge */}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                  {t(locale, "En popüler", "Most popular")}
                </div>
              )}

              <div className="mb-6 pt-2">
                <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-muted text-sm">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {f.included ? <CheckIcon /> : <CrossIcon />}
                    <span className={f.included ? "text-foreground" : "text-gray-400"}>
                      {f.text}
                      {f.comingSoon && (
                        <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{t(locale, "YAKINDA", "COMING SOON")}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {plan.ctaDisabled ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-muted-bg text-muted border border-border cursor-not-allowed"
                >
                  {plan.cta}
                </button>
              ) : (
                <a
                  href={plan.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center block transition-all ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary-hover shadow-sm"
                      : "bg-foreground text-white hover:bg-neutral-800"
                  }`}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto mb-12">
        <h2 className="text-xl font-bold text-foreground text-center mb-8">{t(locale, "Sık sorulan sorular", "Frequently asked questions")}</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">{faq.q}</h3>
              <p className="text-sm text-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
