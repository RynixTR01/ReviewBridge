export const CLAIM_SYNC_ALERT_SQL = `UPDATE public.sync_history h SET alert_claimed_at = now()
  FROM public.sources s, public.users u
  WHERE h.id = (
    SELECT candidate.id FROM public.sync_history candidate
    JOIN public.sources source ON source.id = candidate.source_id
    JOIN public.users recipient ON recipient.id = source.user_id
    WHERE candidate.status = 'error' AND candidate.alert_sent_at IS NULL
      AND (candidate.alert_claimed_at IS NULL OR candidate.alert_claimed_at < now() - interval '30 minutes')
      AND recipient.sync_failure_emails_enabled = true
      AND source.sync_status = 'error' AND source.sync_retry_after IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.sync_history later
        WHERE later.source_id = candidate.source_id AND later.started_at > candidate.started_at
      )
    ORDER BY candidate.completed_at LIMIT 1
    FOR UPDATE OF candidate SKIP LOCKED
  )
  AND s.id = h.source_id AND u.id = s.user_id
  RETURNING h.id, u.email, s.business_name, s.id AS source_id`;
