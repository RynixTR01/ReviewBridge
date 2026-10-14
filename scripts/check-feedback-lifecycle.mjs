import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const expectedHost = process.argv[2];
const url = process.env.DATABASE_URL;
if (!url || !expectedHost || new URL(url).hostname !== expectedHost || expectedHost.includes("pooler")) {
  throw new Error("An explicit temporary-branch direct connection is required.");
}
const sql = neon(url);
const userId = randomUUID();
const token = randomBytes(24).toString("hex");
try {
  await sql.query("INSERT INTO public.users (id, email, plan) VALUES ($1, $2, 'free')", [userId, `feedback-check-${token}@example.invalid`]);
  const created = await sql.query(
    `WITH new_source AS (
       INSERT INTO public.sources (user_id, platform, place_id, business_name, sync_status, last_synced_at)
       VALUES ($1, 'first_party', $2, 'Test source', 'done', now()) RETURNING id
     )
     INSERT INTO public.widgets (user_id, source_id, theme, max_reviews, show_badge, embed_token,
       user_plan, source_place_id, source_platform)
     SELECT $1, id, 'light', 5, true, $3, 'free', $2, 'first_party' FROM new_source
     RETURNING source_id`,
    [userId, token, randomUUID().replaceAll("-", "")],
  );
  assert.equal(created.length, 1);
  const sourceId = created[0].source_id;
  const feedback = await sql.query(
    `INSERT INTO public.feedback_submissions (source_id, reviewer_name, rating, body, consented_at)
     VALUES ($1, 'Test customer', 3, 'A useful test review.', now()) RETURNING id, status`,
    [sourceId],
  );
  assert.equal(feedback[0].status, "pending");
  const id = feedback[0].id;
  const before = await sql.query("SELECT count(*)::int AS count FROM public.reviews WHERE source_id = $1", [sourceId]);
  assert.equal(before[0].count, 0, "pending feedback must not appear in public reviews");
  const approved = await sql.query(
    `WITH candidate AS (
       SELECT f.* FROM public.feedback_submissions f JOIN public.sources s ON s.id = f.source_id
       WHERE f.id = $1 AND s.user_id = $2 AND s.platform = 'first_party' AND f.status = 'pending'
     ), published AS (
       INSERT INTO public.reviews (id, source_id, external_review_id, reviewer_name, rating, body, reviewed_at)
       SELECT id, source_id, 'feedback:' || id::text, reviewer_name, rating, body, created_at
       FROM candidate RETURNING id
     )
     UPDATE public.feedback_submissions SET status = 'approved', moderated_at = now()
     WHERE id IN (SELECT id FROM published) RETURNING id`,
    [id, userId],
  );
  assert.equal(approved.length, 1);
  const publicReviews = await sql.query("SELECT rating FROM public.reviews WHERE source_id = $1", [sourceId]);
  assert.deepEqual(publicReviews.map((row) => row.rating), [3]);
  const removed = await sql.query(
    `WITH removed AS (
       DELETE FROM public.reviews r USING public.feedback_submissions f, public.sources s
       WHERE r.id = f.id AND f.id = $1 AND f.source_id = s.id
         AND s.user_id = $2 AND s.platform = 'first_party' AND f.status = 'approved'
       RETURNING r.id
     )
     UPDATE public.feedback_submissions SET status = 'rejected', moderated_at = now()
     WHERE id IN (SELECT id FROM removed) RETURNING id`,
    [id, userId],
  );
  assert.equal(removed.length, 1);
  const after = await sql.query("SELECT count(*)::int AS count FROM public.reviews WHERE source_id = $1", [sourceId]);
  assert.equal(after[0].count, 0);
  process.stdout.write("Feedback moderation lifecycle passed.\n");
} finally {
  await sql.query("DELETE FROM public.users WHERE id = $1", [userId]);
}
