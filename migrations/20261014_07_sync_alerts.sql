ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sync_failure_emails_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.sync_history
  ADD COLUMN IF NOT EXISTS alert_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS alert_sent_at timestamptz;

-- Historical failures must not produce a batch of email when alerts are enabled.
UPDATE public.sync_history
SET alert_sent_at = now()
WHERE status = 'error' AND alert_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sync_history_unsent_alert
  ON public.sync_history (completed_at)
  WHERE status = 'error' AND alert_sent_at IS NULL;
