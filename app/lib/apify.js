import { isGoogleMapsUrl } from "./extractPlaceId.js";
import { normalizeReviewRating } from "../../lib/review-rating.js";

export const APIFY_ACTORS = {
  GOOGLE_MAPS: 'Xb8osYTtOjlsgI6k9',
  TRUSTPILOT: 'memo23~trustpilot-scraper-ppe'
};

export function buildGoogleMapsActorInput(identifier, mapsUrl) {
  const url = typeof mapsUrl === "string" ? mapsUrl.trim() : "";
  if (isGoogleMapsUrl(url)) {
    return { startUrls: [{ url }] };
  }

  const value = typeof identifier === "string" ? identifier.trim() : "";
  if (/^(?:ChIJ|GhIJ)[A-Za-z0-9_-]{23}$/.test(value)) {
    return { placeIds: [value] };
  }

  const cidMatch = value.match(/^0x[0-9a-f]+:0x([0-9a-f]+)$/i);
  if (cidMatch) {
    const cid = BigInt("0x" + cidMatch[1]).toString(10);
    return { startUrls: [{ url: "https://www.google.com/maps?cid=" + cid }] };
  }

  throw new Error("Google Maps input must be a supported Maps URL or Place ID.");
}

/**
 * Builds the webhook URL with the sourceId; the shared secret is sent in a request header.
 * @param {string} sourceId The ID of the source being synced.
 * @returns {string} The fully formed webhook URL.
 */
export function buildWebhookUrl(sourceId) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!appUrl) throw new Error("Missing webhook URL configuration");

  const normalizedAppUrl = appUrl.replace(/\/+$/, "");
  return normalizedAppUrl + "/api/apify-webhook?sourceId=" + encodeURIComponent(sourceId);
}

/**
 * Starts an asynchronous Apify run.
 * @param {string} actorId The ID of the Apify actor.
 * @param {object} input The input payload for the actor (e.g. { placeIds: [...], maxReviews: 20 } for Google Maps).
 * @param {string} sourceId The ID of the source being synced. Used to build the webhook URL.
 * @returns {Promise<string>} The Apify run ID.
 */
export async function startApifyRun(actorId, input, sourceId) {
  const token = process.env.APIFY_API_TOKEN;
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  if (!token) throw new Error("APIFY_API_TOKEN is not set");
  if (!secret) throw new Error("APIFY_WEBHOOK_SECRET is not set");

  const webhook = {
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'],
    requestUrl: buildWebhookUrl(sourceId),
    headersTemplate: JSON.stringify({ 'x-webhook-secret': secret })
  };
  const encodedWebhooks = Buffer.from(JSON.stringify([webhook]), 'utf8').toString('base64');
  const url = "https://api.apify.com/v2/acts/" + encodeURIComponent(actorId) +
    "/runs?webhooks=" + encodeURIComponent(encodedWebhooks);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // Apify receives only the actor input here; webhook definitions belong in
    // the Base64-encoded webhooks query parameter above.
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("Failed to start Apify run: " + response.status + " " + errText);
  }

  const data = await response.json();
  return data.data.id;
}

/**
 * Fetches details about a specific Apify run.
 * @param {string} runId The ID of the Apify run.
 * @returns {Promise<object>} Run details, including defaultDatasetId and status.
 */
export async function getRunDetails(runId) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set");

  const url = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch run details: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetches dataset items for a completed Apify run.
 * @param {string} runId The ID of the Apify run.
 * @returns {Promise<Array>} The items in the dataset.
 */
export async function getDatasetItems(runId) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set");

  const runDetails = await getRunDetails(runId);
  const datasetId = runDetails.defaultDatasetId;
  
  if (!datasetId) {
     throw new Error(`No defaultDatasetId found for run ${runId}`);
  }

  const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch dataset items: ${response.status} ${errText}`);
  }

  return response.json();
}

/**
 * Maps raw dataset items to our internal review format.
 * @param {Array} items Raw items from Apify.
 * @param {string} platform 'google' or 'trustpilot'.
 * @returns {Array} Array of mapped review objects.
 */
export function mapApifyReviews(items, platform) {
  if (!Array.isArray(items)) return [];

  if (platform === 'google') {
    return items.map(item => {
      let parsedDate = new Date().toISOString();
      let dateEstimated = true;
      if (item.publishedAtDate) {
        try {
          parsedDate = new Date(item.publishedAtDate).toISOString();
          dateEstimated = false;
        } catch (e) {
          // fallback to current date if parsing fails
        }
      }
      return {
        review_id: item.reviewId || null,
        avatar_url: item.reviewerPhotoUrl || null,
        review_url: item.reviewUrl || null,
        reviewer_name: item.name || 'Anonymous',
        rating: normalizeReviewRating(item.stars) ?? normalizeReviewRating(item.rating),
        body: item.text || null,
        reviewed_at: parsedDate,
        review_date_estimated: dateEstimated,
      };
    }).filter((review) => review.rating !== null);
  } else if (platform === 'trustpilot') {
    return items.map(item => {
      let parsedDate = new Date().toISOString();
      let dateEstimated = true;
      if (item.dates?.publishedDate) {
         try {
           parsedDate = new Date(item.dates.publishedDate).toISOString();
           dateEstimated = false;
         } catch(e) {}
      }
      return {
        review_id: item.id || item.reviewId || null,
        avatar_url: item.consumer?.avatarUrl || item.consumer?.avatar?.imageUrl || null,
        review_url: item.reviewUrl || item.url || null,
        reviewer_name: item.consumer?.displayName || 'Anonymous',
        rating: normalizeReviewRating(item.rating),
        body: item.text || null,
        reviewed_at: parsedDate,
        review_date_estimated: dateEstimated,
      };
    }).filter((review) => review.rating !== null);
  }
  return [];
}
