// Explicit projections avoid accidentally exporting newly added credentials.
// All predicates derive from the authenticated owner, never a request user ID.
export const ACCOUNT_EXPORT_QUERIES = [
  ["profile", `SELECT id,email,full_name,plan,created_at,sync_failure_emails_enabled,usage_limit_emails_enabled
    FROM public.users WHERE id=$1 ORDER BY id`],
  ["sources", `SELECT id,platform,place_id,business_name,created_at,last_synced_at,total_score,total_reviews_count,sync_status,auto_sync_enabled,brand_id
    FROM public.sources WHERE user_id=$1 ORDER BY id`],
  ["reviews", `SELECT r.id,r.source_id,r.reviewer_name,r.rating,r.body,r.reviewed_at,r.created_at,r.external_review_id
    FROM public.reviews r JOIN public.sources s ON s.id=r.source_id WHERE s.user_id=$1 ORDER BY r.id`],
  ["widgets", `SELECT id,source_id,theme,max_reviews,show_badge,created_at,smart_filter,show_review_button,layout,minimum_rating,sort_order,
    include_keywords,exclude_keywords,date_from,date_to,widget_locale,widget_title,background_color,text_color,accent_color,
    show_reviewer_avatar,show_reviewed_date,allowed_domains,show_rating_summary,font_family,card_density,corner_style,
    experiment_enabled,experiment_label_tr,experiment_label_en
    FROM public.widgets WHERE user_id=$1 ORDER BY id`],
  ["review_preferences", `SELECT p.widget_id,p.review_id,p.state,p.created_at FROM public.widget_review_preferences p
    JOIN public.widgets w ON w.id=p.widget_id WHERE w.user_id=$1 ORDER BY p.widget_id,p.review_id`],
  ["feedback", `SELECT f.id,f.source_id,f.reviewer_name,f.rating,f.body,f.status,f.consented_at,f.created_at,f.moderated_at
    FROM public.feedback_submissions f JOIN public.sources s ON s.id=f.source_id WHERE s.user_id=$1 ORDER BY f.id`],
  ["surveys", `SELECT id,title,survey_type,created_at FROM public.customer_surveys WHERE user_id=$1 ORDER BY id`],
  ["survey_responses", `SELECT r.id,r.survey_id,r.score,r.comment,r.created_at FROM public.customer_survey_responses r
    JOIN public.customer_surveys s ON s.id=r.survey_id WHERE s.user_id=$1 ORDER BY r.id`],
  ["campaigns", `SELECT id,survey_id,title,locale,scheduled_at,status,recipient_count,consent_confirmed_at,created_at
    FROM public.survey_invitation_campaigns WHERE user_id=$1 ORDER BY id`],
  ["invitations", `SELECT id,campaign_id,recipient_email,status,attempt_count,sent_at,created_at
    FROM public.survey_invitations WHERE user_id=$1 ORDER BY id`],
  ["brands", `SELECT id,name,website_domain,created_at FROM public.agency_brands WHERE owner_user_id=$1 ORDER BY id`],
  ["memberships", `SELECT m.brand_id,m.user_id,m.role,m.created_at FROM public.agency_brand_members m
    JOIN public.agency_brands b ON b.id=m.brand_id WHERE b.owner_user_id=$1 OR m.user_id=$1 ORDER BY m.brand_id,m.user_id`],
  ["brand_invitations", `SELECT i.id,i.brand_id,i.email,i.role,i.created_at,i.expires_at,i.accepted_at,i.revoked_at
    FROM public.agency_brand_invitations i JOIN public.agency_brands b ON b.id=i.brand_id
    WHERE b.owner_user_id=$1 ORDER BY i.id`],
  ["notifications", `SELECT id,type,source_id,source_name,created_at,read_at FROM public.user_notifications WHERE user_id=$1 ORDER BY id`],
  ["sync_history", `SELECT h.id,h.source_id,h.status,h.started_at,h.completed_at,h.reviews_count
    FROM public.sync_history h JOIN public.sources s ON s.id=h.source_id WHERE s.user_id=$1 ORDER BY h.id`],
  ["daily_metrics", `SELECT m.widget_id,m.metric_date,m.views,m.review_source_clicks,m.review_cta_clicks,m.goal_completions
    FROM public.widget_daily_metrics m JOIN public.widgets w ON w.id=m.widget_id WHERE w.user_id=$1 ORDER BY m.widget_id,m.metric_date`],
  ["experiment_metrics", `SELECT m.widget_id,m.experiment_id,m.variant,m.metric_date,m.views,m.cta_clicks,m.goal_completions
    FROM public.widget_experiment_daily m JOIN public.widgets w ON w.id=m.widget_id
    WHERE w.user_id=$1 ORDER BY m.widget_id,m.experiment_id,m.variant,m.metric_date`],
  ["installations", `SELECT i.widget_id,i.site_host,i.first_seen_at,i.last_seen_at,i.views FROM public.widget_installations i
    JOIN public.widgets w ON w.id=i.widget_id WHERE w.user_id=$1 ORDER BY i.widget_id,i.site_host`],
];

export async function* accountExportChunks(query, userId) {
  if (!userId) throw new Error("Authenticated account required.");
  yield `{"format":"reviewbridge-account-export-v1","started_at":${JSON.stringify(new Date().toISOString())},"records":[\n`;
  let first = true;
  for (const [section, sql] of ACCOUNT_EXPORT_QUERIES) {
    for (let offset = 0; ; offset += 250) {
      const rows = await query(`${sql} LIMIT 250 OFFSET $2`, [userId, offset]);
      for (const data of rows) {
        yield `${first ? "" : ",\n"}${JSON.stringify({ section, data })}`;
        first = false;
      }
      if (rows.length < 250) break;
    }
  }
  yield `\n],"complete":true,"finished_at":${JSON.stringify(new Date().toISOString())}}`;
}
