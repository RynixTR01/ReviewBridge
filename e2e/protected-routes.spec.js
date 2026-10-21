import { test, expect } from "@playwright/test";

test("anonymous requests cannot export accounts, start scans, or invoke AI", async ({ request }) => {
  const exportResponse = await request.get('/api/account/export');
  expect(exportResponse.status()).toBe(401);
  const scan = await request.post('/api/sync/00000000-0000-4000-8000-000000000001');
  expect(scan.status()).toBe(401);
  const ai = await request.post('/api/insights/ai', { data: { sourceId: '00000000-0000-4000-8000-000000000001' } });
  expect(ai.status()).toBe(401);
});

test("maintenance endpoints reject requests without the cron credential", async ({ request }) => {
  for (const path of ['/api/cron/reconcile-billing', '/api/cron/cleanup-stale-syncs']) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
  }
});
