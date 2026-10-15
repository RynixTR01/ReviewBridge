import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { buildReviewAnalysisPrompt, parseReviewAnalysisResponse, reviewInsightError } from "@/lib/ai-review-insights";

export const maxDuration = 30;

export async function POST(request) {
  let locale = request.headers.get("x-reviewbridge-locale") === "en" ? "en" : "tr";
  const fail = (code, status) => Response.json({ error: reviewInsightError(locale, code) }, {
    status, headers: { "Cache-Control": "no-store" },
  });
  const user = await getCurrentUser();
  if (!user) return fail("sign_in", 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("invalid_request", 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("invalid_request", 403);
  if (await isRateLimited(request, `ai-review-insights:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return fail("rate_limit", 429);
  }

  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const token = process.env.NEON_AI_GATEWAY_TOKEN;
  if (!baseUrl || !token) {
    return fail("unavailable", 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return fail("invalid_request", 413);
  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return fail("invalid_request", 413);
    body = JSON.parse(rawBody);
  } catch { return fail("invalid_request", 400); }
  const sourceId = String(body?.sourceId || "");
  locale = body?.locale === "en" ? "en" : "tr";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) {
    return fail("invalid_source", 400);
  }

  const source = await queryOne(
    `SELECT s.id, s.business_name
     FROM public.sources s
     JOIN public.users owner_profile ON owner_profile.id = s.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
     WHERE s.id = $1 AND (s.user_id = $2 OR (owner_profile.plan = 'agency' AND m.user_id = $2))
     LIMIT 1`,
    [sourceId, user.id],
  );
  if (!source) return fail("missing_source", 404);

  const reviews = await query(
    `SELECT rating, body, reviewed_at
     FROM public.reviews
     WHERE source_id = $1 AND rating BETWEEN 1 AND 5 AND body IS NOT NULL AND length(trim(body)) > 0
       AND reviewed_at >= now() - interval '365 days'
     ORDER BY reviewed_at DESC
     LIMIT 60`,
    [source.id],
  );
  const prompt = buildReviewAnalysisPrompt(reviews, locale);
  const reviewCount = prompt.messages[1].content ? JSON.parse(prompt.messages[1].content).reviews.length : 0;
  if (reviewCount < 3) return fail("insufficient_reviews", 422);

  try {
    const gatewayUrl = new URL(baseUrl);
    if (gatewayUrl.protocol !== "https:") return fail("unavailable", 503);
    const endpoint = new URL("/v1/chat/completions", gatewayUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(prompt),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      console.error("Neon AI Gateway request failed.", { status: response.status });
      return fail("unavailable", 502);
    }
    const result = parseReviewAnalysisResponse(await response.json());
    return Response.json({ sourceName: source.business_name, ...result, evidenceCount: reviewCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI review analysis failed.", { name: error?.name });
    return fail("unavailable", 502);
  }
}
