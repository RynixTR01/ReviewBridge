CREATE TABLE IF NOT EXISTS public.customer_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  survey_type text NOT NULL CHECK (survey_type IN ('nps', 'csat')),
  public_token text NOT NULL UNIQUE CHECK (public_token ~ '^[a-f0-9]{48}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_surveys_user_created
  ON public.customer_surveys (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.customer_surveys(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_survey_responses_survey_created
  ON public.customer_survey_responses (survey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_survey_responses_retention
  ON public.customer_survey_responses (created_at);

CREATE TABLE IF NOT EXISTS public.customer_survey_daily_limits (
  survey_id uuid NOT NULL REFERENCES public.customer_surveys(id) ON DELETE CASCADE,
  response_day date NOT NULL,
  response_count integer NOT NULL DEFAULT 0 CHECK (response_count BETWEEN 0 AND 1000),
  PRIMARY KEY (survey_id, response_day)
);

CREATE INDEX IF NOT EXISTS idx_customer_survey_daily_limits_day
  ON public.customer_survey_daily_limits (response_day);
