import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard — ReviewBridge",
};

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

  const hasSources = sources && sources.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Sources</h1>
          <p className="text-muted mt-1">Manage your connected review profiles.</p>
        </div>
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

      {!hasSources ? (
        <div className="bg-white border text-center border-border border-dashed rounded-2xl p-12">
          <div className="w-16 h-16 bg-muted-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No sources connected</h2>
          <p className="text-muted mb-6 max-w-sm mx-auto">
            Get started by connecting your Google or Trustpilot account to fetch and display your reviews.
          </p>
          <Link
            href="/dashboard/add-source"
            className="inline-flex items-center gap-2 bg-primary text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary-hover transition-colors"
          >
            Connect your first source
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sources.map((source) => {
            const widgetId = source.widgets?.[0]?.id;
            const isGoogle = source.platform === "google";
            
            return (
              <div key={source.id} className="bg-white border border-border shadow-sm rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-primary/20">
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-medium text-muted capitalize px-2 py-0.5 bg-muted-bg rounded-md">
                        {source.platform}
                      </span>
                      <span className="text-xs text-muted">
                        Last synced: {source.last_synced_at ? new Date(source.last_synced_at).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {widgetId ? (
                    <Link
                      href={`/dashboard/widget/${widgetId}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-muted-bg text-foreground font-medium px-4 py-2 rounded-lg hover:bg-border/60 transition-colors"
                    >
                      <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Get embed code
                    </Link>
                  ) : (
                    <span className="text-sm text-danger font-medium">Widget configuring...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
