const LOCK_SOURCE_OWNER_SQL = `
  SELECT id
  FROM public.users
  WHERE id = (
    SELECT user_id FROM public.sources
    WHERE platform = 'first_party' AND place_id = $1
  )
  FOR UPDATE
`;

const SUBMIT_FEEDBACK_SQL = `
  WITH target_source AS MATERIALIZED (
    SELECT s.id, s.user_id, s.business_name,
           CASE WHEN u.plan IN ('free', 'pro', 'agency') THEN u.plan ELSE 'free' END AS plan,
           (SELECT count(*)::int + 1
            FROM public.sources older
            WHERE older.user_id = s.user_id
              AND older.platform = 'first_party'
              AND (older.created_at < s.created_at
                OR (older.created_at = s.created_at AND older.id < s.id))) AS source_position
    FROM public.sources s
    JOIN public.users u ON u.id = s.user_id
    WHERE s.platform = 'first_party' AND s.place_id = $1
  ), source_status AS MATERIALIZED (
    SELECT *, CASE plan WHEN 'agency' THEN 2147483647 WHEN 'pro' THEN 5 ELSE 1 END AS plan_limit
    FROM target_source
  ), quota AS (
    INSERT INTO public.feedback_daily_limits (source_id, quota_day, submission_count)
    SELECT id, CURRENT_DATE, 1
    FROM source_status
    WHERE source_position <= plan_limit
    ON CONFLICT (source_id, quota_day) DO UPDATE
    SET submission_count = public.feedback_daily_limits.submission_count + 1
    WHERE public.feedback_daily_limits.submission_count < 100
    RETURNING source_id
  ), submitted AS (
    INSERT INTO public.feedback_submissions
      (source_id, reviewer_name, rating, body, consented_at)
    SELECT source.id, $2, $3, $4, now()
    FROM source_status source
    JOIN quota ON quota.source_id = source.id
    RETURNING id, source_id
  )
  SELECT source.id AS source_id, source.user_id, source.business_name,
         source.source_position <= source.plan_limit AS active,
         submitted.id AS submission_id
  FROM source_status source
  LEFT JOIN submitted ON submitted.source_id = source.id
`;

/** Atomically checks the current source plan and writes a public feedback submission. */
export async function submitFirstPartyFeedbackWithinPlan(database, { token, name, rating, body }) {
  const [, rows] = await database.transaction([
    database.query(LOCK_SOURCE_OWNER_SQL, [token]),
    database.query(SUBMIT_FEEDBACK_SQL, [token, name, rating, body]),
  ], { isolationLevel: "ReadCommitted" });

  return rows?.[0] || null;
}
