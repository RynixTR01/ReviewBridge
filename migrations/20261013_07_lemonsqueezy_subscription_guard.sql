-- Prevent old expired events for a replaced subscription from downgrading a current plan.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id text;
