-- Membership grants access to one brand, never to the owner's other brands.
CREATE TABLE IF NOT EXISTS public.agency_brand_members (
  brand_id uuid NOT NULL REFERENCES public.agency_brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_agency_brand_members_user ON public.agency_brand_members (user_id, brand_id);
