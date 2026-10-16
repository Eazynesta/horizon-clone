import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountService, validatePassword, profileValues } from '../dist/auth.mjs';

test('signup rejects mismatches before contacting Supabase', async () => {
  let calls = 0;
  const service = createAccountService({ auth: { signUp() { calls++; } } }, 'https://example.com');
  await assert.rejects(service.signUp({ password: 'a-long-password', confirmPassword: 'different-password' }), /do not match/);
  assert.equal(calls, 0);
  assert.throws(() => validatePassword('short', 'short'), /8 characters/);
});
test('signup stores cosmetic profile metadata and a fixed same-origin callback', async () => {
  let payload;
  const service = createAccountService({ auth: { signUp: async p => { payload = p; return { data: { session: null }, error: null }; } } }, 'https://aurexmarkets.vercel.app');
  const result = await service.signUp({ email: ' user@example.com ', password: 'a-long-password', confirmPassword: 'a-long-password', firstName: ' Jane ', lastName: ' Doe ', phone: '+254 712 345 678', role: 'admin' });
  assert.equal(result.session, null);
  assert.equal(payload.email, 'user@example.com');
  assert.equal(payload.options.emailRedirectTo, 'https://aurexmarkets.vercel.app/auth/callback');
  assert.deepEqual(payload.options.data, { first_name: 'Jane', last_name: 'Doe', phone: '+254712345678' });
});
test('phone validation accepts international numbers and rejects invalid values', () => {
  assert.equal(profileValues({ firstName: 'A', lastName: 'B', phone: '' }).phone, '');
  assert.throws(() => profileValues({ firstName: 'A', lastName: 'B', phone: '0712345678' }), /country code/);
});
test('expired sessions and provider errors propagate instead of appearing successful', async () => {
  const service = createAccountService({ auth: { getUser: async () => ({ error: new Error('Session expired') }), signInWithPassword: async () => ({ error: new Error('Invalid login credentials') }) } }, 'https://example.com');
  await assert.rejects(service.user(), /Session expired/);
  await assert.rejects(service.signIn('user@example.com', 'incorrect'), /Invalid login credentials/);
});
test('recovery uses a dedicated callback and validates passwords before update', async () => {
  let payload, updates = 0;
  const service = createAccountService({ auth: {
    resetPasswordForEmail: async (...args) => { payload = args; return { data: {}, error: null }; },
    updateUser: async () => { updates++; return { data: {}, error: null }; }
  } }, 'https://example.com');
  await service.resetPassword(' user@example.com ');
  assert.deepEqual(payload, ['user@example.com', { redirectTo: 'https://example.com/auth/callback?flow=recovery' }]);
  await assert.rejects(service.changePassword('short', 'short'));
  assert.equal(updates, 0);
});
test('profile writes strip arbitrary ownership and role fields', async () => {
  let payload, filter;
  const chain = {
    update(p) { payload = p; return this; },
    eq(column, id) { filter = [column, id]; return this; },
    select() { return this; },
    single: async () => ({ data: { id: 'verified-id' }, error: null })
  };
  const service = createAccountService({ from: name => { assert.equal(name, 'profiles'); return chain; } }, 'https://example.com');
  await service.saveProfile('verified-id', { firstName: 'Jane', lastName: 'Doe', phone: '', id: 'victim-id', role: 'admin' });
  assert.deepEqual(payload, { first_name: 'Jane', last_name: 'Doe', phone: '' });
  assert.deepEqual(filter, ['id', 'verified-id']);
});
test('a profile update denied by RLS is surfaced to the user', async () => {
  const chain = { update() { return this; }, eq() { return this; }, select() { return this; }, single: async () => ({ error: new Error('Row not permitted') }) };
  const service = createAccountService({ from: () => chain }, 'https://example.com');
  await assert.rejects(service.saveProfile('id', { firstName: 'Jane', lastName: 'Doe' }), /Row not permitted/);
});

test('verified session checks are cached for navigation, refreshed for sensitive actions and cleared on signout',async()=>{let calls=0;const service=createAccountService({auth:{getUser:async()=>{calls++;return {data:{user:{id:'test'}}};},signOut:async()=>({data:{}})}},'https://example.com');await Promise.all([service.user(),service.user()]);assert.equal(calls,1);await service.user();assert.equal(calls,1);await service.user({fresh:true});assert.equal(calls,2);await service.signOut();await service.user();assert.equal(calls,3);});
