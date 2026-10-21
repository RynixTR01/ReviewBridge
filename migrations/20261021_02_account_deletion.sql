-- Kept outside the user cascade so interrupted identity deletion is retryable.
-- No email, session, token, or original account content is retained here.
CREATE TABLE IF NOT EXISTS public.account_deletions (
  identity_hash text PRIMARY KEY CHECK (length(identity_hash) = 64),
  requested_at timestamptz NOT NULL DEFAULT now(),
  identity_deleted_at timestamptz,
  last_attempt_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
