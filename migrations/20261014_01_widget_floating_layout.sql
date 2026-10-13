ALTER TABLE public.widgets DROP CONSTRAINT IF EXISTS widgets_layout_check;

ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_layout_check
  CHECK (layout IN ('list', 'grid', 'carousel', 'masonry', 'floating'));
