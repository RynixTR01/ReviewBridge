-- Prevent the public signup flow from triggering arbitrary or repeated emails.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
