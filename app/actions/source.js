"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/plans";
import crypto from "crypto";
import { extractPlaceId, isGoogleMapsUrl } from "@/app/lib/extractPlaceId";
import { extractTrustpilotDomain } from "@/app/lib/trustpilot";
import { buildGoogleMapsActorInput, startApifyRun, APIFY_ACTORS } from "@/app/lib/apify";
import { startSyncHistory, attachSyncRun, finishSyncHistory } from "@/lib/sync-history";
import { createStableReviewId } from "@/lib/review-id";
import { normalizeReviewRating } from "@/lib/review-rating";
import { sendUsageLimitAlert } from "@/lib/usage-limit-alerts";
import { createSourceLimitNotification } from "@/lib/notifications";
import { getLocale } from "@/lib/i18n-server";
import { isConnectedReviewSource } from "@/lib/review-source-catalog";

export async function addSourceAction(prevState, formData) {
  if (!formData) {
    // If someone calls this directly without formData, or due to a signature mismatch
    formData = prevState;
    if (!formData || !formData.get) {
       return { error: "Form verisi eksik." };
    }
  }

  const platform = formData.get("platform");
  const rawInput = String(formData.get("identifier") || "").trim();
  if (!isConnectedReviewSource(platform)) {
    return { error: "Desteklenmeyen platform." };
  }
  let identifier = platform === "google"
    ? extractPlaceId(rawInput)
    : extractTrustpilotDomain(rawInput)?.toLowerCase() || null;
  if (platform === "google" && !identifier && isGoogleMapsUrl(rawInput)) {
    identifier = rawInput;
  }
  
  if (!identifier) {
    return {
      error: platform === "google"
        ? "Bu Google Haritalar işletme bağlantısı desteklenmiyor. İşletmeyi Google Haritalar’da açıp Maps bağlantısını veya Place ID’yi yapıştırın. Google arama bağlantıları (google.com/search) çalışmaz."
        : "Geçerli bir Trustpilot bağlantısı veya şirket alan adı girin.",
    };
  }

  if (!platform || !identifier) {
    return { error: "Platform ve bağlantı bilgisi gereklidir." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const existingSource = await queryOne(
    `SELECT id FROM public.sources
     WHERE user_id = $1 AND platform = $2
       AND (($2 = 'trustpilot' AND lower(place_id) = lower($3))
         OR ($2 = 'google' AND place_id = $3))
     LIMIT 1`,
    [user.id, platform, identifier]
  );
  if (existingSource) {
    return { error: "Bu işletme zaten kaynaklarınıza ekli. Mevcut kaynağı panelden kullanabilir veya eşitleyebilirsiniz." };
  }

  // Check plan limits
  const profile = await queryOne(
    "SELECT plan FROM public.users WHERE id = $1",
    [user.id]
  );

  const plan = profile?.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const sourceCount = await queryOne(
    "SELECT count(*)::int AS count FROM public.sources WHERE user_id = $1",
    [user.id]
  );
  const count = sourceCount?.count ?? 0;


  if (count >= limits.maxSources) {
    await createSourceLimitNotification({ userId: user.id, count, limit: limits.maxSources });
    await sendUsageLimitAlert({ userId: user.id, count, limit: limits.maxSources, locale: await getLocale() });
    return { error: `${plan} planında en fazla ${limits.maxSources} kaynak ekleyebilirsiniz. Daha fazla kaynak için planınızı yükseltin.` };
  }

  // 1. Call SerpAPI (or similar service) to verify and fetch reviews
  let businessName = "Bilinmeyen işletme";
  let reviewsList = [];
  let totalScore = null;
  let totalReviewsCount = null;
  
  const reviewsToFetch = (plan === 'pro' || plan === 'agency') ? 40 : 20;


  try {
    // Note: Apify actor applies to Google Maps.
    // For this example, we mock the fetch if APIFY_API_TOKEN isn't set.
    if (process.env.APIFY_API_TOKEN) {
      if (platform === "google") {
        // For Google, we skip the synchronous fetch. The webhook will handle it.
        businessName = "Google işletmesi (eşitleniyor...)";
        // We will call startApifyRun *after* creating the source in the DB.
      } else if (platform === "trustpilot") {
        const companyDomain = extractTrustpilotDomain(identifier);
        if (!companyDomain) {
          return { error: 'Şirket alan adı bulunamadı. Trustpilot bağlantınızı veya şirket alan adınızı girin (ör. apple.com).' };
        }

        // Override identifier with clean domain for DB storage
        identifier = companyDomain;

        const tpResponse = await fetch(
          'https://api.apify.com/v2/acts/memo23~trustpilot-scraper-ppe/run-sync-get-dataset-items?token=' + 
          process.env.APIFY_API_TOKEN + '&timeout=60',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startUrls: ['https://www.trustpilot.com/review/' + companyDomain],
              maxResults: reviewsToFetch
            })
          }
        );
        if (!tpResponse.ok) {
          throw new Error(`Trustpilot provider returned ${tpResponse.status}`);
        }
        const tpData = await tpResponse.json();

        if (Array.isArray(tpData)) {
          console.log("Trustpilot response length:", tpData.length);
          
          businessName = companyDomain;
          reviewsList = tpData.map(item => ({
            review_id: item.id || item.reviewId || null,
            reviewer_name: item.consumer?.displayName || 'Anonymous',
            rating: item.rating || 0,
            body: item.text || null,
            reviewed_at: item.dates?.publishedDate || new Date().toISOString(),
            review_date_estimated: !item.dates?.publishedDate,
          }));
        } else {
          console.error("Trustpilot actor failed:", tpData);
          return { error: "Trustpilot yanıtı okunamadı. Bağlantıyı kontrol edip yeniden deneyin." };
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock data for development when APIFY_API_TOKEN is missing
        businessName = platform === "google" ? "Google Coffee Shop" : "Trustpilot Store";
        reviewsList = [
          { reviewer_name: "Alice", rating: 5, body: "Absolutely amazing experience!", reviewed_at: new Date().toISOString() },
          { reviewer_name: "Bob", rating: 4, body: "Good, but could be better.", reviewed_at: new Date().toISOString() },
          { reviewer_name: "Charlie", rating: 5, body: "Highly recommended.", reviewed_at: new Date().toISOString() }
        ];
      } else {
        return { error: "Apify anahtarı yapılandırılmamış. Ortam değişkenlerine APIFY_API_TOKEN ekleyin." };
      }
    }
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return { error: "Yorumlar alınamadı. Kaynak eklenmedi; lütfen daha sonra yeniden deneyin." };
  }

  // 2. Insert into sources
  const startsAsyncGoogleSync = platform === "google" && Boolean(process.env.APIFY_API_TOKEN);
  let newSource;
  try {
    newSource = await queryOne(
      `INSERT INTO public.sources
         (user_id, platform, place_id, business_name, total_score,
          total_reviews_count, last_synced_at, sync_started_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.id,
        platform,
        identifier,
        businessName,
        totalScore,
        totalReviewsCount,
        startsAsyncGoogleSync ? null : new Date().toISOString(),
        startsAsyncGoogleSync ? new Date().toISOString() : null,
        startsAsyncGoogleSync ? "pending" : "done",
      ]
    );
  } catch (sourceError) {
    console.error("Insert source error:", sourceError);
    return { error: "Kaynak veritabanına kaydedilemedi." };
  }

  const historyId = await startSyncHistory(newSource.id);
  // If Google, start the async Apify run now that we have the source.id
  if (startsAsyncGoogleSync) {
    try {
      const runId = await startApifyRun(
        APIFY_ACTORS.GOOGLE_MAPS,
        {
          ...buildGoogleMapsActorInput(identifier, rawInput),
          maxReviews: reviewsToFetch,
          reviewsSort: 'newest'
        },
        newSource.id
      );

      await query(
        "UPDATE public.sources SET apify_run_id = $1 WHERE id = $2",
        [runId, newSource.id]
      );
      await attachSyncRun(historyId, runId);
    } catch (err) {
      console.error("Failed to start initial Google sync:", err);
      await query(
        `UPDATE public.sources
         SET sync_status = $1, last_sync_error = $2,
             apify_run_id = NULL, sync_started_at = NULL
         WHERE id = $3`,
        ["error", "Arka plan eşitlemesi başlatılamadı", newSource.id]
      );
      await finishSyncHistory({ historyId, sourceId: newSource.id, status: "error", errorMessage: "Eşitleme başlatılamadı." });
    }
  }

  // 3. Insert reviews (only for synchronous platforms like Trustpilot)
  const reviewsToInsert = reviewsList.slice(0, reviewsToFetch).map((r) => ({
    source_id: newSource.id,
    external_review_id: createStableReviewId(platform, r),
    reviewer_name: r.reviewer_name || "Anonymous",
    rating: normalizeReviewRating(r.rating),
    body: r.body || "",
    reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date().toISOString(),
  })).filter((review) => review.rating !== null);

  let reviewsSaved = true;
  if (reviewsToInsert.length > 0) {
    const values = [];
    const placeholders = reviewsToInsert.map((review, index) => {
      const offset = index * 6;
      values.push(
        newSource.id,
        review.external_review_id,
        review.reviewer_name,
        review.rating,
        review.body,
        review.reviewed_at
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    });
    try {
      await query(
        `INSERT INTO public.reviews (source_id, external_review_id, reviewer_name, rating, body, reviewed_at)
         VALUES ${placeholders.join(", ")}
         ON CONFLICT DO NOTHING`,
        values
      );
    } catch (reviewsError) {
      console.error("Insert reviews error:", reviewsError);
      reviewsSaved = false;
      await query(
        `UPDATE public.sources SET sync_status = 'error',
           last_sync_error = 'Yorumlar veritabanına kaydedilemedi.' WHERE id = $1`,
        [newSource.id]
      );
      await finishSyncHistory({ historyId, sourceId: newSource.id, status: "error", errorMessage: "Yorumlar veritabanına kaydedilemedi." });
    }
  }

  if (!startsAsyncGoogleSync && reviewsSaved) {
    await finishSyncHistory({ historyId, sourceId: newSource.id, status: "done", reviewsCount: reviewsToInsert.length });
  }

  // 4. Create default widget
  const embedToken = crypto.randomUUID().replace(/-/g, "");
  let newWidget;
  try {
    newWidget = await queryOne(
      `INSERT INTO public.widgets
         (user_id, source_id, theme, max_reviews, show_badge, embed_token,
          user_plan, source_place_id, source_platform, source_maps_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user.id,
        newSource.id,
        "light",
        5,
        true,
        embedToken,
        plan,
        identifier,
        platform,
        rawInput,
      ]
    );
  } catch (widgetError) {
    console.error("Widget creation error:", widgetError);
  }

  revalidatePath("/dashboard");
  
  // Warning disabled as actors are now fully synchronous


  // Redirect to the newly created widget customization page
  if (newWidget) {
    redirect(`/dashboard/widget/${newWidget.id}`);
  } else {
    redirect("/dashboard");
  }
}

export async function setSourceAutoSyncAction(formData) {
  const sourceId = formData.get("sourceId")?.toString();
  const enabled = formData.get("enabled") === "true";
  const user = await getCurrentUser();
  if (!user || !sourceId) return { error: "Not authenticated" };

  try {
    const updated = await queryOne(
      "UPDATE public.sources SET auto_sync_enabled = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
      [enabled, sourceId, user.id],
    );
    if (!updated) return { error: "Source not found." };
  } catch (error) {
    console.error("Auto sync preference update failed:", error);
    return { error: "Could not update automatic sync setting." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
