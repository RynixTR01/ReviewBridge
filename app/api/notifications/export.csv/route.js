import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { buildNotificationCsv } from "@/lib/notification-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [notifications, locale] = await Promise.all([
    query(
      `SELECT id, type, source_id, source_name, metadata, created_at, read_at
       FROM public.user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id],
    ),
    getLocale(),
  ]);
  const csv = buildNotificationCsv(notifications, locale);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reviewbridge-notifications.csv"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
