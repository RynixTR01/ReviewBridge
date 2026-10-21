import { getCurrentUser } from "@/lib/auth/server";
import { getNeonClient, query, queryOne } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { getSourcePlanStatus } from "@/lib/source-plan-guard";
import { buildReviewAnalysisPrompt, parseReviewAnalysisResponse, reviewInsightError, reviewInsightGeminiErrorCode } from "@/lib/ai-review-insights";

export const maxDuration = 60;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail("gemini_config", 503);
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
     WHERE s.id = $1 AND (s.user_id = $2 OR (owner_profile.plan = 'agency' AND m.role = 'editor'))
     LIMIT 1`,
    [sourceId, user.id],
  );
  if (!source) return fail("missing_source", 404);
  const entitlement = await getSourcePlanStatus(getNeonClient(), source.id);
  if (!entitlement?.active) return fail("missing_source", 404);

  const [reviews, ratingProfile] = await Promise.all([query(
    `SELECT rating, body, reviewed_at
     FROM public.reviews
     WHERE source_id = $1 AND rating BETWEEN 1 AND 5
       AND reviewed_at >= NOW() - INTERVAL '12 months'
       AND body IS NOT NULL AND length(trim(body)) > 0
     ORDER BY reviewed_at DESC NULLS LAST
     LIMIT 60`,
    [source.id],
  ), queryOne(
    `SELECT count(*)::int AS total_review_count,
       count(*) FILTER (WHERE body IS NOT NULL AND length(trim(body)) > 0)::int AS written_review_count,
       round(avg(rating)::numeric, 1) AS average_rating,
       count(*) FILTER (WHERE rating = 1)::int AS stars_1,
       count(*) FILTER (WHERE rating = 2)::int AS stars_2,
       count(*) FILTER (WHERE rating = 3)::int AS stars_3,
       count(*) FILTER (WHERE rating = 4)::int AS stars_4,
       count(*) FILTER (WHERE rating = 5)::int AS stars_5
     FROM public.reviews
     WHERE source_id = $1 AND rating BETWEEN 1 AND 5
       AND reviewed_at >= NOW() - INTERVAL '12 months'`,
    [source.id],
  )]);
  const prompt = buildReviewAnalysisPrompt(reviews, locale, ratingProfile);
  const reviewCount = prompt.reviewCount;
  if (reviewCount < 3) return fail("insufficient_reviews", 422);
  if (await isRateLimited(request, `ai-review-insights:${user.id}`, {
    limit: 5, windowMs: 60 * 60 * 1000, scope: "account", failClosed: true,
  })) return fail("rate_limit", 429);

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    if (!/^[a-zA-Z0-9._-]+$/.test(model)) return fail("gemini_setup", 503);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(prompt.request),
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
    if (!response.ok) {
      console.error("Gemini review summary request failed.", { status: response.status });
      const code = reviewInsightGeminiErrorCode(response.status);
      return fail(code, code === "gemini_rate_limit" ? 429 : code === "unavailable" ? 502 : 503);
    }
    const result = parseReviewAnalysisResponse(await response.json(), reviewCount);
    return Response.json({
      sourceName: source.business_name,
      ...result,
      evidenceCount: reviewCount,
      totalReviewCount: prompt.totalReviewCount,
      ratingProfile: prompt.ratingProfile,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI review analysis failed.", { name: error?.name });
    return fail("unavailable", 502);
  }
}
