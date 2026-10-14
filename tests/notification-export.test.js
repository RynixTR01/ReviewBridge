import assert from "node:assert/strict";
import test from "node:test";

import { buildNotificationCsv } from "../lib/notification-export.js";

test("exports localized notification history as spreadsheet-safe CSV", () => {
  const csv = buildNotificationCsv([{
    type: "sync_failed",
    source_name: '=HYPERLINK("https://example.com")',
    metadata: {},
    created_at: "2026-10-14T12:00:00.000Z",
    read_at: null,
  }], "tr");

  assert.ok(csv.startsWith("\uFEFF\"Tarih (UTC)\""));
  assert.match(csv, /"Eşitleme başarısız oldu"/u);
  assert.match(csv, /'=HYPERLINK\(""https:\/\/example\.com""\)/u);
  assert.match(csv, /"Okunmadı"/u);
});

test("uses English labels and omits unsupported notification types", () => {
  const csv = buildNotificationCsv([
    {
      type: "survey_response",
      source_name: "Weekly survey",
      metadata: { score: 8 },
      created_at: "2026-10-14T12:00:00.000Z",
      read_at: "2026-10-14T12:30:00.000Z",
    },
    { type: "unknown", created_at: "2026-10-14T12:00:00.000Z" },
  ], "en");

  assert.ok(csv.includes("\"Date (UTC)\""));
  assert.ok(csv.includes("\"A response with a score of 8 arrived for Weekly survey.\""));
  assert.ok(csv.includes("\"Read\""));
  assert.equal(csv.split("\r\n").filter(Boolean).length, 2);
});
