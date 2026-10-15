import test from 'node:test';
import assert from 'node:assert/strict';
import { orderPreview, sampleCandles } from '../dist/trade.mjs';
test('order preview calculates totals and sample fees and rejects invalid inputs',()=>{assert.deepEqual(orderPreview('100','0.5'),{total:50,fee:.05});for(const [p,a]of [[0,1],[-1,2],[100,-2],['bad',1],[Infinity,2],[1e308,1e308]])assert.deepEqual(orderPreview(p,a),{total:0,fee:0});});
test('sample candle ranges contain open and close and remain deterministic across reloads',()=>{const candles=sampleCandles('BTC','1H');assert.deepEqual(candles,sampleCandles('BTC','1H'));assert.notDeepEqual(candles,sampleCandles('ETH','4H'));for(const c of candles){assert.ok(c.low<=Math.min(c.open,c.close));assert.ok(c.high>=Math.max(c.open,c.close));}});
