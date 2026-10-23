"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { getNeonClient, query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { extractPlaceId, isGoogleMapsUrl } from "@/app/lib/extractPlaceId";
import { extractTrustpilotDomain } from "@/app/lib/trustpilot";
import { buildGoogleMapsActorInput, buildTrustpilotActorInput, startApifyRun, APIFY_ACTORS } from "@/app/lib/apify";
import { startSyncHistory, attachSyncRun, finishSyncHistory } from "@/lib/sync-history";
import { createStableReviewId } from "@/lib/review-id";
import { normalizeReviewRating } from "@/lib/review-rating";
import { sendUsageLimitAlert } from "@/lib/usage-limit-alerts";
import { createSourceLimitNotification } from "@/lib/notifications";
import { getLocale } from "@/lib/i18n-server";
import { isConnectedReviewSource } from "@/lib/review-source-catalog";
import { isGoogleMapsShortUrl, resolveGoogleMapsShortUrl } from "@/app/lib/googleMapsShortUrl";
import { createSourceWithinPlanLimit, getSourcePlanStatus } from "@/lib/source-plan-guard";
import { providerAttemptLimit } from "@/lib/provider-budget";

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
  let mapsUrl = rawInput;
  if (!isConnectedReviewSource(platform)) {
    return { error: "Desteklenmeyen platform." };
  }
  let identifier = platform === "google"
    ? extractPlaceId(rawInput)
    : extractTrustpilotDomain(rawInput)?.toLowerCase() || null;
  const isGoogleShortLink = platform === "google" && isGoogleMapsShortUrl(rawInput);
  if (platform === "google" && !identifier && !isGoogleShortLink && isGoogleMapsUrl(rawInput)) {
    identifier = rawInput;
  }
  
  if (!identifier && !isGoogleShortLink) {
    return {
      error: platform === "google"
        ? "Bu Google Haritalar işletme bağlantısı desteklenmiyor. İşletmeyi Google Haritalar’da açıp Maps bağlantısını veya Place ID’yi yapıştırın. Google arama bağlantıları (google.com/search) çalışmaz."
        : "Geçerli bir Trustpilot bağlantısı veya şirket alan adı girin.",
    };
  }

  if (!platform || (!identifier && !isGoogleShortLink)) {
    return { error: "Platform ve bağlantı bilgisi gereklidir." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  if (isGoogleShortLink) {
    try {
      mapsUrl = await resolveGoogleMapsShortUrl(rawInput);
      identifier = extractPlaceId(mapsUrl) || mapsUrl;
    } catch (error) {
      console.warn("Could not resolve a Google Maps share link.", { name: error?.name });
      return {
        error: "Google Haritalar paylaşım bağlantısı açılamadı. Bağlantının herkese açık olduğundan emin olun veya Maps profil bağlantısını kullanın.",
      };
    }
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

  // 1. Prepare source metadata; provider reviews are fetched by the background sync.
  let businessName = "Bilinmeyen işletme";
  let reviewsList = [];
  let totalScore = null;
  let totalReviewsCount = null;
  
  const startsAsyncSync = Boolean(process.env.APIFY_API_TOKEN) && (platform === "google" || platform === "trustpilot");
  const attemptLimit = startsAsyncSync ? await providerAttemptLimit(user.id, user.plan) : null;
  if (attemptLimit) {
    return { error: attemptLimit === "site"
      ? "Günlük tarama kapasitesine ulaşıldı. Yarın tekrar deneyin."
      : "Bu hesap için tarama deneme sınırına ulaşıldı. Bir saat sonra yeniden deneyin." };
  }


  try {
    if (process.env.APIFY_API_TOKEN) {
      if (platform === "google") {
        businessName = "Google işletmesi (eşitleniyor...)";
      } else if (platform === "trustpilot") {
        const companyDomain = extractTrustpilotDomain(identifier);
        if (!companyDomain) {
          return { error: 'Şirket alan adı bulunamadı. Trustpilot bağlantınızı veya şirket alan adınızı girin (ör. apple.com).' };
        }

        identifier = companyDomain;
        businessName = companyDomain;
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
    console.error("Could not prepare review source.", { name: err?.name });
    return { error: "Yorumlar alınamadı. Kaynak eklenmedi; lütfen daha sonra yeniden deneyin." };
  }

  // The plan and capacity check share one serialized transaction with source
  // creation so parallel submissions cannot exceed the account's allowance.
  let admission;
  try {
    admission = await createSourceWithinPlanLimit(getNeonClient(), {
      userId: user.id,
      platform,
      placeId: identifier,
      businessName,
      totalScore,
      totalReviewsCount,
      lastSyncedAt: startsAsyncSync ? null : new Date().toISOString(),
      syncStartedAt: startsAsyncSync ? new Date().toISOString() : null,
      syncStatus: startsAsyncSync ? "pending" : "done",
    });
  } catch (sourceError) {
    console.error("Could not insert review source.", { code: sourceError?.code });
    return { error: "Kaynak veritabanına kaydedilemedi." };
  }

  if (admission.status === "duplicate") {
    return { error: "Bu işletme zaten kaynaklarınıza ekli. Mevcut kaynağı panelden kullanabilir veya eşitleyebilirsiniz." };
  }
  if (admission.status === "limit") {
    await createSourceLimitNotification({ userId: user.id, count: admission.count, limit: admission.limit });
    await sendUsageLimitAlert({ userId: user.id, count: admission.count, limit: admission.limit, locale: await getLocale() });
    return { error: `${admission.plan} planında en fazla ${admission.limit} kaynak ekleyebilirsiniz. Daha fazla kaynak için planınızı yükseltin.` };
  }
  if (admission.status !== "created") return { error: "Kaynak oluşturulamadı. Lütfen tekrar deneyin." };

  const newSource = admission.source;
  const plan = admission.plan;
  const reviewsToFetch = plan === "pro" || plan === "agency" ? 40 : 20;

  const historyId = await startSyncHistory(newSource.id);
  // Start Apify after creating the source so slow review collection stays out of the form request.
  if (startsAsyncSync) {
    try {
      const actorId = platform === "google" ? APIFY_ACTORS.GOOGLE_MAPS : APIFY_ACTORS.TRUSTPILOT;
      const actorInput = platform === "google"
        ? {
            ...buildGoogleMapsActorInput(identifier, mapsUrl),
            maxReviews: reviewsToFetch,
            reviewsSort: 'newest',
          }
        : buildTrustpilotActorInput(identifier, reviewsToFetch);
      const runId = await startApifyRun(
        actorId,
        actorInput,
        newSource.id,
        platform === "trustpilot" ? { timeoutSeconds: 600 } : undefined,
      );

      await query(
        "UPDATE public.sources SET apify_run_id = $1 WHERE id = $2",
        [runId, newSource.id]
      );
      await attachSyncRun(historyId, runId);
    } catch (err) {
      console.error(`Could not start initial ${platform} sync.`, { name: err?.name });
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

  // 3. Insert reviews for local development fallback; Apify-backed sources use the webhook.
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
      console.error("Could not save local review records.", { code: reviewsError?.code });
      reviewsSaved = false;
      await query(
        `UPDATE public.sources SET sync_status = 'error',
           last_sync_error = 'Yorumlar veritabanına kaydedilemedi.' WHERE id = $1`,
        [newSource.id]
      );
      await finishSyncHistory({ historyId, sourceId: newSource.id, status: "error", errorMessage: "Yorumlar veritabanına kaydedilemedi." });
    }
  }

  if (!startsAsyncSync && reviewsSaved) {
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
        mapsUrl,
      ]
    );
  } catch (widgetError) {
    console.error("Could not create the default widget.", { code: widgetError?.code });
  }

  revalidatePath("/dashboard");
  
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

  if (enabled) {
    const entitlement = await getSourcePlanStatus(getNeonClient(), sourceId);
    if (!entitlement?.active) return { error: "Bu kaynak mevcut plan sınırınızı aşıyor." };
  }

  try {
    const updated = await queryOne(
      "UPDATE public.sources SET auto_sync_enabled = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
      [enabled, sourceId, user.id],
    );
    if (!updated) return { error: "Source not found." };
  } catch (error) {
    console.error("Could not update automatic sync preference.", { code: error?.code });
    return { error: "Could not update automatic sync setting." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
