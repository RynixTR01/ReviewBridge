import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import WidgetEditor from "./WidgetEditor";
import { PLAN_LIMITS } from "@/lib/plans";

export const metadata = {
  title: "Customize Widget — ReviewBridge",
};

export default async function WidgetPage({ params }) {
  // Await the params object in Next.js 15
  const resolvedParams = await params;
  const widgetId = resolvedParams.widgetId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch widget with source
  const { data: widget, error: widgetError } = await supabase
    .from("widgets")
    .select("*, sources(*)")
    .eq("id", widgetId)
    .eq("user_id", user.id)
    .single();

  if (widgetError || !widget) {
    redirect("/dashboard");
  }

  // Fetch some reviews to show in preview
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("source_id", widget.source_id)
    .order("reviewed_at", { ascending: false })
    .limit(20);

  // Get user plan
  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan || "free";
  const limits = PLAN_LIMITS[plan];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sources
        </Link>
        <div className="w-px h-4 bg-border"></div>
        <span className="text-sm font-semibold text-foreground bg-muted-bg px-2 py-1 rounded-md">
          {widget.sources.business_name}
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Customize Widget</h1>
        <p className="text-muted mt-1">Design your widget and get the embed code.</p>
      </div>

      <WidgetEditor 
        widget={widget} 
        source={widget.sources} 
        reviews={reviews || []} 
        planLimits={limits} 
      />
    </div>
  );
}
