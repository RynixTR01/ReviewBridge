import Link from "next/link";

export const metadata = {
  title: "Terms of Service — ReviewBridge",
  description: "ReviewBridge terms of service. Read the terms and conditions for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-border bg-white/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">R</span>
            ReviewBridge
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted mb-10">Last updated: April 2026</p>

        <div className="prose-custom space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ReviewBridge, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>ReviewBridge is a SaaS platform that allows you to display Google Maps and Trustpilot reviews on your website through embeddable widgets. We fetch publicly available review data and display it according to your customization preferences.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription Plans</h2>
            <p>ReviewBridge offers Free, Pro, and Agency subscription plans. Each plan has specific feature limits as described on our pricing page. We reserve the right to modify pricing with 30 days advance notice.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Free Plan</strong> — 1 source, up to 10 reviews displayed, light theme only</li>
              <li><strong>Pro Plan ($7/month)</strong> — Up to 5 sources, unlimited reviews, all themes, badge removal</li>
              <li><strong>Agency Plan ($19/month)</strong> — Unlimited sources, unlimited reviews, priority support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cancellation and Refunds</h2>
            <p>You may cancel your subscription at any time from your dashboard. Upon cancellation, you will retain access to paid features until the end of your current billing period. We do not offer refunds for partial billing periods.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the service for any unlawful purpose</li>
              <li>Manipulate, fabricate, or misrepresent reviews</li>
              <li>Attempt to bypass plan limitations or access controls</li>
              <li>Reverse engineer or attempt to extract the source code</li>
              <li>Resell the service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>ReviewBridge and its original content, features, and functionality are owned by ReviewBridge and are protected by intellectual property laws. The review content displayed through our widgets belongs to the respective reviewers and platforms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>ReviewBridge is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your right to use the service will immediately cease and your data may be deleted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>If you have any questions about these terms, please contact us at <a href="mailto:support@reviewbridge.app" className="text-primary hover:underline">support@reviewbridge.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
