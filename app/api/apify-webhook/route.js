import { getDatasetItems, mapApifyReviews, APIFY_ACTORS } from "@/app/lib/apify";
import { query, queryOne } from "@/lib/db";
import { finishSyncHistory } from "@/lib/sync-history";
import { createStableReviewId } from "@/lib/review-id";
import { scheduleSyncRetry } from "@/lib/sync-retry";
import { isValidApifyWebhookSecret } from "@/lib/apify-webhook-auth";
import { createApifyWebhookHandler } from "@/app/lib/apify-webhook-handler";

export const POST = createApifyWebhookHandler({
  getDatasetItems,
  mapApifyReviews,
  APIFY_ACTORS,
  query,
  queryOne,
  finishSyncHistory,
  createStableReviewId,
  scheduleSyncRetry,
  isValidApifyWebhookSecret,
});
