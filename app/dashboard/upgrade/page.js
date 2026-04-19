import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Upgrade — ReviewBridge",
  description: "Compare ReviewBridge plans and unlock powerful features for your review widgets.",
};

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("plan, email")
    .eq("id", user.id)
    .single();

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
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Get started with the basics",
      features: [
        { text: "1 connected source", included: true },
        { text: "Up to 10 reviews shown", included: true },
        { text: "Light theme only", included: true },
        { text: "ReviewBridge badge", included: true },
        { text: "Smart Filter", included: false },
        { text: "Star rating filter", included: false },
        { text: "Remove badge", included: false },
      ],
      cta: currentPlan === "free" ? "Current Plan" : "Downgrade",
      ctaDisabled: true,
      ctaHref: "#",
      highlight: false,
    },
    {
      key: "pro",
      name: "Pro",
      price: "$7",
      period: "/ month",
      description: "Perfect for growing businesses",
      popular: true,
      features: [
        { text: "Up to 5 sources", included: true },
        { text: "Up to 20 reviews shown", included: true },
        { text: "All themes (Light, Dark, Minimal)", included: true },
        { text: "Remove ReviewBridge badge", included: true },
        { text: "Smart Filter", included: true },
        { text: "Star rating filter", included: true, comingSoon: true },
        { text: "Priority sync", included: true },
      ],
      cta: currentPlan === "pro" ? "Current Plan" : currentPlan === "agency" ? "Downgrade" : "Upgrade to Pro",
      ctaDisabled: currentPlan === "pro" || currentPlan === "agency",
      ctaHref: currentPlan === "free" ? proCheckoutUrl : "#",
      highlight: true,
    },
    {
      key: "agency",
      name: "Agency",
      price: "$19",
      period: "/ month",
      description: "For agencies and power users",
      features: [
        { text: "Unlimited sources", included: true },
        { text: "Unlimited reviews", included: true },
        { text: "All themes", included: true },
        { text: "Remove badge", included: true },
        { text: "Smart Filter", included: true },
        { text: "Star rating filter", included: true, comingSoon: true },
        { text: "White-label ready", included: true },
        { text: "Priority support", included: true },
      ],
      cta: currentPlan === "agency" ? "Current Plan" : "Upgrade to Agency",
      ctaDisabled: currentPlan === "agency",
      ctaHref: currentPlan !== "agency" ? agencyCheckoutUrl : "#",
      highlight: false,
    },
  ];

  const faqs = [
    { q: "Can I cancel anytime?", a: "Yes, absolutely. There are no contracts or commitments — cancel whenever you like." },
    { q: "Will I be charged immediately?", a: "Yes, billing starts as soon as you upgrade. You'll get immediate access to all features." },
    { q: "Can I switch plans?", a: "Yes, you can upgrade or downgrade at any time. Contact support and we'll help you switch." },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Choose the right plan for you</h1>
        <p className="text-muted text-lg max-w-xl mx-auto">Unlock powerful features to grow your reputation and convert more visitors.</p>
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
                  Current Plan
                </div>
              )}

              {/* Most Popular badge */}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                  Most Popular
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
                        <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">SOON</span>
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
        <h2 className="text-xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
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
