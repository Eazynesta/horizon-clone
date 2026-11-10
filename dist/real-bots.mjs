import {mountDashboard,icon,escapeHTML} from './dashboard.mjs';
import {createTradingService,positiveDecimal} from './trading-service.mjs';

export function realBotsHTML(){
  return `<div class="bots-page paper-bots">
    <div class="paper-heading"><div><h1>Real Trading Bots</h1><p>Manage strategies for your real trading account.</p></div><span class="paper-label">REAL ACCOUNT</span></div>
    <div class="paper-notice"><p id="real-bot-status" role="status">Connecting to trading service…</p><button id="real-bot-refresh" type="button" class="secondary-button">Refresh</button></div>
    <section class="bots-panel bot-settings"><h2>Bot Settings</h2>
      <form id="real-bot-settings"><fieldset class="real-bot-fields" disabled>
        <div class="bot-settings-grid">
          <div class="transfer-field"><label for="real-bot-pair">Trading pair</label><select id="real-bot-pair" name="pair" required></select></div>
          <div class="transfer-field"><label for="real-bot-amount">Trade amount (quote currency)</label><input id="real-bot-amount" name="amount" inputmode="decimal" required></div>
          <div class="transfer-field"><label for="real-bot-interval">Trade interval (seconds)</label><input id="real-bot-interval" name="interval" type="number" min="1" step="1" required></div>
          <div class="transfer-field"><label for="real-bot-leverage">Leverage</label><input id="real-bot-leverage" name="leverage" type="number" min="1" step="1" required></div>
        </div><button class="secondary-button" type="submit">Save Settings</button>
      </fieldset></form>
    </section>
    <section class="bots-panel"><h2>${icon('bots')} Strategy Controls</h2>
      <div class="paper-stats">
        <div><span>Trades</span><strong id="real-bot-count">—</strong></div>
        <div><span>Win Rate</span><strong id="real-bot-win-rate">—</strong></div>
        <div><span>Realized P&amp;L</span><strong id="real-bot-pnl">—</strong></div>
        <div><span>Strategy Balance</span><strong id="real-bot-balance">—</strong></div>
      </div>
      <div class="paper-controls"><button id="real-bot-start" class="deposit-continue" type="button" disabled>Start Real Bot</button><button id="real-bot-stop" class="transfer-back" type="button" disabled>Stop Bot</button></div>
      <p id="real-bot-feedback" role="status" class="transfer-caption"></p>
      <div class="paper-log"><h4>Bot Logs</h4><div id="real-bot-logs"></div></div>
    </section>
    <section class="bots-panel"><h2>Trade History</h2><div id="real-bot-history"></div></section>
  </div>`;
}

export function mountRealBots(root,options){
  mountDashboard(root,{...options,view:'real-bots',mainHTML:realBotsHTML()});
  const page=root.querySelector('.bots-page'),q=id=>page.querySelector('#'+id);
  const form=q('real-bot-settings'),fields=form.querySelector('fieldset');
  const service=createTradingService(options.getAccounts);
  const feedback=q('real-bot-feedback');
  let state,busy=false,dirty=false,pending=null;
  const list=(id,items,empty)=>{
    q(id).innerHTML=Array.isArray(items)&&items.length
      ? items.map(item=>`<p>${escapeHTML(item.time)} ${escapeHTML(item.text)}</p>`).join('')
      : `<p class="transfer-caption">${empty}</p>`;
  };
  function render(){
    const stopped=state?.status==='stopped';
    fields.disabled=busy||state?.enabled!==true||!stopped;
    q('real-bot-start').disabled=fields.disabled||dirty||!state?.settings;
    q('real-bot-stop').disabled=busy||state?.canStop!==true;
    q('real-bot-refresh').disabled=busy;
    q('real-bot-count').textContent=state?.stats?.trades??'—';
    q('real-bot-win-rate').textContent=state?.stats?.winRate??'—';
    q('real-bot-pnl').textContent=state?.stats?.pnl??'—';
    q('real-bot-balance').textContent=state?.stats?.balance??'—';
    list('real-bot-logs',state?.logs,state?'No bot logs yet.':'Bot logs unavailable.');
    list('real-bot-history',state?.history,state?'No trades yet.':'Trade history unavailable.');
  }
  function fill(){
    const settings=state.settings||{};
    form.elements.pair.replaceChildren(new Option('Choose a pair',''),...(state.pairs||[]).map(pair=>new Option(pair,pair)));
    for(const key of ['pair','amount','interval','leverage'])form.elements[key].value=settings[key]??'';
  }
  async function update(command){
    if(busy)return;
    busy=true;feedback.textContent='';render();
    try{
      if(command){
        const key=JSON.stringify(command);
        if(pending?.key!==key)pending={key,id:crypto.randomUUID()};
        state=await service.botCommand({...command,requestId:pending.id});
        pending=null;
        dirty=false;
      }else state=await service.bot();
      if(!page.isConnected)return;
      if(!dirty)fill();
      q('real-bot-status').textContent=state.enabled===true?'Strategy status: '+state.status:'Real bot access is unavailable.';
      if(command)feedback.textContent='Strategy status: '+state.status;
    }catch(error){
      state=null;
      if(page.isConnected)q('real-bot-status').textContent=error.message;
    }finally{
      busy=false;
      if(page.isConnected)render();
    }
  }
  form.oninput=()=>{dirty=true;q('real-bot-start').disabled=true;};
  form.onsubmit=e=>{
    e.preventDefault();
    if(fields.disabled)return;
    const {pair,amount,interval,leverage}=Object.fromEntries(new FormData(form));
    if(!positiveDecimal(amount)||!Number.isSafeInteger(+interval)||+interval<1||!Number.isSafeInteger(+leverage)||+leverage<1){
      feedback.textContent='Enter a valid positive amount, interval, and leverage.';
      return;
    }
    update({action:'save',settings:{pair,amount,interval:+interval,leverage:+leverage}});
  };
  q('real-bot-start').onclick=()=>{if(!q('real-bot-start').disabled&&window.confirm('Start this strategy on your real account?'))update({action:'start'});};
  q('real-bot-stop').onclick=()=>{if(!q('real-bot-stop').disabled)update({action:'stop'});};
  q('real-bot-refresh').onclick=()=>update();
  update();
  window.scrollTo(0,0);
}
