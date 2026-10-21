import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm, NotificationPreferences, DangerZone } from "./SettingsClient";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import Link from "next/link";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Ayarlar", "Settings")} — ReviewBridge` };
}

export default async function SettingsPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await queryOne(
    "SELECT full_name, email, plan, created_at, sync_failure_emails_enabled, usage_limit_emails_enabled FROM public.users WHERE id = $1",
    [user.id]
  );

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : t(locale, "Bilinmiyor", "Unknown");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t(locale, "Ayarlar", "Settings")}</h1>
        <p className="text-muted mt-1">{t(locale, "Hesabınızı ve tercihlerinizi yönetin.", "Manage your account and preferences.")}</p>
      </div>

      <ProfileForm
        fullName={profile?.full_name || ""}
        email={profile?.email || user.email}
        memberSince={memberSince}
      />

      <NotificationPreferences
        enabled={Boolean(profile?.sync_failure_emails_enabled)}
        usageLimitEnabled={Boolean(profile?.usage_limit_emails_enabled)}
        emailConfigured={Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim())}
      />

      <section className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-bold">{t(locale, "Hesabınız ve verileriniz", "Your account and data")}</h2>
        <p className="mt-2 text-sm text-muted">{t(locale, "Profilinizin, kaynaklarınızın, yorumlarınızın, anketlerinizin ve bileşen ayarlarınızın bir kopyasını indirin.", "Download a copy of your profile, sources, reviews, surveys, and widget settings.")}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a href="/api/account/export" className="text-primary underline" download>
            {t(locale, "Verilerimi indir", "Download my data")}
          </a>
          <Link href="/dashboard/upgrade" className="text-primary underline">
            {t(locale, "Abonelik ve faturalar", "Subscription and invoices")}
          </Link>
        </div>
      </section>
      <DangerZone />
    </div>
  );
}
