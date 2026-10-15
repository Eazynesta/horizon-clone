import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDepositAmount, depositHTML } from '../dist/deposit.mjs';
test('deposit amounts preserve cents and accept the minimum and maximum',()=>{
  assert.equal(parseDepositAmount('50'),5000);
  assert.equal(parseDepositAmount('100.01'),10001);
  assert.equal(parseDepositAmount(' 250.50 '),25050);
  assert.equal(parseDepositAmount('1000000.00'),100000000);
});
test('deposit validation rejects amounts below minimum and malformed or excessive values',()=>{
  for(const amount of ['','49.99','-50','1e3','100.001','NaN','Infinity','1000000.01','999999999999999999999']) assert.throws(()=>parseDepositAmount(amount));
});
test('deposit screen never supplies payment instructions and makes unavailability explicit',()=>{
  const html=depositHTML({preview:true});
  assert.ok(html.includes('No deposit history'));
  assert.ok(html.includes('Deposits are not enabled yet'));
  assert.ok(html.includes('Preview ·'));
  assert.ok(!html.includes('data-wallet'));
});
