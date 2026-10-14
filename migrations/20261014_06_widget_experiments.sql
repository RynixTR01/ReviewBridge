ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS experiment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experiment_label_tr text NOT NULL DEFAULT 'Deneyimini paylaş',
  ADD COLUMN IF NOT EXISTS experiment_label_en text NOT NULL DEFAULT 'Share your experience',
  ADD COLUMN IF NOT EXISTS experiment_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.widget_experiment_daily (
  widget_id uuid NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  experiment_id uuid NOT NULL,
  variant char(1) NOT NULL CHECK (variant IN ('A', 'B')),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  cta_clicks integer NOT NULL DEFAULT 0 CHECK (cta_clicks >= 0),
  PRIMARY KEY (widget_id, experiment_id, variant, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_widget_experiment_daily_date
  ON public.widget_experiment_daily (metric_date DESC);
