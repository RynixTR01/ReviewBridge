import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import SidebarNav from "./SidebarNav";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const locale = await getLocale();
  // Get user session
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let unreadNotificationCount = 0;
  try {
    const result = await queryOne(
      "SELECT count(*)::int AS count FROM public.user_notifications WHERE user_id = $1 AND read_at IS NULL",
      [user.id],
    );
    unreadNotificationCount = Number(result?.count || 0);
  } catch (error) {
    console.warn("Notification badge is unavailable.", error?.message);
  }

  const plan = user.plan || "free";
  const planDisplay = plan === "free" ? t(locale, "Ücretsiz", "Free") : plan === "agency" ? t(locale, "Ajans", "Agency") : "Pro";

  return (
    <div className="min-h-screen min-w-0 bg-muted-bg flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="sticky top-0 z-40 w-full shrink-0 bg-white border-b border-border shadow-sm md:static md:w-64 md:border-b-0 md:border-r md:shadow-none flex flex-col">
        <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
            <span className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">R</span>
            ReviewBridge
          </Link>
          <form action="/auth/signout" method="post" className="md:hidden">
            <button aria-label={t(locale, "Çıkış yap", "Sign out")} className="p-2 text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>

        <div className="p-2 md:p-4 md:flex-1">
          <SidebarNav unreadCount={unreadNotificationCount} />
        </div>

        {/* Plan Info */}
        <div className="hidden md:block p-4 border-t border-border bg-muted-bg/50 m-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t(locale, "Mevcut plan", "Current plan")}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {planDisplay}
            </span>
          </div>
          {plan === "free" && (
            <Link
              href="/dashboard/upgrade"
              className="w-full mt-3 block text-center bg-white border border-border text-foreground hover:border-primary hover:text-primary transition-colors text-sm font-semibold py-2 rounded-lg shadow-sm"
            >
              {t(locale, "Planları gör", "View plans")}
            </Link>
          )}
          {(plan === "pro" || plan === "agency") && (
            <a
              href="https://app.lemonsqueezy.com/my-orders"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-3 block text-center text-xs text-muted hover:text-foreground transition-colors"
            >
              {t(locale, "Aboneliği yönet →", "Manage subscription →")}
            </a>
          )}
        </div>
        
        {/* User Footer */}
        <div className="hidden md:flex p-4 border-t border-border items-center justify-between">
          <div className="text-sm">
            <div className="font-medium text-foreground truncate max-w-[140px]">
              {user.name || user.email}
            </div>
            <div className="text-xs text-muted truncate max-w-[140px]">
              {user.email}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button aria-label={t(locale, "Çıkış yap", "Sign out")} className="p-2 text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 pb-20 sm:p-6 md:p-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
