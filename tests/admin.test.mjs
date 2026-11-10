import test from 'node:test';import assert from 'node:assert/strict';import {adminHTML,requestDetails} from '../dist/admin.mjs';import {createAdminService} from '../dist/admin-service.mjs';
test('admin render escapes user-controlled review evidence and addresses',()=>{const html=requestDetails({asset:'BTC',network:'bitcoin',kind:'withdrawal',amount:'0.1',status:'pending_review',id:'id',user_id:'user',address:'<img src=x onerror=alert(1)>',review_note:'<script>bad</script>'},'<svg onload=alert(1)>');assert.doesNotMatch(html,/<script>|<img src=x|<svg onload/);assert.match(html,/&lt;script&gt;/);});
test('admin read-only view contains no sample account balances or privileged user data',()=>{const html=adminHTML({preview:true});assert.match(html,/Read-only access/);assert.doesNotMatch(html,/preview/i);assert.match(html,/Balance adjustment/);assert.match(html,/Wallet audit trail/);assert.doesNotMatch(html,/@gmail|10000 BTC/);});
test('admin service requires a verified user before database access',async()=>{const service=createAdminService({user:async()=>null,client:{}});await assert.rejects(service.execute('approve_deposit',{},'id'),/Sign in/);await assert.rejects(service.directory(),/Sign in/);});

test('admin grants use the signed-in RPC and preserve the already-admin result', async () => {
  let signedIn = false;
  const service = createAdminService({
    user: async options => {
      assert.deepEqual(options, {fresh:true});
      return signedIn ? {id:'actor'} : null;
    },
    client: {
      rpc: async (name, args) => {
        assert.equal(name, 'finance_grant_admin');
        assert.deepEqual(args, {account_email:'member@example.com'});
        return {data:false};
      }
    }
  });
  await assert.rejects(service.grantAdmin(' member@example.com '), /Sign in/);
  signedIn = true;
  assert.equal(await service.grantAdmin(' member@example.com '), false);
});
