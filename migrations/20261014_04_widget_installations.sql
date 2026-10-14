-- Observed browser loads, not proof that the account owns the host.
CREATE TABLE IF NOT EXISTS public.widget_installations (
  widget_id uuid NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  site_host text NOT NULL CHECK (char_length(site_host) BETWEEN 4 AND 253),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  views integer NOT NULL DEFAULT 1 CHECK (views >= 0),
  PRIMARY KEY (widget_id, site_host)
);
CREATE INDEX IF NOT EXISTS idx_widget_installations_recent
  ON public.widget_installations (last_seen_at DESC);
