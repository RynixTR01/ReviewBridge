-- Apply once after creating the server-only reviewbridge_runtime role.
-- End-user authorization remains enforced by server queries. This role must
-- never be exposed to browsers or granted to end-user roles.
CREATE POLICY reviewbridge_runtime_access ON public.users
  FOR ALL TO reviewbridge_runtime USING (true) WITH CHECK (true);
CREATE POLICY reviewbridge_runtime_access ON public.sources
  FOR ALL TO reviewbridge_runtime USING (true) WITH CHECK (true);
CREATE POLICY reviewbridge_runtime_access ON public.reviews
  FOR ALL TO reviewbridge_runtime USING (true) WITH CHECK (true);
CREATE POLICY reviewbridge_runtime_access ON public.widgets
  FOR ALL TO reviewbridge_runtime USING (true) WITH CHECK (true);
