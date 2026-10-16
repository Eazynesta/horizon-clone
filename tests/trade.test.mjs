import test from 'node:test';
import assert from 'node:assert/strict';
import { orderPreview, priceChart } from '../dist/trade.mjs';
test('order preview calculates totals and rejects invalid inputs',()=>{assert.deepEqual(orderPreview('100','0.5'),{total:50});for(const [p,a]of [[0,1],[-1,2],[100,-2],['bad',1],[Infinity,2],[1e308,1e308]])assert.deepEqual(orderPreview(p,a),{total:0});});
test('chart displays actual candle range and has no synthetic loading fallback',()=>{assert.match(priceChart({symbol:'BTC'},'1H','Candle'),/Waiting for market candles/);const html=priceChart({symbol:'BTC'},'1H','Candle',[{time:1700000000,open:100,high:110,low:90,close:105}]);assert.match(html,/BTC 1H Candle market chart/);assert.doesNotMatch(html,/NaN|Infinity|Sample/);});
