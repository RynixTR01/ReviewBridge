import "server-only";
import { queryOne } from "@/lib/db";
import { EDITABLE_SOURCE_SQL, EDITABLE_WIDGET_SQL } from "./agency-access-queries";

export async function getEditableSource(sourceId, actorId) {
  return queryOne(
    EDITABLE_SOURCE_SQL,
    [sourceId, actorId],
  );
}

export async function getEditableWidget(widgetId, actorId) {
  return queryOne(
    EDITABLE_WIDGET_SQL,
    [widgetId, actorId],
  );
}
