import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import FeedbackForm from "./FeedbackForm";

export default async function CollectFeedbackPage({ params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token || "")) notFound();
  const source = await queryOne("SELECT business_name FROM public.sources WHERE platform = 'first_party' AND place_id = $1", [token]);
  if (!source) notFound();
  const locale = await getLocale();
  return <main className="mx-auto max-w-xl px-4 py-12">
    <h1 className="mb-2 text-2xl font-bold text-foreground">{source.business_name}</h1>
    <p className="mb-6 text-sm text-muted">{t(locale, "Deneyiminizi paylaşın. Yorumunuz yalnızca onayınız ve işletmenin incelemesi sonrasında yayınlanır.", "Share your experience. Your feedback is published only with your consent and after the business reviews it.")}</p>
    <FeedbackForm token={token} />
  </main>;
}
