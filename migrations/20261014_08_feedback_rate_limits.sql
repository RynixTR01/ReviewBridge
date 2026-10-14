CREATE TABLE IF NOT EXISTS public.feedback_daily_limits (
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  quota_day date NOT NULL,
  submission_count integer NOT NULL DEFAULT 0 CHECK (submission_count BETWEEN 0 AND 100),
  PRIMARY KEY (source_id, quota_day)
);

INSERT INTO public.feedback_daily_limits (source_id, quota_day, submission_count)
SELECT source_id, CURRENT_DATE, LEAST(count(*)::int, 100)
FROM public.feedback_submissions
WHERE created_at >= CURRENT_DATE
GROUP BY source_id
ON CONFLICT (source_id, quota_day) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_feedback_daily_limits_day
  ON public.feedback_daily_limits (quota_day);
