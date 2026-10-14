-- Customer-submitted feedback belongs to the account owner and is never
-- presented as a Google, Trustpilot, or other third-party platform review.
ALTER TABLE public.sources DROP CONSTRAINT IF EXISTS sources_platform_check;
ALTER TABLE public.sources ADD CONSTRAINT sources_platform_check
  CHECK (platform IN ('google', 'trustpilot', 'first_party'));

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL CHECK (char_length(reviewer_name) BETWEEN 1 AND 80),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_source_created
  ON public.feedback_submissions (source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_pending
  ON public.feedback_submissions (source_id, created_at DESC)
  WHERE status = 'pending';
