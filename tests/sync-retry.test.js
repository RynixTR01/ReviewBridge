import test from "node:test";
import assert from "node:assert/strict";
import { getSyncRetryDelayMs, MAX_SYNC_RETRIES } from "../lib/sync-retry.js";

test("sync retries use bounded exponential backoff", () => {
  assert.equal(MAX_SYNC_RETRIES, 3);
  assert.equal(getSyncRetryDelayMs(1), 15 * 60_000);
  assert.equal(getSyncRetryDelayMs(2), 60 * 60_000);
  assert.equal(getSyncRetryDelayMs(3), 6 * 60 * 60_000);
  assert.equal(getSyncRetryDelayMs(8), 6 * 60 * 60_000);
});
