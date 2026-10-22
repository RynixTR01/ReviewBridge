import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { applySubscriptionState } from "../lib/billing-state.js";
import { createSourceWithinPlanLimit, getSourcePlanStatus } from "../lib/source-plan-guard.js";
import { resolveApplicationProfile } from "../lib/auth/profile-binding.js";
import { accountExportChunks } from "../lib/account-export.js";
import { EDITABLE_SOURCE_SQL, EDITABLE_WIDGET_SQL } from "../lib/agency-access-queries.js";
import { effectivePlanSql } from "../lib/billing-entitlement.js";
import { deleteApplicationAccount, deletionIdentityHash, finishIdentityDeletion, getAccountDeletion } from "../lib/account-deletion.js";
import { MAINTENANCE_HEALTH_SQL, runMonitoredMaintenance } from "../lib/maintenance-health.js";

const expectedHost = process.argv[2];
const url = process.env.DATABASE_URL;
// This tool never accepts production, a pooler, or an unspecified destination.
if (!url || !expectedHost || new URL(url).hostname !== expectedHost
  || !expectedHost.startsWith("ep-damp-sunset-bazyhhcn.")) {
  throw new Error("Explicit isolated audit branch connection required.");
}
const database = neon(url);
for (const name of ["20261020_01_billing_state.sql", "20261020_02_identity_binding.sql", "20261021_02_account_deletion.sql", "20261021_03_maintenance_health.sql"]) {
  const statements = readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8")
    .split(";").map(s => s.trim()).filter(Boolean);
  await database.transaction(statements.map(s => database.query(s)));
}
console.log("PASS additive billing migration on isolated branch");

