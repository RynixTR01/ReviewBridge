ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS usage_limit_emails_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_limit_email_sent_at timestamptz;
