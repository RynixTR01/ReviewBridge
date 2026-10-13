ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS show_rating_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS card_density text NOT NULL DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS corner_style text NOT NULL DEFAULT 'medium';

ALTER TABLE public.widgets DROP CONSTRAINT IF EXISTS widgets_layout_check;
ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_layout_check CHECK (layout IN ('list', 'grid', 'carousel', 'masonry'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_font_family_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_font_family_check
      CHECK (font_family IN ('system', 'arial', 'georgia'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_card_density_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_card_density_check
      CHECK (card_density IN ('compact', 'comfortable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'widgets_corner_style_check') THEN
    ALTER TABLE public.widgets ADD CONSTRAINT widgets_corner_style_check
      CHECK (corner_style IN ('small', 'medium', 'large'));
  END IF;
END $$;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS sync_retry_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_retry_after timestamptz;

ALTER TABLE public.sources DROP CONSTRAINT IF EXISTS sources_sync_retry_count_check;
ALTER TABLE public.sources
  ADD CONSTRAINT sources_sync_retry_count_check CHECK (sync_retry_count BETWEEN 0 AND 3);

CREATE INDEX IF NOT EXISTS idx_sources_due_sync_retry
  ON public.sources (sync_retry_after)
  WHERE sync_retry_after IS NOT NULL;
