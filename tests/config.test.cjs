const test = require('node:test');
const assert = require('node:assert/strict');
const { publicConfig } = require('../api/config.js');
const server = require('../serve.cjs');
test('public config rejects secret and legacy service-role keys', () => {
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'must-never-leak', DATABASE_PASSWORD: 'must-never-leak' };
  for (const key of ['', 'sb_secret_sensitive', 'eyJhbGciOiJIUzI1NiJ9.secret.jwt']) {
    assert.equal(publicConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: key }), null);
  }
  assert.deepEqual(publicConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }), { supabaseUrl: env.SUPABASE_URL, supabasePublishableKey: 'sb_publishable_test' });
});
test('HTTP serves app and callback, refuses workspace files, and fails closed without config', async () => {
  const oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'invalid'; process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_test';
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of ['/', '/auth/callback?code=example']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /type="module" src="\/app.js"/);
    }
    assert.match((await fetch(origin + '/auth.mjs')).headers.get('content-type'), /javascript/);
    for (const route of ['/api/config.js', '/.env', '/.git/config', '/serve.cjs']) assert.equal((await fetch(origin + route)).status, 404);
    const config = await fetch(origin + '/api/config');
    assert.equal(config.status, 503);
    assert.deepEqual(Object.keys(await config.json()), ['error']);
    assert.equal((await fetch(origin + '/api/config', { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldUrl !== undefined) process.env.SUPABASE_URL = oldUrl; else delete process.env.SUPABASE_URL;
    if (oldKey !== undefined) process.env.SUPABASE_PUBLISHABLE_KEY = oldKey; else delete process.env.SUPABASE_PUBLISHABLE_KEY;
  }
});

test('deployment defaults connect only the selected Aurexmarkets project', () => {
  assert.equal(publicConfig({}).supabaseUrl, 'https://utfdajwoseumovoqxtev.supabase.co');
  assert.equal(publicConfig({}, {}), null);
});
