CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  bucket_hash char(64) NOT NULL,
  window_start bigint NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (bucket_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_expires_at
  ON public.request_rate_limits (expires_at);
