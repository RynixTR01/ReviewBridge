import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import WidgetEditor from "./WidgetEditor";
import { PLAN_LIMITS } from "@/lib/plans";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Bileşeni özelleştir", "Customize widget")} — ReviewBridge` };
}

export default async function WidgetPage({ params }) {
  const locale = await getLocale();
  // Await the params object in Next.js 15
  const resolvedParams = await params;
  const widgetId = resolvedParams.widgetId;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch widget with source
  const widget = await queryOne(
    `SELECT w.*, row_to_json(s) AS sources
     FROM public.widgets AS w
     JOIN public.sources AS s ON s.id = w.source_id AND s.user_id = w.user_id
     JOIN public.users owner_profile ON owner_profile.id = w.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
     WHERE w.id = $1 AND (w.user_id = $2 OR (owner_profile.plan = 'agency' AND m.role = 'editor'))`,
    [widgetId, user.id]
  );

  if (!widget) {
    redirect("/dashboard");
  }

  // Fetch some reviews to show in preview
  const reviews = await query(
    `SELECT * FROM public.reviews
     WHERE source_id = $1
     ORDER BY reviewed_at DESC
     LIMIT 200`,
    [widget.source_id]
  );

  // Get user plan
  const profile = await queryOne(
    "SELECT plan FROM public.users WHERE id = $1",
    [widget.user_id]
  );

  const plan = profile?.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const moderationRows = await query(
    "SELECT review_id, state FROM public.widget_review_preferences WHERE widget_id = $1",
    [widget.id]
  );
  const moderation = Object.fromEntries((moderationRows || []).map((item) => [item.review_id, item.state]));
  const embedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app").origin;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t(locale, "Kaynaklara dön", "Back to sources")}
        </Link>
        <div className="w-px h-4 bg-border"></div>
        <span className="text-sm font-semibold text-foreground bg-muted-bg px-2 py-1 rounded-md">
          {widget.sources.business_name}
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t(locale, "Bileşeni özelleştir", "Customize widget")}</h1>
        <p className="text-muted mt-1">{t(locale, "Bileşeninizi tasarlayın ve yerleştirme kodunu alın.", "Design your widget and get the embed code.")}</p>
      </div>

      <WidgetEditor 
        widget={widget} 
        source={widget.sources} 
        reviews={reviews || []} 
        planLimits={limits} 
        moderation={moderation}
        embedOrigin={embedOrigin}
      />
    </div>
  );
}
