-- Daily scheduled refresh is opt-in per source to avoid unexpected provider usage.
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sources_auto_sync_due
  ON public.sources (last_synced_at)
  WHERE auto_sync_enabled = true;
