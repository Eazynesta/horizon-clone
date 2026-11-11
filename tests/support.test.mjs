import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSupportChat} from '../dist/support-chat.mjs';
import {createSupportService} from '../dist/support-service.mjs';
import {adminHTML} from '../dist/admin.mjs';

test('support widget sends a message and refreshes to show an admin reply', async t=>{
  const requests=[];
  const client={
    from(table){
      return {
        insert(values){
          if(table==='support_requests') requests.push({...values,id:'request',support_replies:[]});
          else requests.find(row=>row.id===values.request_id).support_replies.push({...values,id:'reply'});
          return {error:null};
        },
        select(){return this;},
        eq(column,value){assert.deepEqual([column,value],['user_id','sender']);return this;},
        order(){return this;},
        limit(){return {data:requests};}
      };
    }
  };
  let signedIn=true;
  const accounts={client,user:async()=>signedIn?{id:'sender'}:null};
  const admin=createSupportService({client,user:async()=>({id:'administrator'})});
  const input={value:''}, sendButton={};
  const form={querySelector:selector=>selector==='input'?input:sendButton,reset:()=>{input.value='';}};
  const history={replaceChildren(...items){this.items=items;}};
  const nodes={
    '[data-support-status]':{},
    '[data-support-history]':history,
    '[data-support-sign-in]':{},
    '[data-support-refresh]':{},
    form
  };
  const panel={open:true,querySelector:selector=>nodes[selector]};
  t.mock.method(globalThis,'setTimeout',()=>{});
  const originalDocument=globalThis.document;
  globalThis.document={createElement:()=>({})};
  t.after(()=>{globalThis.document=originalDocument;});

  const widget=mountSupportChat(panel,async()=>accounts);
  await nodes['[data-support-refresh]'].onclick();
  input.value='  Can you help?  ';
  await form.onsubmit({preventDefault(){}});
  assert.equal(nodes['[data-support-status]'].textContent,'Message sent.');
  assert.equal(input.value,'');
  assert.equal(requests[0].body,'Can you help?');
  await admin.reply(requests[0].id,'Yes, we can.');
  await nodes['[data-support-refresh]'].onclick();
  assert.deepEqual(history.items.map(item=>item.textContent),['You: Can you help?','Support: Yes, we can.']);

  signedIn=false;
  widget.reset();
  assert.deepEqual(history.items,[]);
  await nodes['[data-support-refresh]'].onclick();
  assert.equal(form.hidden,true);
  assert.equal(nodes['[data-support-sign-in]'].hidden,false);
  assert.match(adminHTML(),/id="admin-support"/);
  assert.doesNotMatch(adminHTML({preview:true}),/id="admin-support"/);
});
