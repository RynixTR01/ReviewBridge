import Link from "next/link";
import { queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

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
  return <main className="mx-auto w-full max-w-2xl px-4 py-12">
    <Link href="/" className="text-sm font-medium text-primary underline">← ReviewBridge</Link>
    <h1 className="mt-6 text-3xl font-bold text-foreground">{t(locale, "Sistem durumu", "System status")}</h1>
    <p className="mt-2 text-sm text-muted">{t(locale, "Bu sayfa uygulamanın veritabanına şu anda erişip erişemediğini gösterir; geçmiş çalışma süresi veya üçüncü taraf sağlayıcıların durumunu ölçmez.", "This page shows whether the app can reach its database right now. It does not measure historical uptime or third-party providers.")}</p>
    <div className={`mt-6 rounded-2xl border p-5 ${databaseReachable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`} role="status">
      <strong className={databaseReachable ? "text-green-800" : "text-red-800"}>{databaseReachable ? t(locale, "Veritabanı erişilebilir", "Database reachable") : t(locale, "Veritabanına erişilemiyor", "Database unavailable")}</strong>
      <p className="mt-1 text-xs text-muted">{t(locale, "Kontrol zamanı", "Checked at")}: {new Date().toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { timeZone: "Europe/Istanbul" })}</p>
    </div>
    <p className="mt-6 text-sm text-muted">{t(locale, "Bir sorun yaşıyorsanız birkaç dakika sonra yeniden deneyin.", "If you are having trouble, please try again in a few minutes.")}</p>
  </main>;
}
