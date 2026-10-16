import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHTML, filterAssets, gainers, losers, chart, ASSETS } from '../dist/dashboard.mjs';
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
test('rankings use only supplied live changes, sort correctly and start empty',()=>{assert.deepEqual(gainers(),[]);assert.deepEqual(losers(),[]);const assets=[{symbol:'A',change:2},{symbol:'B',change:-5},{symbol:'C',change:4},{symbol:'D',change:-1},{symbol:'E'}];assert.deepEqual(gainers(assets).map(a=>a.symbol),['C','A']);assert.deepEqual(losers(assets).map(a=>a.symbol),['B','D']);});
test('asset metadata has no sample prices and charts require actual history',()=>{assert.ok(ASSETS.every(a=>!('price'in a)&&!('change'in a)&&!('volume'in a)));assert.match(chart({symbol:'BTC'}),/Chart loading/);assert.match(chart({symbol:'BTC',available:false}),/Market unavailable/);assert.match(chart({symbol:'BTC',history:[{close:10},{close:20}]}),/hourly closing prices/);const html=dashboardHTML();assert.doesNotMatch(html,/304.63|Sample market|illustrative|82,290/);});
