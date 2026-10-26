import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AddSourcePage() {
  const locale = await getLocale();
  return <main className="mx-auto max-w-xl space-y-5">
    <Link href="/dashboard" className="text-sm font-medium text-primary underline">{t(locale, "Kaynaklara dön", "Back to sources")}</Link>
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">{t(locale, "Yorum kaynağı ekleyin", "Add a review source")}</h1>
      <p className="mt-3 text-sm text-muted">{t(locale,
        "Google ve Trustpilot yorum aktarımı, içerik kullanım izinleri doğrulanana kadar duraklatıldı. Bu platformlardan yorum kopyalamadan müşterilerinizden doğrudan geri bildirim toplayabilir ve onayladığınız yorumları widget'ınızda gösterebilirsiniz.",
        "Google and Trustpilot review imports are paused until content permissions are verified. You can collect feedback directly from customers and display approved responses in your widget without copying reviews from those platforms.")}</p>
      <Link href="/dashboard/feedback" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">{t(locale, "Doğrudan geri bildirim oluştur", "Create direct feedback")}</Link>
    </section>
  </main>;
}
