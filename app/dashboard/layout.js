import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check plan
  const { data: profile } = await supabase
    .from("users")
    .select("plan, full_name")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan || "free";
  const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="min-h-screen bg-muted-bg flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
            <span className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">R</span>
            ReviewBridge
          </Link>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-light text-primary font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Sources
            </Link>
          </nav>
        </div>

        {/* Plan Info */}
        <div className="p-4 border-t border-border bg-muted-bg/50 m-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Current Plan</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {planDisplay}
            </span>
          </div>
          {plan === "free" && (
            <a
              href={`${process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL}?checkout[email]=${encodeURIComponent(user.email)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-3 block text-center bg-white border border-border text-foreground hover:border-primary hover:text-primary transition-colors text-sm font-semibold py-2 rounded-lg shadow-sm"
            >
              Upgrade to Pro
            </a>
          )}
          {(plan === "pro" || plan === "agency") && (
            <a
              href="https://app.lemonsqueezy.com/my-orders"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-3 block text-center text-xs text-muted hover:text-foreground transition-colors"
            >
              Manage subscription →
            </a>
          )}
        </div>
        
        {/* User Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium text-foreground truncate max-w-[140px]">
              {profile?.full_name || user.email}
            </div>
            <div className="text-xs text-muted truncate max-w-[140px]">
              {user.email}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="p-2 text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
