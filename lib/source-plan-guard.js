import { PLAN_LIMITS } from "./plans.js";
import { expireBillingForUser } from "./billing-state.js";

const LOCK_USER_SQL = `
  SELECT id
  FROM public.users
  WHERE id = $1
  FOR UPDATE
`;

function databaseLimit(plan) {
  const limit = PLAN_LIMITS[plan]?.maxSources ?? PLAN_LIMITS.free.maxSources;
  return Number.isFinite(limit) ? limit : 2_147_483_647;
}

function buildAdmissionQuery(widget) {
  const widgetCte = widget ? `,
    inserted_widget AS (
      INSERT INTO public.widgets
        (user_id, source_id, theme, max_reviews, show_badge, embed_token,
         user_plan, source_place_id, source_platform, source_maps_url)
      SELECT $1, inserted_source.id, 'light', 5, true, $13,
             profile.plan, $3, $2, $14
      FROM inserted_source CROSS JOIN profile
      RETURNING id, source_id
    )` : "";
  const widgetJoin = widget
    ? "LEFT JOIN inserted_widget ON inserted_widget.source_id = inserted_source.id"
    : "";
  const widgetColumn = widget ? "inserted_widget.id AS widget_id" : "NULL::uuid AS widget_id";

  return `
    WITH profile AS MATERIALIZED (
      SELECT id,
             CASE WHEN plan IN ('free', 'pro', 'agency') THEN plan ELSE 'free' END AS plan
      FROM public.users
      WHERE id = $1
    ), source_count AS MATERIALIZED (
      SELECT count(*)::int AS count
      FROM public.sources
      WHERE user_id = $1
    ), duplicate_source AS MATERIALIZED (
      SELECT id
      FROM public.sources
      WHERE user_id = $1 AND platform = $2
        AND (($2 = 'trustpilot' AND lower(place_id) = lower($3))
          OR ($2 IN ('google', 'first_party') AND place_id = $3))
      LIMIT 1
    ), inserted_source AS (
      INSERT INTO public.sources
        (user_id, platform, place_id, business_name, total_score,
         total_reviews_count, last_synced_at, sync_started_at, sync_status)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
      FROM profile CROSS JOIN source_count
      WHERE source_count.count < CASE profile.plan
        WHEN 'agency' THEN $12::int
        WHEN 'pro' THEN $11::int
        ELSE $10::int
      END
        AND NOT EXISTS (SELECT 1 FROM duplicate_source)
      RETURNING *
    )${widgetCte}
    SELECT profile.plan, source_count.count AS source_count,
           duplicate_source.id AS duplicate_id, inserted_source.*,
           ${widgetColumn}
    FROM profile
    CROSS JOIN source_count
    LEFT JOIN duplicate_source ON true
    LEFT JOIN inserted_source ON true
    ${widgetJoin}
  `;
}

/**
 * Serializes source admissions for one account. Locking the profile row and
 * checking/inserting in the following READ COMMITTED statement ensures a
 * concurrent request sees the first request's committed source count and plan.
 */
export async function createSourceWithinPlanLimit(database, {
  userId,
  platform,
  placeId,
  businessName,
  totalScore = null,
  totalReviewsCount = null,
  lastSyncedAt = null,
  syncStartedAt = null,
  syncStatus = "done",
  widget = null,
}) {
  const params = [
    userId,
    platform,
    placeId,
    businessName,
    totalScore,
    totalReviewsCount,
    lastSyncedAt,
    syncStartedAt,
    syncStatus,
    databaseLimit("free"),
    databaseLimit("pro"),
    databaseLimit("agency"),
  ];
  if (widget) params.push(widget.embedToken, widget.sourceMapsUrl || null);

  const [, admissionRows] = await database.transaction([
    database.query(LOCK_USER_SQL, [userId]),
    database.query(buildAdmissionQuery(widget), params),
  ], { isolationLevel: "ReadCommitted" });

  const row = admissionRows?.[0];
  if (!row) return { status: "missing_user" };

  const plan = PLAN_LIMITS[row.plan] ? row.plan : "free";
  const limit = PLAN_LIMITS[plan].maxSources;
  const count = Number(row.source_count) || 0;
  if (row.duplicate_id) return { status: "duplicate", plan, count, limit };
  if (row.id) {
    return {
      status: "created",
      plan,
      count,
      limit,
      source: row,
      widgetId: row.widget_id || null,
    };
  }
  if (count >= limit) return { status: "limit", plan, count, limit };
  return { status: "unavailable", plan, count, limit };
}

export async function getSourcePlanStatus(database, sourceId) {
  const [owner] = await database.query("SELECT user_id FROM public.sources WHERE id = $1", [sourceId]);
  if (!owner) return null;
  await expireBillingForUser(database, owner.user_id);
  const rows = await database.query(
    `SELECT u.plan,
            (SELECT count(*)::int + 1
             FROM public.sources older
             WHERE older.user_id = s.user_id
               AND (older.created_at < s.created_at
                 OR (older.created_at = s.created_at AND older.id < s.id))) AS source_position
     FROM public.sources s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [sourceId],
  );
  const row = rows?.[0];
  if (!row) return null;

  const plan = PLAN_LIMITS[row.plan] ? row.plan : "free";
  const limit = PLAN_LIMITS[plan].maxSources;
  const sourcePosition = Number(row.source_position);
  return {
    plan,
    limit,
    sourcePosition,
    active: limit === Infinity || sourcePosition <= limit,
  };
}
