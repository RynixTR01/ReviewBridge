-- Idempotency ledger for signed Lemon Squeezy webhook deliveries.
-- The signed raw-body hash is unique for a retried delivery.
CREATE TABLE IF NOT EXISTS public.lemonsqueezy_webhook_events (
  event_hash char(64) PRIMARY KEY,
  event_name text NOT NULL,
  user_key text NOT NULL DEFAULT '',
  subscription_id text NOT NULL DEFAULT '',
  event_at timestamptz NOT NULL DEFAULT NOW(),
  received_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lemonsqueezy_webhook_events
  ADD COLUMN IF NOT EXISTS event_at timestamptz NOT NULL DEFAULT NOW();
ALTER TABLE public.lemonsqueezy_webhook_events
  ADD COLUMN IF NOT EXISTS user_key text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_lemonsqueezy_events_subscription_received
  ON public.lemonsqueezy_webhook_events (subscription_id, received_at DESC);
