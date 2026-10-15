import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHTML, filterAssets, gainers, losers } from '../dist/dashboard.mjs';
test('profile names cannot inject executable markup into the dashboard greeting', () => {
  const html = dashboardHTML({ firstName: '<img src=x onerror=alert(1)>', preview: false });
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});
test('market search ignores case and whitespace and matches names and symbols', () => {
  assert.equal(filterAssets(' bTc ')[0].symbol, 'BTC');
  assert.deepEqual(filterAssets('a-market-that-does-not-exist'), []);
  assert.ok(filterAssets('bitcoin').some(a => a.symbol === 'BCH'));
});
test('ranked summaries use consistent positive and negative sample figures', () => {
  assert.ok(gainers().every(a => a.change > 0));
  assert.ok(losers().every(a => a.change < 0));
  assert.equal(gainers()[0].symbol, 'BTC');
  assert.equal(losers()[0].symbol, 'MKR');
});
