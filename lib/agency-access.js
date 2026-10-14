import "server-only";
import { queryOne } from "@/lib/db";

export async function getEditableSource(sourceId, actorId) {
  return queryOne(
    `SELECT s.*, owner_profile.plan AS owner_plan
     FROM public.sources s
     JOIN public.users owner_profile ON owner_profile.id = s.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
     WHERE s.id = $1 AND (
       s.user_id = $2 OR (owner_profile.plan = 'agency' AND m.role = 'editor')
     )`,
    [sourceId, actorId],
  );
}

export async function getEditableWidget(widgetId, actorId) {
  return queryOne(
    `SELECT w.id, w.source_id, w.user_id, owner_profile.plan AS owner_plan
     FROM public.widgets w
     JOIN public.sources s ON s.id = w.source_id AND s.user_id = w.user_id
     JOIN public.users owner_profile ON owner_profile.id = w.user_id
     LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
     WHERE w.id = $1 AND (
       w.user_id = $2 OR (owner_profile.plan = 'agency' AND m.role = 'editor')
     )`,
    [widgetId, actorId],
  );
}
