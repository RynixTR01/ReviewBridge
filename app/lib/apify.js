export const APIFY_ACTORS = {
  GOOGLE_MAPS: 'Xb8osYTtOjlsgI6k9',
  TRUSTPILOT: 'memo23~trustpilot-scraper-ppe'
};

/**
 * Builds the webhook URL with the required sourceId and secret.
 * @param {string} sourceId The ID of the source being synced.
 * @returns {string} The fully formed webhook URL.
 */
export function buildWebhookUrl(sourceId) {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!appUrl || !secret) throw new Error("Missing webhook configuration");
  
  // The secret is passed via query param for now, but we will also pass it
  // as a header in the Apify webhook configuration for better security.
  return `${appUrl}/api/apify-webhook?sourceId=${sourceId}&secret=${secret}`;
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
  if (!token) throw new Error("APIFY_API_TOKEN is not set");

  const webhookUrl = buildWebhookUrl(sourceId);
  const secret = process.env.APIFY_WEBHOOK_SECRET;

  const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      webhooks: [
        {
          eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'],
          requestUrl: webhookUrl,
          // Passing secret as a custom header for better security
          headersTemplate: `{\n  "x-webhook-secret": "${secret}"\n}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to start Apify run: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.data.id; // Returns the actor run ID
}

/**
 * Fetches details about a specific Apify run.
 * @param {string} runId The ID of the Apify run.
 * @returns {Promise<object>} Run details, including defaultDatasetId and status.
 */
export async function getRunDetails(runId) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set");

  const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
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

  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
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
      if (item.publishedAtDate) {
        try {
          parsedDate = new Date(item.publishedAtDate).toISOString();
        } catch (e) {
          // fallback to current date if parsing fails
        }
      }
      return {
        review_id: item.reviewId || null,
        avatar_url: item.reviewerPhotoUrl || null,
        review_url: item.reviewUrl || null,
        reviewer_name: item.name || 'Anonymous',
        rating: item.stars || item.rating || 0,
        body: item.text || null,
        reviewed_at: parsedDate
      };
    });
  } else if (platform === 'trustpilot') {
    return items.map(item => {
      let parsedDate = new Date().toISOString();
      if (item.dates?.publishedDate) {
         try {
           parsedDate = new Date(item.dates.publishedDate).toISOString();
         } catch(e) {}
      }
      return {
        review_id: item.id || item.reviewId || null,
        avatar_url: item.consumer?.avatarUrl || item.consumer?.avatar?.imageUrl || null,
        review_url: item.reviewUrl || item.url || null,
        reviewer_name: item.consumer?.displayName || 'Anonymous',
        rating: item.rating || 0,
        body: item.text || null,
        reviewed_at: parsedDate
      };
    });
  }
  return [];
}
