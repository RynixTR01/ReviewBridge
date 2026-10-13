-- Keep provider review IDs so repeated syncs update/skip the same source review.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS external_review_id text;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_source_external_review_id_key
  ON public.reviews (source_id, external_review_id)
  WHERE external_review_id IS NOT NULL;
