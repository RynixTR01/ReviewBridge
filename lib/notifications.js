import { query } from "@/lib/db";

async function insertNotification({ userId, type, sourceId = null, sourceName = null, metadata = {}, dedupeKey }) {
  if (!userId || !dedupeKey) return;
  try {
    await query(
      `INSERT INTO public.user_notifications
         (user_id, type, source_id, source_name, metadata, dedupe_key)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [userId, type, sourceId, sourceName, JSON.stringify(metadata), dedupeKey],
    );
  } catch (error) {
    console.warn("Could not save dashboard notification.", error?.message);
  }
}

export async function createSourceLimitNotification({ userId, count, limit }) {
  await insertNotification({
    userId,
    type: "source_limit",
    metadata: { sourceCount: Number(count), sourceLimit: Number(limit) },
    dedupeKey: `source-limit:${new Date().toISOString().slice(0, 7)}`,
  });
}

export async function createFeedbackNotification({ userId, sourceId, sourceName, submissionId }) {
  await insertNotification({
    userId,
    type: "feedback_received",
    sourceId,
    sourceName,
    dedupeKey: `feedback:${submissionId}`,
  });
}

export async function createSurveyResponseNotification({ userId, surveyTitle, surveyType, responseId, score }) {
  await insertNotification({
    userId,
    type: "survey_response",
    sourceName: surveyTitle,
    metadata: { surveyType, score: Number(score) },
    dedupeKey: `survey-response:${responseId}`,
  });
}

export async function createTerminalSyncFailureNotification(sourceId, historyId = null) {
  if (!sourceId) return;
  try {
    await query(
      `INSERT INTO public.user_notifications
         (user_id, type, source_id, source_name, dedupe_key)
       SELECT s.user_id, 'sync_failed', s.id, s.business_name, 'sync-failed:' || h.id::text
       FROM public.sources s
       JOIN LATERAL (
         SELECT candidate.id, candidate.started_at
         FROM public.sync_history candidate
         WHERE candidate.source_id = s.id
           AND candidate.status = 'error'
           AND ($2::uuid IS NULL OR candidate.id = $2)
         ORDER BY candidate.started_at DESC
         LIMIT 1
       ) h ON true
       WHERE s.id = $1
         AND s.sync_status = 'error'
         AND s.sync_retry_after IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.sync_history later
           WHERE later.source_id = s.id AND later.started_at > h.started_at
         )
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [sourceId, historyId],
    );
  } catch (error) {
    console.warn("Could not save terminal sync notification.", error?.message);
  }
}
