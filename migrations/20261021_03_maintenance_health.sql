CREATE TABLE IF NOT EXISTS public.maintenance_job_health (
  job_name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  run_token uuid,
  started_at timestamptz,
  finished_at timestamptz,
  succeeded_at timestamptz,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','running','success','failed'))
);
INSERT INTO public.maintenance_job_health(job_name)
VALUES ('cleanup-stale-syncs'),('reconcile-billing') ON CONFLICT DO NOTHING;
