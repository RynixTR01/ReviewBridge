-- Additive controls for review widget filtering, layout, locale, and appearance.
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'list',
  ADD COLUMN IF NOT EXISTS minimum_rating smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order text NOT NULL DEFAULT 'newest',
  ADD COLUMN IF NOT EXISTS include_keywords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS exclude_keywords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_from date,
  ADD COLUMN IF NOT EXISTS date_to date,
  ADD COLUMN IF NOT EXISTS widget_locale text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS widget_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS background_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS show_reviewer_avatar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_reviewed_date boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_layout_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_layout_check CHECK (layout IN ('list', 'grid', 'carousel'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_minimum_rating_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_minimum_rating_check CHECK (minimum_rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_sort_order_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_sort_order_check CHECK (sort_order IN ('newest', 'highest', 'lowest'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_locale_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_locale_check CHECK (widget_locale IN ('auto', 'tr', 'en'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.widget_review_preferences (
  widget_id uuid NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('hidden', 'pinned')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (widget_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_review_preferences_widget_state
  ON public.widget_review_preferences (widget_id, state);
