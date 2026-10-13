-- Additive sync history; existing source state remains authoritative.
CREATE TABLE IF NOT EXISTS public.sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  apify_run_id text,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'error')),
  started_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  reviews_count integer NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_sync_history_source_started
  ON public.sync_history (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_run_id
  ON public.sync_history (apify_run_id) WHERE apify_run_id IS NOT NULL;
