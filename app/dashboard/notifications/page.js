import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { getNotificationPresentation } from "@/lib/notification-copy";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notifications";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Bildirimler", "Notifications")} — ReviewBridge` };
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  let notifications = [];
  let available = true;
  try {
    notifications = await query(
      `SELECT id, type, source_id, source_name, metadata, created_at, read_at
       FROM public.user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id],
    );
  } catch (error) {
    available = false;
    console.error("Notification center is unavailable.", { code: error?.code });
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(locale, "Bildirimler", "Notifications")}</h1>
          <p className="mt-1 text-sm text-muted">{t(locale, "Eşitleme, yeni geri bildirim ve anket yanıtlarını buradan takip edin.", "Track sync issues, new feedback, and survey responses here.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {available && notifications.length > 0 && <a
            href="/api/notifications/export.csv"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
          >
            {t(locale, "Geçmişi CSV olarak indir", "Download history as CSV")}
          </a>}
          {unreadCount > 0 && <form action={markAllNotificationsReadAction}>
            <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg">
              {t(locale, "Tümünü okundu işaretle", "Mark all as read")}
            </button>
          </form>}
        </div>
      </header>

      {!available ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t(locale, "Bildirim merkezi henüz etkinleştirilemedi. Biraz sonra yeniden deneyin.", "The notification center is not available yet. Please try again later.")}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <p className="font-semibold text-foreground">{t(locale, "Şimdilik yeni bir bildirim yok.", "You are all caught up.")}</p>
          <p className="mt-1 text-sm text-muted">{t(locale, "Önemli eşitleme ve müşteri yanıtları burada görünecek.", "Important sync updates and customer responses will appear here.")}</p>
        </div>
      ) : (
        <section aria-label={t(locale, "Bildirim geçmişi", "Notification history")} className="space-y-3">
          {notifications.map((item) => {
            const presentation = getNotificationPresentation(item, locale);
            if (!presentation) return null;
            return (
              <article key={item.id} className={`rounded-xl border p-4 ${item.read_at ? "border-border bg-white" : "border-primary/30 bg-primary-light/30"}`}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-border" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-semibold text-foreground">{presentation.title}</h2>
                      <time className="text-xs text-muted" dateTime={new Date(item.created_at).toISOString()}>
                        {new Date(item.created_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-muted">{presentation.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <Link href={presentation.href} className="font-semibold text-primary hover:underline">
                        {t(locale, "Ayrıntıları aç", "View details")}
                      </Link>
                      {!item.read_at && <form action={markNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={item.id} />
                        <button className="text-muted underline underline-offset-2 hover:text-foreground">
                          {t(locale, "Okundu işaretle", "Mark as read")}
                        </button>
                      </form>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
