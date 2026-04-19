import { createClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Widget Preview — ReviewBridge",
  description: "Preview how your ReviewBridge widget will look on a real website.",
};

// Public page — no auth required
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function createStarsHtml(rating) {
  let stars = "";
  for (let i = 0; i < 5; i++) {
    const color = i < rating ? "#fbbf24" : "#d1d5db";
    stars += `<svg style="width:14px;height:14px;color:${color}" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
  }
  return stars;
}

export default async function PreviewPage({ params }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  // Fetch widget
  const { data: widget } = await supabase
    .from("widgets")
    .select("*")
    .eq("embed_token", token)
    .single();

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Widget not found</h1>
          <p className="text-gray-500">The preview link is invalid or the widget has been deleted.</p>
        </div>
      </div>
    );
  }

  const userPlan = widget.user_plan || "free";
  const reviewLimit = userPlan === "free" ? Math.min(widget.max_reviews, 10) : widget.max_reviews;
  const isSmartFilterOn = widget.smart_filter === true || widget.smart_filter === "true";
  const fetchLimit = isSmartFilterOn && userPlan !== "free" ? 50 : reviewLimit;

  // Extract place ID for review button
  function extractPlaceId(stored) {
    if (!stored) return null;
    const chijMatch = stored.match(/ChIJ[a-zA-Z0-9_-]+/);
    if (chijMatch) return chijMatch[0];
    const hexMatch = stored.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
    if (hexMatch) return hexMatch[0];
    return null;
  }

  const placeId = extractPlaceId(widget.source_place_id);
  let reviewUrl = null;
  if (widget.show_review_button && widget.source_platform === 'google' && placeId) {
    if (placeId.startsWith('ChIJ')) {
      reviewUrl = 'https://search.google.com/local/writereview?placeid=' + placeId;
    } else if (placeId.includes('0x')) {
      reviewUrl = 'https://www.google.com/maps?cid=' + placeId.split(':')[1].replace('0x', '');
    }
  }

  const { data: fetchedReviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("source_id", widget.source_id)
    .order("reviewed_at", { ascending: false })
    .limit(fetchLimit);

  let reviewsList = (fetchedReviews || []).map((r) => ({
    ...r,
    body:
      r.body && r.body !== "null" && r.body !== '"null"'
        ? r.body.trim().replace(/^"+|"+$/g, "").trim()
        : null,
  }));

  if (isSmartFilterOn && userPlan !== "free") {
    reviewsList = reviewsList.filter((r) => r.body && r.body.length > 2);
  }
  reviewsList = reviewsList.slice(0, reviewLimit);

  // Theme
  const bg = widget.theme === "dark" ? "#1f2937" : widget.theme === "minimal" ? "transparent" : "#ffffff";
  const text = widget.theme === "dark" ? "#f9fafb" : "#111827";
  const border = widget.theme === "minimal" ? "none" : widget.theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb";
  const cardBg = widget.theme === "dark" ? "#374151" : "#ffffff";
  const shadow = widget.theme === "minimal" ? "none" : "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
          <span className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            R
          </span>
          ReviewBridge
          <span className="text-xs font-normal text-gray-400 ml-2">Widget Preview</span>
        </div>
        <CopyPreviewButton token={token} />
      </header>

      {/* Fake Browser */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Browser Chrome */}
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-400 font-mono">
              yourwebsite.com
            </div>
          </div>

          {/* Fake Website Content */}
          <div className="p-6 md:p-8" style={{ backgroundColor: widget.theme === "dark" ? "#111827" : "#f9fafb" }}>
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: widget.theme === "dark" ? "#f9fafb" : "#111827" }}
            >
              Welcome to Our Store
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: widget.theme === "dark" ? "#9ca3af" : "#6b7280" }}
            >
              See what our customers are saying about us.
            </p>

            {/* Widget Rendered Inline */}
            <div
              style={{
                width: "100%",
                maxWidth: 500,
                margin: "0 auto",
                background: bg,
                borderRadius: 16,
                padding: widget.theme === "minimal" ? 0 : 20,
                boxSizing: "border-box",
              }}
            >
              {reviewsList.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: text,
                    opacity: 0.6,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  No reviews found.
                </p>
              ) : (
                reviewsList.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: cardBg,
                      border: border,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      boxShadow: shadow,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#eef2ff",
                          color: "#6366f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: 14,
                        }}
                      >
                        {r.reviewer_name?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: text,
                          }}
                        >
                          {r.reviewer_name}
                        </div>
                        <div
                          style={{ display: "flex", gap: 2, marginTop: 2 }}
                          dangerouslySetInnerHTML={{
                            __html: createStarsHtml(r.rating),
                          }}
                        />
                      </div>
                    </div>
                    {r.body && (
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: text,
                          opacity: 0.9,
                          margin: 0,
                        }}
                      >
                        {r.body}
                      </p>
                    )}
                  </div>
                ))
              )}

              {widget.show_review_button && reviewUrl && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <a 
                    href={reviewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#4285f4',
                      color: '#ffffff',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'system-ui, sans-serif'
                    }}
                  >
                    ⭐ Leave a review on Google
                  </a>
                </div>
              )}

              {widget.show_badge && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 16,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: text,
                      opacity: 0.6,
                    }}
                  >
                    Powered by ReviewBridge
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for copy button
function CopyPreviewButton({ token }) {
  return <CopyPreviewButtonClient token={token} />;
}

// We need to import this separately as a client component
import CopyPreviewButtonClient from "./CopyButton";
