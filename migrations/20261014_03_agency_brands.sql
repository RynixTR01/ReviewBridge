-- Brand grouping is owned by one account. Existing sources remain unassigned.
CREATE TABLE IF NOT EXISTS public.agency_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  website_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_brands_owner ON public.agency_brands (owner_user_id, created_at DESC);

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS brand_id uuid;
ALTER TABLE public.sources ADD CONSTRAINT sources_brand_owner_fkey
  FOREIGN KEY (brand_id, user_id)
  REFERENCES public.agency_brands(id, owner_user_id) ON DELETE SET NULL (brand_id);
CREATE INDEX IF NOT EXISTS idx_sources_brand ON public.sources (brand_id) WHERE brand_id IS NOT NULL;
