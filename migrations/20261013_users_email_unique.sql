-- Auth migration depends on a verified, case-insensitive email mapping so
-- existing ReviewBridge profile IDs and their owned records stay unchanged.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON public.users (lower(email));
