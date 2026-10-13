import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function StarIcon({ className, filled = true }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={filled ? 0 : 1.5}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Navbar({ isSignedIn, locale }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-xl text-foreground">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">R</span>
          ReviewBridge
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">{t(locale, "Nasıl çalışır?", "How it works")}</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">{t(locale, "Fiyatlar", "Pricing")}</a>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="whitespace-nowrap text-xs sm:text-sm font-semibold bg-primary text-white px-3 sm:px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow"
            >
              {t(locale, "Panele dön", "Back to dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap text-xs sm:text-sm font-medium text-muted hover:text-foreground transition-colors px-1 sm:px-4 py-2"
              >
                {t(locale, "Giriş yap", "Log in")}
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap text-xs sm:text-sm font-semibold bg-primary text-white px-3 sm:px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow"
              >
                {t(locale, "Ücretsiz başla", "Get Started Free")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ isSignedIn, locale }) {
  return (
    <section className="hero-gradient pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border text-sm text-muted mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          {t(locale, "Google ve Trustpilot yorumları web sitenizde", "Google & Trustpilot reviews on your website")}
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
          {t(locale, "Google yorumlarınızı", "Show your ")}{" "}
          <span className="gradient-text">{t(locale, "web sitenizde", "Google reviews")}</span>{" "}
          {t(locale, "gösterin", "on your website")}
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          {t(locale,
            "Google veya Trustpilot profilinizi bağlayın, yorum bileşeninizi özelleştirin ve tek satır kodla sitenize ekleyin. Ziyaretçilerinizin güvenini kazanın.",
            "Connect your Google or Trustpilot listing, customize a beautiful widget, and embed it on your site with one line of code. Boost trust instantly.")}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={isSignedIn ? "/dashboard" : "/signup"}
            id="hero-cta"
            className="btn-pulse inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary text-white font-semibold px-4 sm:px-8 py-4 rounded-xl text-base sm:text-lg hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isSignedIn ? t(locale, "Panele dön", "Back to dashboard") : <><span className="sm:hidden">{t(locale, "Ücretsiz başla", "Start Free")}</span><span className="hidden sm:inline">{t(locale, "Ücretsiz başla — Kredi kartı gerekmez", "Start Free — No Credit Card")}</span></>}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-muted font-medium px-6 py-4 rounded-xl hover:bg-white/60 transition-colors"
          >
            {t(locale, "Nasıl çalıştığını gör", "See how it works")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>

        <p className="mt-4 text-sm text-muted/70">{t(locale, "Kredi kartı gerekmez · İstediğiniz zaman iptal edin · 2 dakikada kurulum", "No credit card required · Cancel anytime · Setup in 2 minutes")}</p>

        {/* Clearly label this static example so it is not mistaken for a real customer review. */}
        <p className="mt-16 mb-2 text-center text-xs font-medium text-muted">{t(locale, "Demo bileşen · örnek işletme ve yorumlar", "Demo widget · sample business and reviews")}</p>
        <div className="max-w-lg mx-auto glass-card p-6 text-left">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">BC</div>
            <div>
              <p className="font-semibold text-foreground">Bella Cafe Istanbul</p>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />)}
                </div>
                <span className="text-xs text-muted">4.8 · {t(locale, "Google yorumları", "Google Reviews")}</span>
              </div>
            </div>
          </div>

          {/* Review 1 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground text-sm">Mehmet Y.</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />)}
              </div>
              <span className="ml-auto text-xs text-muted">{t(locale, "2 gün önce", "2 days ago")}</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">&quot;{t(locale, "Harika bir mekan, kesinlikle tavsiye ederim!", "A wonderful place, highly recommended!")}&quot;</p>
          </div>

          {/* Review 2 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground text-sm">Sarah K.</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />)}
              </div>
              <span className="ml-auto text-xs text-muted">{t(locale, "1 hafta önce", "1 week ago")}</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">&quot;{t(locale, "Harika kahve ve güzel hizmet. Tekrar geleceğim!", "Amazing coffee and great service. Will come back!")}&quot;</p>
          </div>

          {/* Review 3 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground text-sm">Ayşe D.</span>
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />)}
                <StarIcon className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <span className="ml-auto text-xs text-muted">{t(locale, "2 hafta önce", "2 weeks ago")}</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">&quot;{t(locale, "Çok güzel atmosfer, fiyatlar makul.", "Lovely atmosphere and reasonable prices.")}&quot;</p>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#4285f4]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-xs text-muted font-medium">{t(locale, "Google yorumları", "Google Reviews")}</span>
            </div>
            <span className="text-xs text-muted/60">{t(locale, "ReviewBridge tarafından desteklenir", "Powered by ReviewBridge")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ locale }) {
  const steps = [
    {
      num: "1",
      title: t(locale, "Profilinizi bağlayın", "Connect your listing"),
      desc: t(locale, "Google Haritalar bağlantınızı veya Place ID'nizi ya da Trustpilot bağlantınızı girin. Kaynağı bağladıktan sonra yorumlar alınır.", "Enter your Google Maps URL or Place ID, or your Trustpilot URL. Reviews start fetching after you connect the source."),
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
    },
    {
      num: "2",
      title: t(locale, "Bileşeninizi özelleştirin", "Customize your widget"),
      desc: t(locale, "Tema ve gösterilecek yorum sayısını seçin; sitenizde nasıl görüneceğini önizleyin.", "Choose a theme, set max reviews, and preview exactly how it will look on your site."),
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
    {
      num: "3",
      title: t(locale, "Sitenize ekleyin", "Embed & go live"),
      desc: t(locale, "Tek satırlık kodu kopyalayıp sitenize yapıştırın. Yorumlarınız hemen görünür.", "Copy one line of code, paste it on your website. Your reviews appear instantly."),
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t(locale, "Nasıl çalışır?", "How it works")}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t(locale, "3 adımda canlı yorumlar", "Live reviews in 3 simple steps")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-8 rounded-2xl bg-muted-bg/50 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                {step.icon}
              </div>
              <div className="absolute top-6 right-6 text-5xl font-bold text-border/60 select-none">
                {step.num}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ isSignedIn, locale }) {
  const plans = [
    {
      name: t(locale, "Ücretsiz", "Free"),
      price: "$0",
      period: t(locale, "sonsuza dek", "forever"),
      desc: t(locale, "Denemek için ideal", "Perfect for trying it out"),
      features: [
        t(locale, "1 bağlı kaynak", "1 connected source"),
        t(locale, "En fazla 10 yorum gösterimi", "Up to 10 reviews shown"),
        t(locale, "Yalnızca açık tema", "Light theme only"),
        t(locale, "ReviewBridge rozeti görünür", "ReviewBridge badge shown"),
      ],
      cta: t(locale, "Ücretsiz başla", "Get Started Free"),
      popular: false,
    },
    {
      name: "Pro",
      price: "$7",
      period: t(locale, "/ay", "/month"),
      desc: t(locale, "Büyüyen işletmeler için", "For growing businesses"),
      features: [
        t(locale, "En fazla 5 kaynak", "Up to 5 sources"),
        t(locale, "Bileşen başına en fazla 20 yorum", "Up to 20 reviews shown per widget"),
        t(locale, "Tüm temalar", "All themes unlocked"),
        t(locale, "ReviewBridge rozetini kaldırma", "Remove ReviewBridge badge"),
        t(locale, "Akıllı Filtre — yalnızca yazılı yorumlar", "Smart Filter — show only written reviews"),
        t(locale, "Öncelikli eşitleme", "Priority sync"),
      ],
      cta: t(locale, "Pro'ya geç", "Start Pro"),
      popular: true,
    },
    {
      name: t(locale, "Ajans", "Agency"),
      price: "$19",
      period: t(locale, "/ay", "/month"),
      desc: t(locale, "Ajanslar ve çoklu siteler için", "For agencies & multi-site"),
      features: [
        t(locale, "Sınırsız kaynak", "Unlimited sources"),
        t(locale, "Bileşen başına en fazla 20 yorum", "Up to 20 reviews shown per widget"),
        t(locale, "Tüm temalar", "All themes unlocked"),
        t(locale, "Rozeti kaldırma", "Remove badge"),
        t(locale, "Birden fazla siteyi yönetme", "Manage multiple sites"),
        t(locale, "Öncelikli destek", "Priority support"),
      ],
      cta: t(locale, "Ajans planına geç", "Start Agency"),
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-muted-bg/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t(locale, "Fiyatlar", "Pricing")}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t(locale, "Açık ve anlaşılır fiyatlandırma", "Simple, transparent pricing")}
          </h2>
          <p className="mt-4 text-muted text-lg max-w-xl mx-auto">
            {t(locale, "Ücretsiz başlayın. Daha fazlasına ihtiyaç duyduğunuzda yükseltin. Gizli ücret yok.", "Start free. Upgrade when you need more power. No hidden fees.")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? "bg-white border-2 border-primary shadow-lg scale-105"
                  : "bg-white border border-border shadow-sm hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full">
                  {t(locale, "En popüler", "Most Popular")}
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted mt-1">{plan.desc}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted text-sm">{plan.period}</span>
              </div>

              <Link
                href={isSignedIn ? "/dashboard/upgrade" : "/signup"}
                className={`mt-8 block text-center font-semibold py-3 rounded-xl transition-all duration-200 ${
                  plan.popular
                    ? "bg-primary text-white hover:bg-primary-hover shadow-sm"
                    : "bg-muted-bg text-foreground hover:bg-primary-light hover:text-primary"
                }`}
              >
                {isSignedIn ? t(locale, "Planları gör", "View plans") : plan.cta}
              </Link>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-muted">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ locale }) {
  const faqs = [
    {
      q: t(locale, "Hangi platformlar destekleniyor?", "Which platforms are supported?"),
      a: t(locale, "Şu anda Google Haritalar ve Trustpilot. Yakında başka platformlar da eklenecek.", "Currently Google Maps and Trustpilot. More platforms coming soon."),
    },
    {
      q: t(locale, "Yorumlar ne sıklıkla güncellenir?", "How often are reviews updated?"),
      a: t(locale, "Bir kaynak bağladığınızda yorumlar alınır. Panelden elle eşitleme başlatabilirsiniz; zamanlanmış otomatik eşitleme henüz yok.", "Reviews are fetched when you connect a source. You can start a manual sync from your dashboard; scheduled automatic syncing is not available yet.")
    },
    {
      q: t(locale, "Her web sitesinde çalışır mı?", "Will it work on any website?"),
      a: t(locale, "Evet. WordPress, Shopify, Wix, Webflow ve özel geliştirilmiş sitelerde çalışır.", "Yes. Works on WordPress, Shopify, Wix, Webflow, or any custom website."),
    },
    {
      q: t(locale, "Teknik bilgi gerekir mi?", "Do I need technical knowledge?"),
      a: t(locale, "Hayır. Tek satırlık kodu kopyalayıp yorumların görünmesini istediğiniz yere yapıştırın.", "No. Just copy one line of code and paste it where you want reviews to appear."),
    },
    {
      q: t(locale, "İstediğim zaman iptal edebilir miyim?", "Can I cancel anytime?"),
      a: t(locale, "Evet. Sözleşme veya taahhüt yok. Panelinizden istediğiniz zaman iptal edebilirsiniz.", "Yes. No contracts, no commitments. Cancel anytime from your dashboard."),
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t(locale, "SSS", "FAQ")}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t(locale, "Sık sorulan sorular", "Frequently asked questions")}
          </h2>
        </div>

        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="p-6 rounded-2xl bg-muted-bg/50 border border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
              <p className="text-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ locale }) {
  return (
    <footer className="py-12 bg-foreground text-white/70">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-white text-lg">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">R</span>
            ReviewBridge
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">{t(locale, "Gizlilik Politikası", "Privacy Policy")}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t(locale, "Kullanım Koşulları", "Terms of Service")}</Link>
            <a href="mailto:support@reviewbridge.app" className="hover:text-white transition-colors">support@reviewbridge.app</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ReviewBridge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default async function LandingPage() {
  const locale = await getLocale();
  let isSignedIn = false;
  try {
    const { data: session } = await auth.getSession();
    isSignedIn = Boolean(session?.user?.emailVerified);
  } catch {
    // Keep the public landing page available if the auth service is unavailable.
  }

  return (
    <>
      <Navbar isSignedIn={isSignedIn} locale={locale} />
      <main className="flex-1">
        <HeroSection isSignedIn={isSignedIn} locale={locale} />
        <HowItWorksSection locale={locale} />
        <PricingSection isSignedIn={isSignedIn} locale={locale} />
        <FAQSection locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
