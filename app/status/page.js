import Link from "next/link";
import { queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { getUptimeHistory, summarizeUptimeHours } from "@/lib/uptime-history";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Sistem durumu", "System status")} — ReviewBridge` };
}

export default async function StatusPage() {
  const locale = await getLocale();
  let databaseReachable = false;
  try {
    databaseReachable = Boolean(await queryOne("SELECT 1 AS ready"));
  } catch {
    databaseReachable = false;
  }
  const checks = await getUptimeHistory();
  const hourlyChecks = summarizeUptimeHours(checks || []);
  const successfulChecks = checks?.filter((check) => check.success).length || 0;
  const successRate = checks?.length ? Math.round((successfulChecks / checks.length) * 1000) / 10 : null;
  return <main className="mx-auto w-full max-w-2xl px-4 py-12">
    <Link href="/" className="text-sm font-medium text-primary underline">← ReviewBridge</Link>
    <h1 className="mt-6 text-3xl font-bold text-foreground">{t(locale, "Sistem durumu", "System status")}</h1>
    <p className="mt-2 text-sm text-muted">{t(locale, "Bu sayfa uygulamanın ve Neon veritabanının anlık erişimini ve GitHub tarafından kaydedilen son 7 günlük kontrolleri gösterir.", "This page shows current app and Neon database reachability and the last 7 days of checks recorded by GitHub.")}</p>
    <div className={`mt-6 rounded-2xl border p-5 ${databaseReachable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`} role="status">
      <strong className={databaseReachable ? "text-green-800" : "text-red-800"}>{databaseReachable ? t(locale, "Veritabanı erişilebilir", "Database reachable") : t(locale, "Veritabanına erişilemiyor", "Database unavailable")}</strong>
      <p className="mt-1 text-xs text-muted">{t(locale, "Kontrol zamanı", "Checked at")}: {new Date().toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { timeZone: "Europe/Istanbul" })}</p>
    </div>
    <section className="mt-6 rounded-2xl border border-border bg-white p-5" aria-labelledby="uptime-history-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="uptime-history-title" className="text-lg font-semibold text-foreground">{t(locale, "Son 7 gün", "Last 7 days")}</h2>
          <p className="mt-1 text-sm text-muted">{checks === null
            ? t(locale, "Kontrol geçmişi şu anda alınamıyor.", "Recent checks are temporarily unavailable.")
            : checks.length === 0
              ? t(locale, "Henüz tamamlanmış ölçüm yok.", "There are no completed checks yet.")
              : t(locale, `${successRate}% başarılı ölçüm · ${checks.length} kontrol`, `${successRate}% of checks passed · ${checks.length} checks`)}</p>
        </div>
        <span className="text-xs text-muted">{t(locale, "Saatlik görünüm · yaklaşık 15 dakikada bir kontrol", "Hourly view · checks run about every 15 minutes")}</span>
      </div>
      {checks?.length > 0 && <div className="mt-4 grid grid-cols-12 gap-1.5 sm:grid-cols-24" aria-label={t(locale, "Son 7 günlük saatlik sağlık görünümü", "Hourly health view for the last 7 days")}>
        {hourlyChecks.map((check) => {
          const checkedAt = new Date(check.startAt);
          const time = checkedAt.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { timeZone: "Europe/Istanbul" });
          const label = check.success === null
            ? t(locale, `${time}: kontrol kaydı yok`, `${time}: no check recorded`)
            : check.success
              ? t(locale, `${time}: ${check.count} kontrol başarılı`, `${time}: ${check.count} checks passed`)
              : t(locale, `${time}: ${check.count} kontrolden en az biri başarısız`, `${time}: at least one of ${check.count} checks failed`);
          const className = `aspect-square rounded-sm ${check.success === null ? "bg-slate-200" : check.success ? "bg-green-500" : "bg-red-500"}`;
          return check.url
            ? <a key={check.startAt} href={check.url} target="_blank" rel="noreferrer" title={label} aria-label={label} className={className} />
            : <span key={check.startAt} title={label} aria-label={label} className={className} />;
        })}
      </div>}
      <p className="mt-4 text-xs text-muted">{t(locale, "Bu görünüm son 7 günün GitHub Actions kayıtlarına dayanır; SLA garantisi değildir ve Apify/harici yorum sağlayıcılarını kapsamaz.", "This view uses GitHub Actions records from the last 7 days; it is not an SLA and does not cover Apify or external review providers.")}</p>
    </section>
    <p className="mt-6 text-sm text-muted">{t(locale, "Bir sorun yaşıyorsanız birkaç dakika sonra yeniden deneyin.", "If you are having trouble, please try again in a few minutes.")}</p>
  </main>;
}
