import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — ReviewBridge",
  description: "ReviewBridge privacy policy. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted mb-10">Last updated: April 2026</p>

        <div className="prose-custom space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>When you create an account, we collect your email address, name, and authentication details. When you connect a Google Maps or Trustpilot listing, we fetch publicly available review data from those platforms on your behalf.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and maintain the ReviewBridge service</li>
              <li>Display reviews on your website via our embed widget</li>
              <li>Send important account-related notifications</li>
              <li>Improve and optimize our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase, which provides enterprise-grade security including encryption at rest and in transit. We do not sell, trade, or rent your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase</strong> — Database and authentication</li>
              <li><strong>Vercel</strong> — Hosting and deployment</li>
              <li><strong>Google Maps API</strong> — Fetching public review data</li>
              <li><strong>LemonSqueezy</strong> — Payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. You can delete your account from your dashboard, which will remove all associated data including connected sources, reviews, and widgets.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact Us</h2>
            <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:support@reviewbridge.app" className="text-primary hover:underline">support@reviewbridge.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