const ids = [randomUUID(), randomUUID()];
const prefix = `audit-${randomUUID()}`;
const subId = `${Date.now()}`;
const event = (status, timestamp, plan, salt = "", subscription = subId) => ({
  data: { type: "subscriptions", id: subscription, attributes: {
    status, updated_at: timestamp, test_mode: true, store_id: "321",
    customer_id: "456", variant_id: "12345",
  } },
  userId: ids[0], eventName: "subscription_updated", plan,
  eventHash: createHash("sha256").update(`${prefix}:${status}:${timestamp}:${salt}`).digest("hex"),
});
try {
  for (const id of ids) await database.query(
    "INSERT INTO public.users (id,email,full_name,plan) VALUES ($1,$2,'Isolated test','free')",
    [id, `${prefix}-${id}@example.invalid`],
  );
  const admissions = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    createSourceWithinPlanLimit(database, {
      userId: ids[0], platform: "google", placeId: `${prefix}-${i}`, businessName: "Isolated source",
    })));
  assert.equal(admissions.filter(r => r.status === "created").length, 1);
  assert.equal(admissions.filter(r => r.status === "limit").length, 7);
  console.log("PASS 8 concurrent Free admissions create exactly one source");
  const other = await createSourceWithinPlanLimit(database, {
    userId: ids[1], platform: "google", placeId: `${prefix}-other`, businessName: "Other account",
  });
  assert.equal(other.status, "created");
  console.log("PASS separate accounts have independent source allowances");

  const old = event("active", "2026-10-19T00:00:00Z", "pro");
  const expired = event("expired", "2026-10-20T00:00:00Z", "free");
  await applySubscriptionState(database, old);
  const duplicate = await applySubscriptionState(database, old);
  assert.equal(duplicate.claimed_count, 0);
  await applySubscriptionState(database, expired);
  await applySubscriptionState(database, event("active", "2026-10-19T12:00:00Z", "pro"));
  let [profile] = await database.query("SELECT plan,billing_status FROM public.users WHERE id=$1", [ids[0]]);
  assert.equal(profile.plan, "free");
  assert.equal(profile.billing_status, "expired");
  console.log("PASS duplicate + out-of-order events preserve expired state");

  await Promise.all([
    applySubscriptionState(database, event("active", "2026-10-21T00:00:00Z", "pro", "parallel-active")),
    applySubscriptionState(database, event("expired", "2026-10-21T00:00:00Z", "free", "parallel-expired")),
  ]);
  [profile] = await database.query("SELECT plan,billing_status FROM public.users WHERE id=$1", [ids[0]]);
  assert.equal(profile.plan, "free");
  assert.equal(profile.billing_status, "expired");
  console.log("PASS simultaneous equal-time events converge to terminal state");

  await applySubscriptionState(database, event("active", "2026-10-22T00:00:00Z", "pro", "new-sub", subId + "1"));
  await applySubscriptionState(database, event("expired", "2026-10-23T00:00:00Z", "free", "old-sub-expired"));
  [profile] = await database.query("SELECT plan,lemonsqueezy_subscription_id FROM public.users WHERE id=$1", [ids[0]]);
  assert.equal(profile.plan, "pro");
  assert.equal(profile.lemonsqueezy_subscription_id, subId + "1");
  console.log("PASS old subscription cannot revoke a replacement subscription");

  const sourceIds = [admissions.find(r => r.status === "created").source.id];
  for (let i = 0; i < 4; i++) {
    const admitted = await createSourceWithinPlanLimit(database, {
      userId: ids[0], platform: "google", placeId: `${prefix}-pro-${i}`, businessName: "Pro test",
    });
    assert.equal(admitted.status, "created");
    sourceIds.push(admitted.source.id);
  }
  await database.query("UPDATE public.users SET plan='free' WHERE id=$1", [ids[0]]);
  const states = await Promise.all(sourceIds.map(id => getSourcePlanStatus(database, id)));
  assert.equal(states.filter(s => s.active).length, 1);
  const [{ count }] = await database.query("SELECT count(*)::int AS count FROM public.sources WHERE user_id=$1", [ids[0]]);
  assert.equal(count, 5);
  console.log("PASS downgrade pauses surplus sources without deleting their data");

  const identity = { id: `${prefix}-auth`, email: `${prefix}-${ids[0]}@example.invalid`, emailVerified: true };
  const claims = await Promise.all(Array.from({ length: 4 }, () => resolveApplicationProfile(database, identity)));
  assert.ok(claims.every(p => p?.id === ids[0]));
  const impostor = await resolveApplicationProfile(database, { ...identity, id: `${prefix}-impostor` });
  assert.equal(impostor, null);
  assert.equal(await resolveApplicationProfile(database, { ...identity, emailVerified: false }), null);
  const changed = await resolveApplicationProfile(database, { ...identity, email: `${prefix}-changed@example.invalid` });
  assert.equal(changed.id, ids[0]);
  const conflict = await resolveApplicationProfile(database, { ...identity, email: `${prefix}-${ids[1]}@example.invalid` });
  assert.equal(conflict, null);
  console.log("PASS stable identity mapping, concurrent callbacks, verified email change and takeover rejection");

  let contents = "";
  for await (const chunk of accountExportChunks((sql, values) => database.query(sql, values), ids[0])) contents += chunk;
  const exported = JSON.parse(contents);
  assert.equal(exported.complete, true);
  assert.equal(exported.records.filter(r => r.section === "sources").length, 5);
  assert.equal(exported.records.find(r => r.section === "profile").data.id, ids[0]);
  assert.ok(!contents.includes(other.source.id));
  assert.ok(!contents.includes(ids[1]));
  assert.ok(!contents.includes("auth_user_id") && !contents.includes("unsubscribe_token"));
  console.log("PASS complete account export excludes another account and sensitive credential/token fields");

  const [brand] = await database.query(
    "INSERT INTO public.agency_brands(owner_user_id,name) VALUES ($1,'Audit brand') RETURNING id", [ids[0]],
  );
  await database.query("UPDATE public.sources SET brand_id=$2 WHERE id=$1", [sourceIds[0], brand.id]);
  const [widget] = await database.query(
    "INSERT INTO public.widgets(user_id,source_id,embed_token) VALUES ($1,$2,$3) RETURNING id",
    [ids[0], sourceIds[0], randomUUID().replaceAll('-', '')],
  );
  await database.query("UPDATE public.users SET plan='agency' WHERE id=$1", [ids[0]]);
  for (const [sql, resource] of [[EDITABLE_SOURCE_SQL, sourceIds[0]], [EDITABLE_WIDGET_SQL, widget.id]]) {
    assert.equal((await database.query(sql, [resource, ids[0]])).length, 1);
    assert.equal((await database.query(sql, [resource, ids[1]])).length, 0);
  }
  for (const role of ['viewer', 'client', 'editor']) {
    await database.query(
      `INSERT INTO public.agency_brand_members(brand_id,user_id,role) VALUES ($1,$2,$3)
       ON CONFLICT(brand_id,user_id) DO UPDATE SET role=EXCLUDED.role`, [brand.id, ids[1], role],
    );
    for (const [sql, resource] of [[EDITABLE_SOURCE_SQL, sourceIds[0]], [EDITABLE_WIDGET_SQL, widget.id]]) {
      assert.equal((await database.query(sql, [resource, ids[1]])).length, role === 'editor' ? 1 : 0);
    }
    assert.equal((await database.query(EDITABLE_SOURCE_SQL, [sourceIds[1], ids[1]])).length, 0);
  }
  await database.query("UPDATE public.users SET plan='pro' WHERE id=$1", [ids[0]]);
  assert.equal((await database.query(EDITABLE_SOURCE_SQL, [sourceIds[0], ids[1]])).length, 0);
  assert.equal((await database.query(EDITABLE_WIDGET_SQL, [widget.id, ids[1]])).length, 0);
  console.log("PASS owner/editor/viewer/client isolation, other-brand denial and Agency downgrade revocation");
  await database.query("UPDATE public.users SET plan='agency',billing_status='cancelled',billing_ends_at=now()-INTERVAL '1 second' WHERE id=$1", [ids[0]]);
  const [expiredRead] = await database.query(`SELECT ${effectivePlanSql('u')} AS plan FROM public.users u WHERE id=$1`, [ids[0]]);
  assert.equal(expiredRead.plan, 'free');
  assert.equal((await database.query(EDITABLE_SOURCE_SQL, [sourceIds[0], ids[1]])).length, 0);
  assert.equal((await database.query(EDITABLE_WIDGET_SQL, [widget.id, ids[1]])).length, 0);
  console.log("PASS expired paid access denied without login or cron maintenance");
  assert.equal(await deleteApplicationAccount(database, ids[1], identity.id), false);
  assert.equal(await getAccountDeletion(database, identity.id), null);
  const [deleting] = await database.query("SELECT lemonsqueezy_subscription_id AS subscription FROM public.users WHERE id=$1", [ids[0]]);
  assert.equal(await deleteApplicationAccount(database, ids[0], identity.id, 'unconfirmed-subscription'), false);
  await database.query("UPDATE public.users SET billing_checkout_expires_at=now()+interval '30 minutes' WHERE id=$1", [ids[0]]);
  assert.equal(await deleteApplicationAccount(database, ids[0], identity.id, deleting.subscription), false);
  await database.query("UPDATE public.users SET billing_checkout_expires_at=NULL WHERE id=$1", [ids[0]]);
  assert.equal(await deleteApplicationAccount(database, ids[0], identity.id, deleting.subscription), true);
  assert.equal((await database.query("SELECT id FROM public.sources WHERE user_id=$1", [ids[0]])).length, 0);
  assert.equal((await database.query("SELECT id FROM public.widgets WHERE user_id=$1", [ids[0]])).length, 0);
  assert.equal((await database.query("SELECT id FROM public.users WHERE id=$1", [ids[1]])).length, 1);
  assert.equal(await resolveApplicationProfile(database, identity), null);
  const failed = await finishIdentityDeletion(database, identity.id, async () => { throw new Error('provider unavailable'); });
  assert.equal(failed.complete, false);
  assert.equal((await getAccountDeletion(database, identity.id)).identity_deleted_at, null);
  const resetAttempt = () => database.query("UPDATE public.account_deletions SET last_attempt_at=NULL WHERE identity_hash=$1", [deletionIdentityHash(identity.id)]);
  await resetAttempt();
  const verification = await finishIdentityDeletion(database, identity.id, async () => ({ data: { success: true, message: 'Verification email sent' } }));
  assert.equal(verification.complete, false);
  await resetAttempt();
  let providerCalls = 0;
  const retries = await Promise.all(Array.from({ length: 4 }, () => finishIdentityDeletion(database, identity.id, async () => {
    providerCalls++;
    return { data: { success: true, message: 'User deleted' } };
  })));
  assert.equal(providerCalls, 1);
  assert.equal(retries.filter(r => r.complete).length, 1);
  assert.ok((await getAccountDeletion(database, identity.id)).identity_deleted_at);
  assert.equal(await resolveApplicationProfile(database, identity), null);
  console.log("PASS durable deletion, other-account rejection, provider failure/retry, verification distinction and resurrection prevention");
  await database.query("UPDATE public.maintenance_job_health SET status='waiting',created_at=now(),succeeded_at=NULL,started_at=NULL");
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, true);
  await runMonitoredMaintenance(database, 'reconcile-billing', async () => new Response(null, { status: 503 }));
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, false);
  await runMonitoredMaintenance(database, 'reconcile-billing', async () => new Response(null, { status: 200 }));
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, true);
  const thrown = await runMonitoredMaintenance(database, 'cleanup-stale-syncs', async () => { throw new Error('provider failed'); });
  assert.equal(thrown.status, 503);
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, false);
  await database.query("UPDATE public.maintenance_job_health SET status='running',started_at=now() WHERE job_name='cleanup-stale-syncs'");
  let unexpectedRun = false;
  const overlap = await runMonitoredMaintenance(database, 'cleanup-stale-syncs', async () => { unexpectedRun = true; return new Response(); });
  assert.equal(overlap.status, 503);
  assert.equal(unexpectedRun, false);
  await database.query("UPDATE public.maintenance_job_health SET started_at=now()-interval '6 minutes' WHERE job_name='cleanup-stale-syncs'");
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, false);
  await runMonitoredMaintenance(database, 'cleanup-stale-syncs', async () => new Response());
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, true);
  await database.query("UPDATE public.maintenance_job_health SET succeeded_at=now()-interval '37 hours' WHERE job_name='cleanup-stale-syncs'");
  assert.equal((await database.query(MAINTENANCE_HEALTH_SQL))[0].healthy, false);
  console.log("PASS maintenance failure, recovery, overlap rejection, killed run and missed-schedule detection");
} finally {
  await database.query("UPDATE public.maintenance_job_health SET status='waiting',created_at=now(),succeeded_at=NULL,started_at=NULL");
  await database.query("DELETE FROM public.account_deletions WHERE identity_hash=$1", [deletionIdentityHash(`${prefix}-auth`)]);
  await database.query("DELETE FROM public.lemonsqueezy_webhook_events WHERE user_key = ANY($1::text[])", [ids]);
  await database.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [ids]);
  console.log("Isolated synthetic fixtures removed; production untouched.");
}
