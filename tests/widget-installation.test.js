import test from "node:test";
import assert from "node:assert/strict";
import { observedWidgetHost } from "../lib/widget-installation.js";

test("records only a browser host matching its request origin", () => {
  const request = { headers: new Headers({ origin: "https://client.example" }) };
  assert.equal(observedWidgetHost(request, "client.example", "review-bridge.vercel.app"), "client.example");
  assert.equal(observedWidgetHost(request, "other.example", "review-bridge.vercel.app"), null);
  assert.equal(observedWidgetHost(request, "client.example", "client.example"), null);
  assert.equal(observedWidgetHost({ headers: new Headers() }, "client.example", "review-bridge.vercel.app"), null);
  assert.equal(observedWidgetHost(request, "localhost", "review-bridge.vercel.app"), null);
});
