import {escapeHTML as esc} from './transfer-ui.mjs';

export const supportInboxHTML = `
  <section class="deposit-panel finance-audit" id="admin-support">
    <div class="finance-section-heading">
      <h2>Support inbox</h2>
      <button type="button" class="secondary-button" data-support-refresh>Refresh inbox</button>
    </div>
    <p class="transfer-caption" role="status" data-support-status></p>
    <div data-support-list></div>
    <div class="transfer-actions">
      <button type="button" class="transfer-back" data-support-prev disabled>Previous</button>
      <button type="button" class="transfer-back" data-support-next disabled>Next</button>
    </div>
    <dialog class="finance-dialog" aria-labelledby="support-reply-title">
      <div class="finance-section-heading">
        <h2 id="support-reply-title">Reply to support message</h2>
        <button type="button" class="transfer-back" data-support-close>Close</button>
      </div>
      <div data-support-thread></div>
      <form data-support-form>
        <label for="support-reply-body">Reply</label>
        <textarea id="support-reply-body" maxlength="2000" required></textarea>
        <button class="deposit-continue" type="submit" disabled>Send reply</button>
        <p class="transfer-caption" role="status" data-support-feedback></p>
      </form>
    </dialog>
  </section>`;

const timestamp = value => esc(new Date(value).toLocaleString());

export function mountSupportInbox(panel, service, directory) {
  const q = selector => panel.querySelector(selector);
  const refresh=q('[data-support-refresh]'), previous=q('[data-support-prev]'), next=q('[data-support-next]');
  const status=q('[data-support-status]'), list=q('[data-support-list]'), dialog=q('dialog');
  const thread=q('[data-support-thread]'), form=q('[data-support-form]'), button=form.querySelector('button');
  const body=q('#support-reply-body'), feedback=q('[data-support-feedback]');
  let offset=0, rows=[], names=new Map(), selected=null, version=0, sending=false;

  async function load() {
    refresh.disabled=previous.disabled=next.disabled=true;
    try {
      const [data, accounts]=await Promise.all([service.inbox(offset),directory()]);
      names=new Map(accounts.map(account=>[account.id,account.email||account.id]));
      rows=data.slice(0,20);
      list.innerHTML=rows.map((row,index)=>`<article class="finance-request">
        <div class="finance-section-heading">
          <strong>${esc(names.get(row.user_id)||row.user_id)}</strong>
          <button type="button" class="secondary-button" data-support-open="${index}">Open message</button>
        </div>
        <p class="transfer-caption">${timestamp(row.created_at)} · ${row.support_replies.length ? 'Replied' : 'Needs reply'}</p>
        <p class="support-message">${esc(row.body)}</p>
      </article>`).join('');
      status.textContent=rows.length ? `Showing messages ${offset+1}–${offset+rows.length}.` : 'No support messages on this page.';
      next.disabled=data.length<=20;
    } catch (error) {
      status.textContent=error.message;
    } finally {
      refresh.disabled=false;
      previous.disabled=offset===0;
    }
  }

  async function loadThread(row, currentVersion) {
    const replies=await service.replies(row.id);
    if (!dialog.open || currentVersion!==version) return;
    thread.innerHTML=`<p class="transfer-caption">${esc(names.get(row.user_id)||row.user_id)} · ${timestamp(row.created_at)}</p>
      <p class="support-message">${esc(row.body)}</p>`+replies.map(reply=>
      `<p class="transfer-caption">Support · ${timestamp(reply.created_at)}</p><p class="support-message">${esc(reply.body)}</p>`).join('');
  }

  refresh.onclick=()=>{offset=0;load();};
  previous.onclick=()=>{offset-=20;load();};
  next.onclick=()=>{offset+=20;load();};
  list.onclick=async event=>{
    const open=event.target.closest('[data-support-open]');
    if (!open) return;
    selected=rows[Number(open.dataset.supportOpen)];
    const currentVersion=++version;
    form.reset();
    button.disabled=true;
    feedback.textContent='';
    thread.textContent='Loading message…';
    dialog.showModal();
    try {
      await loadThread(selected,currentVersion);
      if (dialog.open && currentVersion===version) button.disabled=false;
    } catch (error) {
      if (dialog.open && currentVersion===version) thread.textContent=error.message;
    }
  };
  q('[data-support-close]').onclick=()=>{if (!sending) dialog.close();};
  dialog.addEventListener('cancel',event=>{if (sending) event.preventDefault();});
  form.onsubmit=async event=>{
    event.preventDefault();
    const message=body.value.trim();
    if (!message || !selected || sending) return;
    const row=selected;
    sending=button.disabled=true;
    feedback.textContent='Sending reply…';
    try {
      await service.reply(row.id,message);
      form.reset();
      feedback.textContent='Reply sent.';
      await Promise.all([loadThread(row,version),load()]);
    } catch (error) {
      feedback.textContent=body.value ? error.message : 'Reply sent. Refresh to reload the conversation.';
    } finally {
      sending=button.disabled=false;
    }
  };
  return load();
}
