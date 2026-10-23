import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { submitSupportTicket } from "./actions";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "İletişim", "Contact")} — ReviewBridge` };
}

export default async function ContactPage({ searchParams }) {
  const locale = await getLocale();
  const state = await searchParams;
  const sent = state?.sent === "1";
  const error = state?.error;
  const errorText = error === "rate"
    ? t(locale, "Çok fazla istek gönderdiniz. Lütfen yarın tekrar deneyin.", "Too many requests. Please try again tomorrow.")
    : error === "unavailable"
    ? t(locale, "Mesaj kaydedilemedi. Lütfen daha sonra tekrar deneyin.", "Your message could not be saved. Please try again later.")
    : error
    ? t(locale, "E-posta, konu ve mesaj alanlarını kontrol edin.", "Please check the email, subject, and message fields.")
    : null;

  return <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
    <Link href="/" className="text-sm text-primary hover:underline">← {t(locale, "Ana sayfa", "Home")}</Link>
    <h1 className="mt-6 text-3xl font-bold text-foreground">{t(locale, "Bizimle iletişime geçin", "Contact us")}</h1>
    <p className="mt-2 text-muted">{t(locale, "Sorunuzu veya destek talebinizi buradan iletin. Yanıtı verdiğiniz e-posta adresine göndereceğiz.", "Send your question or support request here. We will reply to the email address you provide.")}</p>
    {sent ? <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">{t(locale, "Mesajınız alındı. Teşekkürler.", "Your message was received. Thank you.")}</div> : null}
    {errorText ? <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{errorText}</div> : null}
    <form action={submitSupportTicket} className="mt-8 space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-7">
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="block text-sm font-medium text-foreground">{t(locale, "E-posta adresiniz", "Your email")}<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-lg border border-border px-3 py-2" /></label>
      <label className="block text-sm font-medium text-foreground">{t(locale, "Konu", "Subject")}<input name="subject" required minLength={3} maxLength={160} className="mt-2 w-full rounded-lg border border-border px-3 py-2" /></label>
      <label className="block text-sm font-medium text-foreground">{t(locale, "Mesajınız", "Your message")}<textarea name="message" required minLength={10} maxLength={4000} rows={7} className="mt-2 w-full rounded-lg border border-border px-3 py-2" /></label>
      <p className="text-xs text-muted">{t(locale, "Bu form yalnızca destek için kullanılır. Kişisel bilgilerin işlenmesi için gizlilik politikasına bakın.", "This form is for support only. See the privacy policy for how personal data is handled.")} <Link href="/privacy" className="underline">{t(locale, "Gizlilik politikası", "Privacy policy")}</Link></p>
      <button type="submit" className="rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:opacity-90">{t(locale, "Mesaj gönder", "Send message")}</button>
    </form>
  </main>;
}
