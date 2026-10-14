import test from "node:test";
import assert from "node:assert/strict";
import { getNotificationPresentation } from "../lib/notification-copy.js";

test("sync failure notifications are localized and link to the source dashboard", () => {
  const item = { type: "sync_failed", source_id: "source-1", source_name: "Demirköprü Çorba" };

  assert.deepEqual(getNotificationPresentation(item, "tr"), {
    title: "Eşitleme başarısız oldu",
    body: "Demirköprü Çorba için eşitleme tamamlanamadı. Mevcut yorumlarınız korunuyor.",
    href: "/dashboard#source-source-1",
  });
  assert.match(getNotificationPresentation(item, "en").body, /existing reviews are still available/);
});

test("source limit notifications show the saved usage and offer a plan link", () => {
  const item = { type: "source_limit", metadata: { sourceCount: 1, sourceLimit: 1 } };
  const presentation = getNotificationPresentation(item, "en");

  assert.match(presentation.body, /1 \/ 1 sources/);
  assert.equal(presentation.href, "/dashboard/upgrade");
});

test("unknown notification types are not rendered", () => {
  assert.equal(getNotificationPresentation({ type: "unknown" }, "tr"), null);
});
