import {botWorkspaceHTML} from './bot-workspace.mjs';
import {mountDashboard,escapeHTML} from './dashboard.mjs';
import {createTradingService,positiveDecimal} from './trading-service.mjs';

export const realBotsHTML=()=>botWorkspaceHTML({real:true});

export function mountRealBots(root,options){
  mountDashboard(root,{...options,view:'real-bots',mainHTML:realBotsHTML()});
  const page=root.querySelector('.bots-page'),q=id=>page.querySelector('#'+id);
  const form=q('paper-settings'),fields=form.querySelector('fieldset');
  const service=createTradingService(options.getAccounts);
  const feedback=q('paper-feedback');
  let state,busy=false,dirty=false,pending=null;
  const tradeRow=item=>`<article class="paper-trade-row"><div><strong>${escapeHTML(item.text)}</strong></div><small>${escapeHTML(item.time)}</small></article>`;
  const logRow=item=>`<p>${escapeHTML(item.time)} ${escapeHTML(item.text)}</p>`;
  const list=(id,items,empty,row)=>{
    q(id).innerHTML=Array.isArray(items)&&items.length
      ? items.map(row).join('')
      : `<p class="transfer-caption">${empty}</p>`;
  };
  function render(){
    const stopped=state?.status==='stopped';
    fields.disabled=busy||state?.enabled!==true||!stopped;
    q('paper-start').disabled=fields.disabled||dirty||!state?.settings;
    q('paper-stop').disabled=busy||state?.canStop!==true;
    q('real-bot-refresh').disabled=busy;
    q('paper-status').textContent=state?.status??'Unavailable';
    q('paper-status').classList.toggle('running',state?.status==='running');
    q('paper-pair').textContent=state?.settings?.pair??'Pair unavailable';
    q('paper-log-count').textContent=state?.logs?.length==null?'—':state.logs.length+' entries';
    q('paper-trades').textContent=state?.stats?.trades??'—';
    q('paper-win-rate').textContent=state?.stats?.winRate??'—';
    q('paper-profit').textContent=state?.stats?.pnl??'—';
    q('paper-balance').textContent=state?.stats?.balance??'—';
    const lastTrade=state?.history?.[0];
    q('paper-last-trade').innerHTML=lastTrade?tradeRow(lastTrade):'';
    list('paper-log',state?.logs,state?'No bot logs yet.':'Bot logs unavailable.',logRow);
    list('paper-history',state?.history,state?'No trades yet.':'Trade history unavailable.',tradeRow);
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
  form.oninput=()=>{dirty=true;q('paper-start').disabled=true;};
  form.onsubmit=e=>{
    e.preventDefault();
    if(fields.disabled)return;
    const {pair,amount,interval,leverage}=Object.fromEntries(new FormData(form));
    if(!positiveDecimal(amount)||!Number.isSafeInteger(+interval)||+interval<1||!Number.isSafeInteger(+leverage)||+leverage<1){
      q('bot-settings-feedback').textContent='Enter a valid positive amount, interval, and leverage.';
      return;
    }
    q('bot-settings-feedback').textContent='';
    update({action:'save',settings:{pair,amount,interval:+interval,leverage:+leverage}});
  };
  q('paper-start').onclick=()=>{if(!q('paper-start').disabled&&window.confirm('Start this strategy on your real account?'))update({action:'start'});};
  q('paper-stop').onclick=()=>{if(!q('paper-stop').disabled)update({action:'stop'});};
  q('real-bot-refresh').onclick=()=>update();
  update();
  window.scrollTo(0,0);
}
