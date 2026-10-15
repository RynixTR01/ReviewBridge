import test from "node:test";
import assert from "node:assert/strict";
import { buildWidgetConversionSnippet } from "../lib/widget-conversion-snippet.js";

test("conversion code reads the same widget and experiment assignment without sending identifiers", () => {
  const snippet = buildWidgetConversionSnippet({
    token: "widget_token_123456",
    widgetId: "123e4567-e89b-42d3-a456-426614174000",
    experimentId: "123e4567-e89b-42d3-a456-426614174001",
    appUrl: "https://app.example.com/path",
  });
  assert.match(snippet, /reviewbridge:experiment:/);
  assert.match(snippet, /event:'goal'/);
  assert.ok(snippet.includes('"https://app.example.com"'));
  assert.ok(snippet.includes("/api/widget-events/"));
  assert.doesNotMatch(snippet, /email|customerId|orderId/i);
});

test("rejects malformed public widget and experiment identifiers", () => {
  assert.throws(() => buildWidgetConversionSnippet({ token: "bad", widgetId: "bad", experimentId: "bad" }));
});
