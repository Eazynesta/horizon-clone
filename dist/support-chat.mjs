import {createSupportService} from './support-service.mjs';

export function mountSupportChat(panel,getAccounts) {
  const status=panel.querySelector('[data-support-status]');
  const history=panel.querySelector('[data-support-history]');
  const signIn=panel.querySelector('[data-support-sign-in]');
  const refreshButton=panel.querySelector('[data-support-refresh]');
  const form=panel.querySelector('form');
  const input=form.querySelector('input');
  const sendButton=form.querySelector('button');
  let version=0;

  function message(body,fromSupport) {
    const item=document.createElement('p');
    item.className=fromSupport?'help-reply':'help-question';
    item.textContent=(fromSupport?'Support: ':'You: ')+body;
    return item;
  }

  async function refresh(sent=false) {
    if (!panel.open) return;
    const current=++version;
    refreshButton.disabled=sendButton.disabled=true;
    status.textContent=sent?'Message sent. Loading messages…':'Loading messages…';
    try {
      const accounts=await getAccounts();
      const user=await accounts.user({fresh:true});
      if (current!==version) return;
      signIn.hidden=Boolean(user);
      if (!user) {
        form.hidden=history.hidden=true;
        history.replaceChildren();
        status.textContent='Sign in to message support and read replies.';
        return;
      }
      form.hidden=false;
      const rows=await createSupportService(accounts).mine();
      if (current!==version) return;
      history.replaceChildren(...rows.flatMap(row=>[
        message(row.body,false),
        ...row.support_replies.slice().sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
          .map(reply=>message(reply.body,true))
      ]));
      history.hidden=rows.length===0;
      history.scrollTop=0;
      status.textContent=sent?'Message sent.':rows.length?'':'No support messages yet.';
    } catch {
      if (current===version) status.textContent=sent
        ?'Message sent. Refresh to see your messages.'
        :'Unable to load support messages. Please try again.';
    } finally {
      if (current===version) refreshButton.disabled=sendButton.disabled=false;
    }
  }

  form.onsubmit=async event=>{
    event.preventDefault();
    const body=input.value.trim();
    if (!body || sendButton.disabled) return;
    const current=version;
    refreshButton.disabled=sendButton.disabled=input.disabled=true;
    status.textContent='Sending message…';
    try {
      await createSupportService(await getAccounts()).send(body);
      if (current!==version) return;
      form.reset();
      input.disabled=false;
      status.textContent='Message sent.';
      await refresh(true);
    } catch {
      if (current===version) status.textContent='Unable to send your message. Please try again.';
    } finally {
      if (current===version) refreshButton.disabled=sendButton.disabled=input.disabled=false;
    }
  };
  refreshButton.onclick=()=>refresh();
  panel.ontoggle=()=>{if(!refreshButton.disabled)refresh();};
  return {
    refresh:()=>{if(!refreshButton.disabled)refresh();},
    reset(){
      version++;
      history.replaceChildren();
      form.reset();
      form.hidden=history.hidden=signIn.hidden=true;
      refreshButton.disabled=sendButton.disabled=input.disabled=false;
      status.textContent='';
      if (panel.open) setTimeout(()=>{if(!refreshButton.disabled)refresh();},0);
    }
  };
}
