-- Anonymous aggregate counts only. No visitor identifiers, cookies, or IPs are stored.
CREATE TABLE IF NOT EXISTS public.widget_daily_metrics (
  widget_id uuid NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  review_source_clicks integer NOT NULL DEFAULT 0 CHECK (review_source_clicks >= 0),
  review_cta_clicks integer NOT NULL DEFAULT 0 CHECK (review_cta_clicks >= 0),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (widget_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_widget_daily_metrics_date
  ON public.widget_daily_metrics (metric_date DESC);
