import { createClient } from "@supabase/supabase-js";

// We use the basic supabase-js client for public edge routes rather than the SSR client
// to ensure we make an unauthenticated request.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  if (!token) {
    return new Response("console.error('ReviewBridge: No token provided');", {
      headers: { "Content-Type": "application/javascript" },
      status: 400,
    });
  }

  // 1. Fetch widget details using the token
  const { data: widget, error: widgetError } = await supabase
    .from("widgets")
    .select("*")
    .eq("embed_token", token)
    .single();

  if (widgetError || !widget) {
    return new Response("console.error('ReviewBridge: Widget not found or invalid token');", {
      headers: { "Content-Type": "application/javascript" },
      status: 404,
    });
  }

  // 2. Fetch recent reviews for this source
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("*")
    .eq("source_id", widget.source_id)
    .order("reviewed_at", { ascending: false })
    .limit(widget.max_reviews);

  if (reviewsError) {
    console.error("Widget API: Error fetching reviews", reviewsError);
  }

  const reviewsList = reviews || [];

  // Theme settings
  const bg = widget.theme === "dark" ? "#1f2937" : widget.theme === "minimal" ? "transparent" : "#ffffff";
  const text = widget.theme === "dark" ? "#f9fafb" : "#111827";
  const border = widget.theme === "minimal" ? "none" : widget.theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb";
  const cardBg = widget.theme === "dark" ? "#374151" : "#ffffff";
  const shadow = widget.theme === "minimal" ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";

  const createStars = (rating) => {
    let stars = "";
    for (let i = 0; i < 5; i++) {
      stars += `<svg style="width:14px;height:14px;color:${i < rating ? '#fbbf24' : '#d1d5db'}" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>`;
    }
    return `<div style="display:flex;gap:2px;margin-top:2px;">${stars}</div>`;
  };

  const reviewsHtml = reviewsList.map(r => `
    <div style="background:${cardBg};border:${border};border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:${shadow};font-family:system-ui,sans-serif;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#eef2ff;color:#6366f1;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">
          ${r.reviewer_name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div>
          <div style="font-weight:600;font-size:14px;color:${text};">${r.reviewer_name}</div>
          ${createStars(r.rating)}
        </div>
      </div>
      <p style="font-size:14px;line-height:1.5;color:${text};opacity:0.9;margin:0;">"${r.body}"</p>
    </div>
  `).join('');

  const badgeHtml = widget.show_badge ? `
    <div style="text-align:center;margin-top:16px;font-family:system-ui,sans-serif;">
      <a href="https://reviewbridge.com" target="_blank" style="font-size:12px;color:${text};opacity:0.6;text-decoration:none;">
        Powered by ReviewBridge
      </a>
    </div>
  ` : '';

  // Return a self-contained JS that mounts the UI
  const emptyState = '<p style="text-align:center;color:' + text + ';opacity:0.6;font-family:system-ui,sans-serif;">No reviews found.</p>';
  const reviewsContent = reviewsList.length === 0 ? emptyState : reviewsHtml;
  
  const widgetHtml = '<div class="rb-reviews-list">' + reviewsContent + '</div>' + badgeHtml;
  const scriptPadding = widget.theme === 'minimal' ? '0' : '20px';

  const js = [
    '(function() {',
    '  var containerId = "reviewbridge-embed-' + token + '";',
    '  // Allow users to specify a container: <div id="reviewbridge-embed"></div>',
    '  var target = document.getElementById("reviewbridge-embed") || document.currentScript?.parentNode || document.body;',
    '  var wrapper = document.createElement("div");',
    '  wrapper.id = containerId;',
    '  wrapper.style.cssText = "width:100%;max-width:500px;margin:0 auto;background:' + bg + ';border-radius:16px;padding:' + scriptPadding + ';box-sizing:border-box;";',
    '  wrapper.innerHTML = ' + JSON.stringify(widgetHtml) + ';',
    '  target.appendChild(wrapper);',
    '})();'
  ].join('\n');

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
