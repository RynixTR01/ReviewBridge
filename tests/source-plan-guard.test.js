import test from "node:test";
import assert from "node:assert/strict";
import { createSourceWithinPlanLimit, getSourcePlanStatus } from "../lib/source-plan-guard.js";

function makeDatabase(plan = "free", initialSources = []) {
  const sources = [...initialSources];
  let lockTail = Promise.resolve();
  const transactions = [];

  return {
    sources,
    transactions,
    query(text, params) { return { text, params }; },
    async transaction(statements, options) {
      transactions.push({ statements, options });
      const [lock, admission] = statements;
      assert.match(lock.text, /FOR UPDATE/i);
      assert.match(admission.text, /source_count\.count\s*<\s*CASE profile\.plan/i);
      assert.match(admission.text, /NOT EXISTS \(SELECT 1 FROM duplicate_source\)/i);

      let release;
      const previous = lockTail;
      lockTail = new Promise((resolve) => { release = resolve; });
      await previous;
      try {
        const [userId, platform, placeId, businessName] = admission.params;
        const count = sources.filter((source) => source.userId === userId).length;
        const duplicate = sources.find((source) => source.userId === userId
          && source.platform === platform
          && (platform === "trustpilot"
            ? source.placeId.toLowerCase() === placeId.toLowerCase()
            : source.placeId === placeId));
        const limit = plan === "agency" ? Infinity : plan === "pro" ? 5 : 1;
        const inserted = !duplicate && count < limit
          ? { id: `source-${sources.length + 1}`, userId, platform, placeId, businessName }
          : null;
        if (inserted) sources.push(inserted);
        return [[], [{
          plan,
          source_count: count,
          duplicate_id: duplicate?.id || null,
          ...inserted,
          widget_id: admission.params.length > 12 && inserted ? "widget-created" : null,
        }]];
      } finally {
        release();
      }
    },
  };
}

test("parallel source creation cannot exceed a free account's one-source limit", async () => {
  const database = makeDatabase();
  const inputs = ["google-place-one", "google-place-two"];
  const results = await Promise.all(inputs.map((placeId) => createSourceWithinPlanLimit(database, {
    userId: "user-1", platform: "google", placeId, businessName: placeId,
  })));

  assert.deepEqual(results.map((result) => result.status).sort(), ["created", "limit"]);
  assert.equal(database.sources.length, 1);
  assert.equal(database.transactions.length, 2);
  assert.ok(database.transactions.every(({ options }) => options.isolationLevel === "ReadCommitted"));
});

test("source admission enforces the Pro cap while allowing Agency sources", async () => {
  const pro = makeDatabase("pro", Array.from({ length: 5 }, (_, index) => ({
    id: `existing-${index}`, userId: "user-1", platform: "google", placeId: `place-${index}`,
  })));
  const blocked = await createSourceWithinPlanLimit(pro, {
    userId: "user-1", platform: "google", placeId: "new-place", businessName: "Example",
  });
  assert.equal(blocked.status, "limit");
  assert.equal(blocked.limit, 5);

  const agency = makeDatabase("agency", Array.from({ length: 5 }, (_, index) => ({
    id: `existing-${index}`, userId: "user-1", platform: "google", placeId: `place-${index}`,
  })));
  const allowed = await createSourceWithinPlanLimit(agency, {
    userId: "user-1", platform: "google", placeId: "new-place", businessName: "Example",
  });
  assert.equal(allowed.status, "created");
  assert.equal(allowed.limit, Infinity);
});

test("duplicate Trustpilot sources are rejected within the same admission transaction", async () => {
  const database = makeDatabase("pro", [{
    id: "existing-1", userId: "user-1", platform: "trustpilot", placeId: "example.com",
  }]);
  const result = await createSourceWithinPlanLimit(database, {
    userId: "user-1", platform: "trustpilot", placeId: "EXAMPLE.COM", businessName: "Example",
  });

  assert.equal(result.status, "duplicate");
  assert.equal(database.sources.length, 1);
});

test("first-party source and widget are admitted and created together", async () => {
  const database = makeDatabase("free");
  const result = await createSourceWithinPlanLimit(database, {
    userId: "user-1", platform: "first_party", placeId: "b".repeat(48), businessName: "Cafe",
    widget: { embedToken: "a".repeat(32) },
  });

  assert.equal(result.status, "created");
  assert.equal(result.widgetId, "widget-created");
  assert.match(database.transactions[0].statements[1].text, /INSERT INTO public\.widgets/i);
});

test("downgraded accounts retain sources but pause sources beyond the plan cap", async () => {
  const database = {
    async query(text, [sourceId]) {
      if (text.startsWith("SELECT user_id")) return [{ user_id: "test-owner" }];
      if (text.includes("WITH expired")) return [];
      assert.match(text, /older\.user_id = s\.user_id/i);
      assert.match(text, /older\.created_at < s\.created_at/i);
      const rank = Number(sourceId.split("-")[1]);
      return [{ plan: "free", source_position: rank }];
    },
  };
  const active = await getSourcePlanStatus(database, "source-1");
  const paused = await getSourcePlanStatus(database, "source-2");

  assert.equal(active.active, true);
  assert.equal(paused.active, false);
  assert.equal(paused.sourcePosition, 2);
  assert.equal(paused.limit, 1);
});

test("missing sources do not receive an active-plan entitlement", async () => {
  const status = await getSourcePlanStatus({ query: async () => [] }, "missing");
  assert.equal(status, null);
});
