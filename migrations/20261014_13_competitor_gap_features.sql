-- Additive features for customer invitations, client workspaces, and conversion goals.

ALTER TABLE public.agency_brand_members
  DROP CONSTRAINT IF EXISTS agency_brand_members_role_check;
ALTER TABLE public.agency_brand_members
  ADD CONSTRAINT agency_brand_members_role_check
  CHECK (role IN ('viewer', 'editor', 'client'));

CREATE TABLE IF NOT EXISTS public.agency_brand_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.agency_brands(id) ON DELETE CASCADE,
  email text CHECK (email IS NULL OR char_length(email) BETWEEN 6 AND 254),
  email_fingerprint char(64) NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'client')),
  token_hash char(64) NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_brand_invitations_pending_email_key
  ON public.agency_brand_invitations (brand_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agency_brand_invitations_expiry
  ON public.agency_brand_invitations (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.survey_invitation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.customer_surveys(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  locale text NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sent', 'partial', 'cancelled')),
  recipient_count integer NOT NULL DEFAULT 0 CHECK (recipient_count BETWEEN 0 AND 100),
  consent_confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_invitation_campaign_due
  ON public.survey_invitation_campaigns (scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_survey_invitation_campaign_user
  ON public.survey_invitation_campaigns (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.survey_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.survey_invitation_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_email text,
  recipient_fingerprint char(64) NOT NULL,
  unsubscribe_token text,
  unsubscribe_token_hash char(64) NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'unsubscribed', 'cancelled')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, recipient_fingerprint),
  CHECK ((status IN ('pending', 'failed') AND recipient_email IS NOT NULL)
      OR (status IN ('sent', 'unsubscribed', 'cancelled') AND recipient_email IS NULL)),
  CHECK ((status = 'pending' AND unsubscribe_token IS NOT NULL)
      OR (status = 'failed' AND last_error_code = 'delivery_unknown' AND unsubscribe_token IS NOT NULL)
      OR (status IN ('failed', 'sent', 'unsubscribed', 'cancelled') AND unsubscribe_token IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_survey_invitations_due
  ON public.survey_invitations (next_attempt_at, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_survey_invitations_user
  ON public.survey_invitations (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.survey_invitation_suppressions (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_fingerprint char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipient_fingerprint)
);

ALTER TABLE public.widget_daily_metrics
  ADD COLUMN IF NOT EXISTS goal_completions integer NOT NULL DEFAULT 0
    CHECK (goal_completions >= 0);
ALTER TABLE public.widget_experiment_daily
  ADD COLUMN IF NOT EXISTS goal_completions integer NOT NULL DEFAULT 0
    CHECK (goal_completions >= 0);
