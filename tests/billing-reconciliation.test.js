import test from 'node:test';
import assert from 'node:assert/strict';
import { runBillingReconciliation } from '../lib/billing-reconciliation.js';

test('failed provider refresh stays due and must succeed before retry reports success', async () => {
  process.env.LEMONSQUEEZY_API_KEY = 'test-only';
  process.env.LEMONSQUEEZY_STORE_ID = '321';
  let due = true;
  let providerCalls = 0;
  const query = async (sql, params) => {
    if (sql.includes('WITH due AS')) {
      if (!due) return [];
      due = false;
      return [{ id: 'test-user' }];
    }
    if (sql.includes('billing_reconcile_attempted_at=NULL')) {
      assert.deepEqual(params, [['test-user']]);
      due = true;
    }
    if (sql.includes('AS pending')) return [{ pending: due }];
    return [];
  };
  const refreshSubscription = async () => {
    providerCalls++;
    if (providerCalls === 1) throw new Error('temporary provider outage');
  };
  const first = await runBillingReconciliation({ query, refreshSubscription });
  assert.equal(first.status, 503);
  assert.equal(due, true);
  const retry = await runBillingReconciliation({ query, refreshSubscription });
  assert.equal(retry.status, 200);
  assert.equal(providerCalls, 2);
  assert.deepEqual(await retry.json(), { succeeded: 1, failed: 0, pending: false });
});
