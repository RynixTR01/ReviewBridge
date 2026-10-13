import test from "node:test";
import assert from "node:assert/strict";
import { getDatasetItems, startApifyRun } from "../app/lib/apify.js";

function withEnv(values, run) {
  const original = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

test("starts an Apify run with bearer auth and a signed callback header", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return Response.json({ data: { id: "run-123" } });
  };

  try {
    await withEnv({
      APIFY_API_TOKEN: "unit-test-token",
      APIFY_WEBHOOK_SECRET: "unit-test-webhook-secret",
      NEXT_PUBLIC_APP_URL: "https://reviewbridge.example/",
    }, async () => {
      const input = { startUrls: [{ url: "https://www.google.com/maps/place/example" }] };
      assert.equal(await startApifyRun("owner/actor", input, "source/123"), "run-123");
      assert.equal(requestUrl.origin, "https://api.apify.com");
      assert.equal(requestUrl.pathname, "/v2/actors/owner%2Factor/runs");
      assert.equal(requestUrl.searchParams.has("token"), false);
      assert.equal(requestOptions.headers.Authorization, "Bearer unit-test-token");
      assert.deepEqual(JSON.parse(requestOptions.body), input);

      const [webhook] = JSON.parse(Buffer.from(requestUrl.searchParams.get("webhooks"), "base64").toString("utf8"));
      assert.equal(webhook.requestUrl, "https://reviewbridge.example/api/apify-webhook?sourceId=source%2F123");
      assert.deepEqual(JSON.parse(webhook.headersTemplate), {
        "x-webhook-secret": "unit-test-webhook-secret",
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetches run metadata and dataset with bearer auth and no token query parameter", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    if (calls.length === 1) return Response.json({ data: { defaultDatasetId: "dataset-456" } });
    return Response.json([{ reviewId: "review-1", stars: 4 }]);
  };

  try {
    await withEnv({ APIFY_API_TOKEN: "unit-test-token" }, async () => {
      assert.deepEqual(await getDatasetItems("run/123"), [{ reviewId: "review-1", stars: 4 }]);
      assert.equal(calls[0].url.pathname, "/v2/actor-runs/run%2F123");
      assert.equal(calls[1].url.pathname, "/v2/datasets/dataset-456/items");
      for (const { url, options } of calls) {
        assert.equal(url.searchParams.has("token"), false);
        assert.equal(options.headers.Authorization, "Bearer unit-test-token");
      }
      assert.equal(calls[1].url.searchParams.get("clean"), "true");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
