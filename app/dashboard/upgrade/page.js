import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { PLAN_LIMITS, PLAN_PRICES_USD } from "@/lib/plans";
import { cancelSubscriptionAction, manageSubscriptionAction, refreshSubscriptionAction, startCheckoutAction } from "@/app/actions/billing";

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

export default async function UpgradePage({ searchParams }) {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await queryOne(
    "SELECT plan, lemonsqueezy_subscription_id, billing_status, billing_ends_at, billing_renews_at FROM public.users WHERE id = $1",
    [user.id]
  );

  const currentPlan = profile?.plan || "free";
  const billingTestMode = process.env.BILLING_MODE !== "live";
  const hasSubscription = Boolean(profile?.lemonsqueezy_subscription_id);
  const hasCurrentSubscription = hasSubscription && profile?.billing_status !== "expired";
  const billingConfigured = Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID
    && process.env.LEMONSQUEEZY_WEBHOOK_SECRET && process.env.LEMONSQUEEZY_PRO_VARIANT_ID && process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID);
  const billingNotice = (await searchParams)?.billing;
  const notice = {
    cancelled: t(locale, "Yenileme durduruldu. Pro/Ajans erişiminiz gösterilen bitiş tarihine kadar sürer.", "Renewal was cancelled. Your paid access continues until the displayed end date."),
    unavailable: t(locale, "Abonelik hizmetine şu an ulaşılamıyor. İşlem tamamlanmadı; lütfen tekrar deneyin.", "Billing is currently unavailable. The operation was not completed; please try again."),
    busy: t(locale, "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.", "Too many requests. Please try again later."),
    return: t(locale, "Ödeme sonucunun hesabınıza ulaşması biraz sürebilir. Aşağıdaki düğmeyle abonelik durumunu yenileyebilirsiniz.", "It may take a moment for your account to receive the payment result. You can refresh your subscription status below."),
    refreshed: t(locale, "Abonelik durumu kontrol edildi.", "Subscription status checked."),
    pending: t(locale, "Bir ödeme oturumu zaten hazırlanıyor veya açık. Aynı planı yeniden açabilirsiniz; başka plan için önce mevcut oturumun sona ermesini bekleyin.", "A checkout is already being prepared or is open. You can reopen the same plan; wait for it to expire before choosing another plan."),
  }[billingNotice];

  const plans = [
    {
      key: "free",
      name: t(locale, "Ücretsiz", "Free"),
      price: `$${PLAN_PRICES_USD.free}`,
      period: t(locale, "süresiz", "forever"),
      description: t(locale, "Temel özelliklerle başlayın", "Start with the basics"),
      features: [
        { text: t(locale, `${PLAN_LIMITS.free.maxSources} bağlı kaynak`, `${PLAN_LIMITS.free.maxSources} connected source`), included: true },
        { text: t(locale, `${PLAN_LIMITS.free.maxReviews} yoruma kadar gösterim`, `Show up to ${PLAN_LIMITS.free.maxReviews} reviews`), included: true },
        { text: t(locale, "Yalnızca açık tema", "Light theme only"), included: true },
        { text: t(locale, "ReviewBridge rozeti", "ReviewBridge badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: false },
        { text: t(locale, "Gelişmiş filtre ve düzenler", "Advanced filters and layouts"), included: false },
        { text: t(locale, "Rozeti kaldır", "Remove badge"), included: false },
      ],
      cta: currentPlan === "free" ? t(locale, "Mevcut plan", "Current plan") : t(locale, "Alt plana geç", "Downgrade"),
      ctaDisabled: !hasSubscription,
      highlight: false,
    },
    {
      key: "pro",
      name: "Pro",
      price: `$${PLAN_PRICES_USD.pro}`,
      period: t(locale, "/ ay", "/ month"),
      description: t(locale, "Büyüyen işletmeler için", "For growing businesses"),
      popular: true,
      features: [
        { text: t(locale, `En fazla ${PLAN_LIMITS.pro.maxSources} kaynak`, `Up to ${PLAN_LIMITS.pro.maxSources} sources`), included: true },
        { text: t(locale, `En fazla ${PLAN_LIMITS.pro.maxReviews} yorum gösterimi`, `Show up to ${PLAN_LIMITS.pro.maxReviews} reviews`), included: true },
        { text: t(locale, "Tüm temalar (Açık, Koyu, Minimal)", "All themes (Light, Dark, Minimal)"), included: true },
        { text: t(locale, "ReviewBridge rozetini kaldır", "Remove ReviewBridge badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: true },
        { text: t(locale, "Grid ve carousel düzenleri", "Grid and carousel layouts"), included: true },
        { text: t(locale, "Puan, tarih ve kelime filtreleri", "Rating, date, and keyword filters"), included: true },
        { text: t(locale, "Yorum gizleme ve sabitleme", "Hide and pin reviews"), included: true },
        { text: t(locale, "Özel widget dili ve renkleri", "Custom widget language and colors"), included: true },
        { text: t(locale, "Günlük otomatik eşitleme ve elle yenileme", "Daily automatic sync and manual refresh"), included: true },
      ],
      cta: currentPlan === "pro" ? t(locale, "Mevcut plan", "Current plan") : currentPlan === "agency" ? t(locale, "Alt plana geç", "Downgrade") : t(locale, "Pro’ya yükselt", "Upgrade to Pro"),
      ctaDisabled: currentPlan === "pro",
      highlight: true,
    },
    {
      key: "agency",
      name: t(locale, "Ajans", "Agency"),
      price: `$${PLAN_PRICES_USD.agency}`,
      period: t(locale, "/ ay", "/ month"),
      description: t(locale, "Ajanslar ve yoğun kullanım için", "For agencies and high-volume use"),
      features: [
        { text: t(locale, PLAN_LIMITS.agency.maxSources === Infinity ? "Sınırsız kaynak" : `En fazla ${PLAN_LIMITS.agency.maxSources} kaynak`, PLAN_LIMITS.agency.maxSources === Infinity ? "Unlimited sources" : `Up to ${PLAN_LIMITS.agency.maxSources} sources`), included: true },
        { text: t(locale, `Bileşen başına en fazla ${PLAN_LIMITS.agency.maxReviews} yorum`, `Up to ${PLAN_LIMITS.agency.maxReviews} reviews per widget`), included: true },
        { text: t(locale, "Tüm temalar", "All themes"), included: true },
        { text: t(locale, "Rozeti kaldır", "Remove badge"), included: true },
        { text: t(locale, "Akıllı filtre", "Smart filter"), included: true },
        { text: t(locale, "Grid ve carousel düzenleri", "Grid and carousel layouts"), included: true },
        { text: t(locale, "Puan, tarih ve kelime filtreleri", "Rating, date, and keyword filters"), included: true },
        { text: t(locale, "Yorum gizleme ve sabitleme", "Hide and pin reviews"), included: true },
        { text: t(locale, "Özel widget dili ve renkleri", "Custom widget language and colors"), included: true },
        { text: t(locale, "Günlük otomatik eşitleme ve elle yenileme", "Daily automatic sync and manual refresh"), included: true },
      ],
      cta: currentPlan === "agency" ? t(locale, "Mevcut plan", "Current plan") : t(locale, "Ajans planına yükselt", "Upgrade to Agency"),
      ctaDisabled: currentPlan === "agency",
      highlight: false,
    },
  ];

  const faqs = [
    { q: t(locale, "İstediğim zaman iptal edebilir miyim?", "Can I cancel anytime?"), a: t(locale, "Evet. Taahhüt yoktur; istediğiniz zaman iptal edebilirsiniz.", "Yes. There is no commitment; you can cancel anytime.") },
    { q: t(locale, "Hemen ücret alınır mı?", "Will I be charged immediately?"), a: billingTestMode
      ? t(locale, "Hayır. Ödeme sistemi şu anda test modunda; gerçek ücret alınmaz.", "No. Payments are currently in test mode; no real charge is made.")
      : t(locale, "Evet. Yükseltme sonrası faturalandırma başlar ve özelliklere hemen erişirsiniz.", "Yes. Billing starts after you upgrade and features become available immediately.") },
    { q: t(locale, "Planımı değiştirebilir miyim?", "Can I change my plan?"), a: billingTestMode
      ? t(locale, "Test modunda yenilemeyi bu sayfadan durdurabilirsiniz. Mağaza etkinleştirilene kadar Lemon müşteri portalı kullanılamayabilir.", "In test mode, you can cancel renewal on this page. Lemon's customer portal may be unavailable until the store is activated.")
      : t(locale, "Aboneliği yönet düğmesiyle müşteri portalını açın. Plan değişikliği, iptal, fatura ve ödeme yöntemi işlemlerini oradan yapabilirsiniz.", "Open the customer portal with Manage subscription for plan changes, cancellation, invoices, and payment methods.") },
    { q: t(locale, "Ödeme başarısız olursa ne olur?", "What happens if a payment fails?"), a: t(locale, "Yenileme denemeleri sırasında en fazla 14 gün erişim korunur. Tahsilat tamamlanamazsa Ücretsiz plan sınırları uygulanır; kaynaklarınız ve yorumlarınız silinmez.", "Access continues for up to 14 days during payment recovery. If payment cannot be collected, Free limits apply; your sources and reviews are preserved.") },
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

      {billingTestMode && (
        <p className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          {t(locale, "Ödeme sistemi test modunda. Plan denemeleri için gerçek ücret alınmaz.", "Payments are in test mode. Plan trials do not incur real charges.")}
        </p>
      )}
      {!billingConfigured && <p className="mb-6 rounded-xl border border-border p-4 text-sm">
        {t(locale, "Abonelik işlemleri şu anda hazırlık aşamasında. Mevcut hesabınızı kullanmaya devam edebilirsiniz.", "Subscription management is being prepared. You can continue using your existing account.")}
      </p>}
      {notice && <p role="status" className="mb-6 rounded-xl bg-muted-bg p-4 text-sm">{notice}</p>}
      {(hasSubscription || billingNotice === "return") && (
        <div className="mb-8 rounded-xl border border-border p-4 space-y-3">
          {profile?.billing_ends_at && <p>{t(locale, "Erişim bitişi: ", "Access ends: ")}
            {new Date(profile.billing_ends_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</p>}
          {!profile?.billing_ends_at && profile?.billing_renews_at && <p>{t(locale, "Sonraki ödeme: ", "Next payment: ")}
            {new Date(profile.billing_renews_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</p>}
          <div className="flex flex-wrap gap-3">
            {hasSubscription && !billingTestMode && <form action={manageSubscriptionAction}>
              <button disabled={!billingConfigured} className="rounded-lg bg-primary text-white px-4 py-2 disabled:opacity-50">
                {t(locale, "Aboneliği yönet", "Manage subscription")}
              </button>
            </form>}
            <form action={refreshSubscriptionAction}>
              <button disabled={!billingConfigured} className="rounded-lg border border-border px-4 py-2 disabled:opacity-50">
                {t(locale, "Abonelik durumunu yenile", "Refresh subscription status")}
              </button>
            </form>
          </div>
          {hasSubscription && !["cancelled", "expired"].includes(profile.billing_status) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">{t(locale, "Yenilemeyi durdur", "Cancel renewal")}</summary>
              <p className="mt-2 text-muted">{t(locale, "Aboneliğiniz dönem sonuna kadar kullanılabilir; sonraki ödeme alınmaz.", "Your subscription remains available until the end of this period; no next payment will be collected.")}</p>
              <form action={cancelSubscriptionAction} className="mt-2">
                <button disabled={!billingConfigured} className="rounded-lg border border-border px-4 py-2 disabled:opacity-50">
                  {t(locale, "Yenilemeyi durdurmayı onayla", "Confirm cancellation")}
                </button>
              </form>
            </details>
          )}
        </div>
      )}

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
              {plan.ctaDisabled || !billingConfigured || (billingTestMode && hasCurrentSubscription) ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-muted-bg text-muted border border-border cursor-not-allowed"
                >
                  {billingTestMode && hasCurrentSubscription && !plan.ctaDisabled
                    ? t(locale, "Mağaza etkinleşince kullanılabilir", "Available when the store is activated") : plan.cta}
                </button>
              ) : (
                <form action={hasCurrentSubscription ? manageSubscriptionAction : startCheckoutAction}>
                <input type="hidden" name="plan" value={plan.key} />
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center block transition-all ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary-hover shadow-sm"
                      : "bg-foreground text-white hover:bg-neutral-800"
                  }`}
                >
                  {plan.cta}
                </button>
                </form>
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
