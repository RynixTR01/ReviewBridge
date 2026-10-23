import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { isSupportAdmin } from "@/lib/support-tickets";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { resolveSupportTicket } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Destek talepleri", "Support requests")} — ReviewBridge` };
}

export default async function SupportInbox() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  if (!isSupportAdmin(user)) notFound();
  const tickets = await query(
    `SELECT id,email,subject,message,created_at FROM public.support_tickets
     WHERE status='open' ORDER BY created_at ASC LIMIT 100`,
  );
  return <main className="mx-auto max-w-3xl px-4 py-10">
    <h1 className="text-2xl font-bold text-foreground">{t(locale, "Açık destek talepleri", "Open support requests")}</h1>
    <p className="mt-2 text-sm text-muted">{t(locale, "Yanıtı e-posta istemcinizden gönderin; yanıtladıktan sonra talebi kapatın. Buradan otomatik e-posta gönderilmez.", "Reply from your email client, then resolve the request. No email is sent automatically from here.")}</p>
    {tickets.length === 0 ? <p className="mt-8 text-muted">{t(locale, "Açık talep yok.", "No open requests.")}</p> : null}
    <div className="mt-6 space-y-4">{tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-foreground">{ticket.subject}</h2><p className="text-sm text-muted">{ticket.email} · {new Date(ticket.created_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</p></div><a href={`mailto:${encodeURIComponent(ticket.email)}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`} className="text-sm font-medium text-primary underline">{t(locale, "Yanıtla", "Reply")}</a></div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm text-foreground">{ticket.message}</p>
      <form action={resolveSupportTicket} className="mt-5"><input type="hidden" name="id" value={ticket.id} /><button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted-bg">{t(locale, "Yanıtlandı olarak işaretle", "Mark resolved")}</button></form>
    </article>)}</div>
  </main>;
}
