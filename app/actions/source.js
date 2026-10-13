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
  let identifier = platform === "google" ? extractPlaceId(rawInput) : rawInput;
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


  // Check plan limits
  const profile = await queryOne(
    "SELECT plan FROM public.users WHERE id = $1",
    [user.id]
  );

  const plan = profile?.plan || "free";
  const limits = PLAN_LIMITS[plan];

  const sourceCount = await queryOne(
    "SELECT count(*)::int AS count FROM public.sources WHERE user_id = $1",
    [user.id]
  );
  const count = sourceCount?.count ?? 0;


  if (count >= limits.maxSources) {
    return { error: `Your ${plan} plan is limited to ${limits.maxSources} source(s). Daha fazla kaynak eklemek için planınızı yükseltin.` };
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
        const tpData = await tpResponse.json();

        if (Array.isArray(tpData)) {
          console.log("Trustpilot response length:", tpData.length);
          
          businessName = companyDomain;
          reviewsList = tpData.map(item => ({
            reviewer_name: item.consumer?.displayName || 'Anonymous',
            rating: item.rating || 0,
            body: item.text || null,
            reviewed_at: item.dates?.publishedDate || new Date().toISOString()
          }));
        } else {
          console.error("Trustpilot actor failed:", tpData);
          businessName = companyDomain;
          reviewsList = [];
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
    // Proceed without failing. Save the source with 0 reviews so we can retry syncing later.
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
  if (!startsAsyncGoogleSync) {
    await finishSyncHistory({ historyId, sourceId: newSource.id, status: "done", reviewsCount: reviewsList.length });
  }

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
    reviewer_name: r.reviewer_name || "Anonymous",
    rating: r.rating || 5,
    body: r.body || "",
    reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date().toISOString(),
  }));

  if (reviewsToInsert.length > 0) {
    const values = [];
    const placeholders = reviewsToInsert.map((review, index) => {
      const offset = index * 5;
      values.push(
        newSource.id,
        review.reviewer_name,
        review.rating,
        review.body,
        review.reviewed_at
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    });
    try {
      await query(
        `INSERT INTO public.reviews (source_id, reviewer_name, rating, body, reviewed_at)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    } catch (reviewsError) {
      console.error("Insert reviews error:", reviewsError);
    }
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
