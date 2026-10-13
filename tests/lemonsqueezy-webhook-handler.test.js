import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createLemonSqueezyWebhookHandler } from "../app/lib/lemonsqueezy-webhook-handler.js";
import {
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
} from "../lib/lemonsqueezy-webhook.js";

const signingSecret = "handler-test-secret";

function createPayload({ eventName = "subscription_created", variantId = "12345" } = {}) {
  return {
    meta: { event_name: eventName, custom_data: { user_id: "user-1" } },
    data: {
      id: "subscription-789",
      attributes: { variant_id: variantId, updated_at: "2026-10-14T00:00:00.000Z" },
    },
  };
}

function createRequest(payload, { secret = signingSecret, signature } = {}) {
  const rawBody = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return new Request("https://app.example/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature || hmac,
    },
    body: rawBody,
  });
}

function createDependencies({ result = { claimed_count: 1, user_id: "user-1", updated_user_id: "user-1" } } = {}) {
  const calls = [];
  return {
    calls,
    dependencies: {
      resolveLemonSqueezyPlan,
      verifyLemonSqueezySignature,
      queryOne: async (sql, params) => {
        calls.push({ sql, params });
        return result;
      },
    },
  };
}

async function withEnv(values, run) {
  const original = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("fails closed when webhook signing secret is missing", async () => {
  const oldConsoleError = console.error;
  console.error = () => {};
  try {
    await withEnv({ LEMONSQUEEZY_WEBHOOK_SECRET: undefined }, async () => {
      const { calls, dependencies } = createDependencies();
      const response = await createLemonSqueezyWebhookHandler(dependencies)(createRequest(createPayload()));
      assert.equal(response.status, 503);
      assert.equal(calls.length, 0);
    });
  } finally {
    console.error = oldConsoleError;
  }
});

test("rejects invalid signatures before checking subscriptions", async () => {
  await withEnv({ LEMONSQUEEZY_WEBHOOK_SECRET: signingSecret }, async () => {
    const { calls, dependencies } = createDependencies();
    const response = await createLemonSqueezyWebhookHandler(dependencies)(
      createRequest(createPayload(), { signature: "invalid-signature" })
    );
    assert.equal(response.status, 401);
    assert.equal(calls.length, 0);
  });
});

test("matches a configured variant and applies the signed subscription event", async () => {
  await withEnv({
    LEMONSQUEEZY_WEBHOOK_SECRET: signingSecret,
    LEMONSQUEEZY_PRO_VARIANT_ID: "12345",
    LEMONSQUEEZY_AGENCY_VARIANT_ID: "67890",
  }, async () => {
    const { calls, dependencies } = createDependencies();
    const response = await createLemonSqueezyWebhookHandler(dependencies)(createRequest(createPayload()));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      event: "subscription_created",
      plan: "pro",
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /INSERT INTO public\.lemonsqueezy_webhook_events/);
    assert.match(calls[0].sql, /ON CONFLICT \(event_hash\) DO NOTHING/);
    assert.match(calls[0].sql, /newer\.event_at > \$7::timestamptz/);
    assert.match(calls[0].sql, /lemonsqueezy_subscription_id/);
    assert.equal(calls[0].params[1], "subscription_created");
    assert.equal(calls[0].params[2], "user-1");
    assert.equal(calls[0].params[4], "subscription-789");
    assert.equal(calls[0].params[5], "pro");
    assert.equal(calls[0].params[6], "2026-10-14T00:00:00.000Z");
    assert.match(calls[0].params[0], /^[a-f0-9]{64}$/);
  });
});

test("returns an idempotent success for duplicate webhook events", async () => {
  await withEnv({
    LEMONSQUEEZY_WEBHOOK_SECRET: signingSecret,
    LEMONSQUEEZY_PRO_VARIANT_ID: "12345",
  }, async () => {
    const { dependencies } = createDependencies({ result: { claimed_count: 0, user_id: "user-1" } });
    const response = await createLemonSqueezyWebhookHandler(dependencies)(createRequest(createPayload()));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, duplicate: true });
  });
});

test("does not apply an older event or a cancellation to the user's paid plan", async () => {
  await withEnv({
    LEMONSQUEEZY_WEBHOOK_SECRET: signingSecret,
    LEMONSQUEEZY_PRO_VARIANT_ID: "12345",
  }, async () => {
    const stale = createDependencies({ result: { claimed_count: 1, user_id: "user-1", updated_user_id: null } });
    const staleResponse = await createLemonSqueezyWebhookHandler(stale.dependencies)(createRequest(createPayload()));
    assert.deepEqual(await staleResponse.json(), {
      success: true,
      stale: true,
      message: "Older subscription event ignored",
    });

    const cancellation = createDependencies({ result: { claimed_count: 1, user_id: "user-1", updated_user_id: null } });
    const cancellationResponse = await createLemonSqueezyWebhookHandler(cancellation.dependencies)(
      createRequest(createPayload({ eventName: "subscription_cancelled" }))
    );
    assert.equal(cancellationResponse.status, 200);
    assert.deepEqual(await cancellationResponse.json(), {
      success: true,
      message: "Cancellation noted; plan remains active until expiry",
    });
  });
});
