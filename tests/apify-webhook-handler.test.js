import test from "node:test";
import assert from "node:assert/strict";
import { createApifyWebhookHandler } from "../app/lib/apify-webhook-handler.js";

const sourceId = "source-123";
const runId = "run-456";

function createRequest({ secret = "correct-secret", resource = { id: runId, status: "SUCCEEDED" } } = {}) {
  return new Request(`https://app.example/api/apify-webhook?sourceId=${sourceId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-webhook-secret": secret } : {}),
    },
    body: JSON.stringify({ eventType: "ACTOR.RUN.SUCCEEDED", resource }),
  });
}

function createDependencies(overrides = {}) {
  const state = {
    queries: [],
    retries: [],
    histories: [],
    datasetCalls: [],
  };
  const dependencies = {
    APIFY_ACTORS: { GOOGLE_MAPS: "google-actor" },
    getDatasetItems: async (id) => {
      state.datasetCalls.push(id);
      return [{ title: "Coffee Shop" }];
    },
    mapApifyReviews: () => [],
    query: async (sql, values) => state.queries.push({ sql, values }),
    queryOne: async () => ({ id: sourceId, apify_run_id: runId, platform: "google" }),
    finishSyncHistory: async (entry) => state.histories.push(entry),
    createStableReviewId: (_platform, review) => review.review_id,
    scheduleSyncRetry: async (_query, id, message) => state.retries.push({ id, message }),
    isValidApifyWebhookSecret: (provided, expected) => provided === expected,
    ...overrides,
  };
  return { dependencies, state };
}

async function post(dependencies, request = createRequest()) {
  process.env.APIFY_WEBHOOK_SECRET = "correct-secret";
  const handler = createApifyWebhookHandler(dependencies);
  const response = await handler(request);
  return { response, body: await response.json() };
}

test("rejects an Apify callback before querying Neon when its secret is wrong", async () => {
  const originalSecret = process.env.APIFY_WEBHOOK_SECRET;
  const { dependencies, state } = createDependencies();
  try {
    const { response, body } = await post(dependencies, createRequest({ secret: "wrong-secret" }));
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: "Unauthorized" });
    assert.equal(state.queries.length, 0);
    assert.equal(state.datasetCalls.length, 0);
  } finally {
    if (originalSecret === undefined) delete process.env.APIFY_WEBHOOK_SECRET;
    else process.env.APIFY_WEBHOOK_SECRET = originalSecret;
  }
});

test("ignores a callback for an old run without fetching its dataset", async () => {
  const originalSecret = process.env.APIFY_WEBHOOK_SECRET;
  const { dependencies, state } = createDependencies({
    queryOne: async () => ({ id: sourceId, apify_run_id: "newer-run", platform: "google" }),
  });
  try {
    const { response, body } = await post(dependencies);
    assert.equal(response.status, 200);
    assert.deepEqual(body, { message: "Ignored: run ID mismatch" });
    assert.equal(state.datasetCalls.length, 0);
    assert.equal(state.queries.length, 0);
  } finally {
    if (originalSecret === undefined) delete process.env.APIFY_WEBHOOK_SECRET;
    else process.env.APIFY_WEBHOOK_SECRET = originalSecret;
  }
});

test("persists each unique review and marks a successful sync complete", async () => {
  const originalSecret = process.env.APIFY_WEBHOOK_SECRET;
  const review = {
    review_id: "provider-review-1",
    reviewer_name: "Aylin",
    rating: 4,
    body: "Good coffee",
    reviewed_at: "2026-10-01T00:00:00.000Z",
  };
  const { dependencies, state } = createDependencies({
    mapApifyReviews: () => [review, { ...review, body: "duplicate row" }],
  });
  try {
    const { response, body } = await post(dependencies);
    assert.equal(response.status, 200);
    assert.deepEqual(body, { success: true, count: 1 });
    assert.deepEqual(state.datasetCalls, [runId]);
    assert.equal(state.queries.length, 2);
    assert.match(state.queries[0].sql, /INSERT INTO public\.reviews/);
    assert.deepEqual(state.queries[0].values, [
      sourceId,
      "provider-review-1",
      "Aylin",
      4,
      "duplicate row",
      "2026-10-01T00:00:00.000Z",
    ]);
    assert.match(state.queries[1].sql, /UPDATE public\.sources/);
    assert.deepEqual(state.queries[1].values, [sourceId, "Coffee Shop"]);
    assert.deepEqual(state.histories, [{ sourceId, runId, status: "done", reviewsCount: 1 }]);
    assert.equal(state.retries.length, 0);
  } finally {
    if (originalSecret === undefined) delete process.env.APIFY_WEBHOOK_SECRET;
    else process.env.APIFY_WEBHOOK_SECRET = originalSecret;
  }
});

test("schedules retry and records history when Apify reports a failed run", async () => {
  const originalSecret = process.env.APIFY_WEBHOOK_SECRET;
  const { dependencies, state } = createDependencies();
  try {
    const { response, body } = await post(dependencies, createRequest({
      resource: { id: runId, status: "FAILED" },
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(body, { message: "Run failed with status FAILED" });
    assert.equal(state.datasetCalls.length, 0);
    assert.deepEqual(state.retries, [{ id: sourceId, message: "Apify run ended with status: FAILED" }]);
    assert.deepEqual(state.histories, [{
      sourceId,
      runId,
      status: "error",
      errorMessage: "Apify run ended with status: FAILED",
    }]);
  } finally {
    if (originalSecret === undefined) delete process.env.APIFY_WEBHOOK_SECRET;
    else process.env.APIFY_WEBHOOK_SECRET = originalSecret;
  }
});

test("schedules retry when fetching a successful run's dataset fails", async () => {
  const originalSecret = process.env.APIFY_WEBHOOK_SECRET;
  const originalConsoleError = console.error;
  const { dependencies, state } = createDependencies({
    getDatasetItems: async () => {
      throw new Error("Apify unavailable");
    },
  });
  console.error = () => {};
  try {
    const { response, body } = await post(dependencies);
    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: "Failed to process reviews" });
    assert.deepEqual(state.retries, [{
      id: sourceId,
      message: "Failed to process reviews: Apify unavailable",
    }]);
    assert.deepEqual(state.histories, [{
      sourceId,
      runId,
      status: "error",
      errorMessage: "Yorumlar işlenirken eşitleme başarısız oldu.",
    }]);
  } finally {
    console.error = originalConsoleError;
    if (originalSecret === undefined) delete process.env.APIFY_WEBHOOK_SECRET;
    else process.env.APIFY_WEBHOOK_SECRET = originalSecret;
  }
});
