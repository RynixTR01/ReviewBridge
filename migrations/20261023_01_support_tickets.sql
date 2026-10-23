CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
  message text NOT NULL CHECK (length(message) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_tickets_open_created_idx
  ON public.support_tickets (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS support_tickets_user_created_idx
  ON public.support_tickets (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO reviewbridge_runtime;
CREATE POLICY reviewbridge_runtime_access ON public.support_tickets
  FOR ALL TO reviewbridge_runtime USING (true) WITH CHECK (true);
