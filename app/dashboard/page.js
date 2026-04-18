import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyncButton from "./SyncButton";

export const metadata = {
  title: "Dashboard — ReviewBridge",
};

function StarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch sources and their corresponding widget
  const { data: sources, error } = await supabase
    .from("sources")
    .select("*, widgets(id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sources:", error);
  }

  // Fetch user profile for plan and email
  const { data: profile } = await supabase
    .from("users")
    .select("plan, email")
    .eq("id", user.id)
    .single();

  const userPlan = profile?.plan || "free";
  const userEmail = profile?.email || user.email || "";

  // Fetch review stats per source
  const sourceIds = (sources || []).map((s) => s.id);
  let reviewStats = {};
  let totalReviews = 0;
  let lastSyncDate = null;

  if (sourceIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("source_id, rating")
      .in("source_id", sourceIds);

    if (reviews) {
      totalReviews = reviews.length;

      // Group by source_id
      for (const r of reviews) {
        if (!reviewStats[r.source_id]) {
          reviewStats[r.source_id] = { count: 0, totalRating: 0 };
        }
        reviewStats[r.source_id].count++;
        reviewStats[r.source_id].totalRating += r.rating;
      }

      // Calculate averages
      for (const sid in reviewStats) {
        reviewStats[sid].avg = (reviewStats[sid].totalRating / reviewStats[sid].count).toFixed(1);
      }
    }

    // Get last sync date
    const syncDates = (sources || [])
      .filter((s) => s.last_synced_at)
      .map((s) => new Date(s.last_synced_at));
    if (syncDates.length > 0) {
      lastSyncDate = new Date(Math.max(...syncDates));
    }
  }

  const hasSources = sources && sources.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Sources</h1>
            <p className="text-muted mt-1">Manage your connected review profiles.</p>
          </div>
          {userPlan === "pro" && (
            <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-primary to-secondary text-white rounded-full uppercase tracking-wide">Pro</span>
          )}
          {userPlan === "agency" && (
            <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full uppercase tracking-wide">Agency</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {userPlan === "free" && (
            <a
              href={`${process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_URL}?checkout[email]=${encodeURIComponent(userEmail)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Upgrade to Pro
            </a>
          )}
          {(userPlan === "pro" || userPlan === "agency") && (
            <a
              href="https://reviewbridge.lemonsqueezy.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted border border-border px-3 py-2 rounded-lg hover:bg-muted-bg hover:text-foreground transition-colors"
            >
              Manage subscription
            </a>
          )}
          <Link
            href="/dashboard/add-source"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-hover shadow-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add new source
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      {hasSources && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalReviews}</p>
            <p className="text-xs text-muted mt-1">Synced Reviews</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{sources.length}</p>
            <p className="text-xs text-muted mt-1">Sources Connected</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {lastSyncDate
                ? lastSyncDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—"}
            </p>
            <p className="text-xs text-muted mt-1">Last Sync</p>
          </div>
        </div>
      )}

      {!hasSources ? (
        <div className="bg-white border text-center border-border border-dashed rounded-2xl p-16">
          <div className="w-20 h-20 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No sources yet</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Add your first Google or Trustpilot listing to get started.
            Your reviews will appear here automatically.
          </p>
          <Link
            href="/dashboard/add-source"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-xl text-lg hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add your first source
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sources.map((source) => {
            const widgetId = source.widgets?.[0]?.id;
            const isGoogle = source.platform === "google";
            const stats = reviewStats[source.id];
            const syncedCount = stats?.count || 0;
            const googleScore = source.total_score;
            const googleTotal = source.total_reviews_count;
            
            return (
              <div key={source.id} className="bg-white border border-border shadow-sm rounded-xl p-5 transition-all hover:shadow-md hover:border-primary/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isGoogle ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                      {isGoogle ? (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.5l-6 3 2.5-6.5-5-4 6.5-.5L12 3l2 6.5 6.5.5-5 4 2.5 6.5z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{source.business_name}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs font-medium text-muted capitalize px-2 py-0.5 bg-muted-bg rounded-md">
                          {source.platform}
                        </span>

                        {/* Google rating badge */}
                        {googleScore && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                            <StarIcon className="w-3.5 h-3.5 text-amber-400" />
                            {Number(googleScore).toFixed(1)}
                          </span>
                        )}

                        {/* Google total reviews */}
                        {googleTotal && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground px-2 py-0.5 bg-muted-bg rounded-md">
                            {googleTotal} Google reviews
                          </span>
                        )}

                        {/* Synced count */}
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground px-2 py-0.5 bg-green-50 text-green-700 rounded-md">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {syncedCount} synced
                        </span>

                        <span className="text-xs text-muted">
                          Synced: {source.last_synced_at ? new Date(source.last_synced_at).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Sync now button */}
                    <SyncButton sourceId={source.id} />

                    {/* Customize widget */}
                    {widgetId && (
                      <Link
                        href={`/dashboard/widget/${widgetId}`}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted border border-border px-3 py-2 rounded-lg hover:bg-muted-bg hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                        </svg>
                        Customize
                      </Link>
                    )}

                    {/* Get embed code */}
                    {widgetId ? (
                      <Link
                        href={`/dashboard/widget/${widgetId}`}
                        className="inline-flex items-center justify-center gap-1.5 text-sm bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Embed code
                      </Link>
                    ) : (
                      <span className="text-sm text-danger font-medium">Widget configuring...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
