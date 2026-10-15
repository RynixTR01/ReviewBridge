import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import UnsubscribeButton from "./UnsubscribeButton";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Anket davetlerini durdur", "Stop survey invitations")} — ReviewBridge`, robots: { index: false, follow: false } };
}

export default async function SurveyUnsubscribePage({ params }) {
  const { token } = await params;
  const locale = await getLocale();
  if (!/^[a-f0-9]{48}$/.test(String(token || ""))) {
    return <main className="mx-auto mt-16 max-w-lg rounded-2xl border border-border bg-white p-6"><h1 className="text-xl font-bold text-foreground">{t(locale, "Bağlantı geçersiz", "Invalid link")}</h1></main>;
  }
  return <main className="mx-auto mt-16 max-w-lg rounded-2xl border border-border bg-white p-6 sm:p-8">
    <h1 className="text-xl font-bold text-foreground">{t(locale, "Anket davetlerini durdur", "Stop survey invitations")}</h1>
    <p className="mt-2 text-sm text-muted">{t(locale, "Bu düğmeye basarsanız ilgili işletmeden gelecekte anket daveti almazsınız. Bağlantıyı açmak tek başına aboneliği değiştirmez.", "Choose the button below to stop future survey invitations from this business. Opening this page alone does not change your preference.")}</p>
    <UnsubscribeButton token={token} locale={locale} />
  </main>;
}
