import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { moderateFeedbackAction } from "@/app/actions/feedback";
import CreateFeedbackSource from "./CreateFeedbackSource";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Geri bildirim", "Feedback")} — ReviewBridge` };
}

export default async function FeedbackDashboard() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const sources = await query(
    `SELECT s.id, s.place_id, s.business_name, w.id AS widget_id,
            (SELECT count(*)::int FROM public.feedback_submissions f
             WHERE f.source_id = s.id AND f.status = 'pending') AS pending_count
     FROM public.sources s
     LEFT JOIN LATERAL (
       SELECT id FROM public.widgets WHERE source_id = s.id ORDER BY created_at LIMIT 1
     ) w ON true
     WHERE s.user_id = $1 AND s.platform = 'first_party'
     ORDER BY s.created_at DESC`,
    [user.id],
  );
  const submissions = await query(
    `SELECT f.id, f.reviewer_name, f.rating, f.body, f.status, f.created_at,
            s.business_name
     FROM public.feedback_submissions f
     JOIN public.sources s ON s.id = f.source_id
     WHERE s.user_id = $1
     ORDER BY f.created_at DESC LIMIT 100`,
    [user.id],
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(locale, "Müşteri geri bildirimi", "Customer feedback")}</h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "Kendi müşterilerinizden izinli geri bildirim toplayın ve yayınlanacak yorumları yönetin.", "Collect feedback with customer consent and choose what to publish.")}</p>
      </div>
      <CreateFeedbackSource />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Bağlantılarınız", "Your links")}</h2>
        {sources.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz bağlantı yok.", "No links yet.")}</p>}
        {sources.map((source) => (
          <div key={source.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-foreground">{source.business_name}</strong>
              <span className="text-xs text-muted">{source.pending_count} {t(locale, "bekleyen", "pending")}</span>
            </div>
            <p className="mt-2 break-all text-xs text-muted">{`${baseUrl}/collect/${source.place_id}`}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link className="text-primary underline" href={`/collect/${source.place_id}`} target="_blank">{t(locale, "Formu aç", "Open form")}</Link>
              {source.widget_id && <Link className="text-primary underline" href={`/dashboard/widget/${source.widget_id}`}>{t(locale, "Widget'ı düzenle", "Edit widget")}</Link>}
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Gelen yanıtlar", "Responses")}</h2>
        {submissions.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz yanıt yok.", "No responses yet.")}</p>}
        {submissions.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-foreground">{item.reviewer_name} · {"★".repeat(item.rating)}</strong>
              <span className="text-xs text-muted">{item.business_name} · {item.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{item.body}</p>
            <p className="mt-2 text-xs text-muted">{new Date(item.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status === "pending" && <>
                <form action={moderateFeedbackAction}><input type="hidden" name="id" value={item.id} /><button name="decision" value="approve" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white">{t(locale, "Yayınla", "Publish")}</button></form>
                <form action={moderateFeedbackAction}><input type="hidden" name="id" value={item.id} /><button name="decision" value="reject" className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground">{t(locale, "Reddet", "Reject")}</button></form>
              </>}
              {item.status === "approved" && <form action={moderateFeedbackAction}><input type="hidden" name="id" value={item.id} /><button name="decision" value="remove" className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger">{t(locale, "Yayından kaldır", "Unpublish")}</button></form>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
