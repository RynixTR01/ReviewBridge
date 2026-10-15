import test from "node:test";
import assert from "node:assert/strict";
import { CONNECTED_REVIEW_SOURCES, PENDING_REVIEW_SOURCES, isConnectedReviewSource } from "../lib/review-source-catalog.js";

test("only configured review adapters are marked connected", () => {
  assert.deepEqual(CONNECTED_REVIEW_SOURCES.map(({ id }) => id), ["google", "trustpilot"]);
  assert.equal(isConnectedReviewSource("google"), true);
  assert.equal(isConnectedReviewSource("yelp"), false);
  assert.deepEqual(PENDING_REVIEW_SOURCES.map(({ id }) => id), ["facebook", "yelp", "tripadvisor", "g2", "capterra"]);
});
