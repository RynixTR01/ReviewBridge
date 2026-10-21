-- Additive: existing users retain their plan until their provider state is read.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS billing_status text,
  ADD COLUMN IF NOT EXISTS billing_test_mode boolean,
  ADD COLUMN IF NOT EXISTS billing_store_id text,
  ADD COLUMN IF NOT EXISTS billing_customer_id text,
  ADD COLUMN IF NOT EXISTS billing_variant_id text,
  ADD COLUMN IF NOT EXISTS billing_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS billing_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_reconcile_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_checkout_url text,
  ADD COLUMN IF NOT EXISTS billing_checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_checkout_claim uuid,
  ADD COLUMN IF NOT EXISTS billing_checkout_plan text,
  ADD COLUMN IF NOT EXISTS billing_event_rank integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_billing_reconcile
  ON public.users (billing_checked_at NULLS FIRST)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_billing_subscription
  ON public.users (lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL AND lemonsqueezy_subscription_id <> '';
