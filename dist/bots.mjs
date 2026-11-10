import {botWorkspaceHTML} from './bot-workspace.mjs';
import {mountDashboard} from './dashboard.mjs';
import {escapeHTML as esc} from './transfer-ui.mjs';
import {ACTIVATION_CODE,paperStorageKey,validateBotSettings,freshPaperBot,restorePaperBot,generatePaperTrade} from './paper-bot.mjs';

const dollars=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);

// Mount using the "real" template
export const botsHTML=()=>botWorkspaceHTML({real:true});

export function mountBots(root,options={}){
  mountDashboard(root,{...options,view:'bots',mainHTML:botsHTML()});
  
  const page=root.querySelector('.paper-bots'),q=s=>page.querySelector(s);
  let state=freshPaperBot(),storageKey=options.preview?paperStorageKey():null,ready=!!options.preview,timer=null,startAt=0,due=0,phase=-1;
  
  // Bypass the activation code and unlock the workspace immediately
  state.unlocked = true;

  function save(){
    if(!storageKey)return;
    try{
      localStorage.setItem(storageKey,JSON.stringify({...state,running:false}));
    }catch{
      q('#paper-feedback').textContent='Browser storage is unavailable. This session will not be saved.';
    }
  }

  function log(text){
    state.logs.push({time:Date.now(),text});
    state.logs=state.logs.slice(-100);
  }

  function row(t){
    return '<article class="paper-trade-row"><div><strong>'+t.side+' '+esc(t.pair)+'</strong><span class="'+(t.win?'positive':'negative')+'">'+(t.profitCents>=0?'+':'')+dollars(t.profitCents)+'</span></div><p>Synthetic entry: '+t.entry.toFixed(t.entry<10?5:2)+' · Exit: '+t.exit.toFixed(t.exit<10?5:2)+' <span class="paper-result '+(t.win?'positive':'negative')+'">'+(t.win?'WIN':'LOSS')+'</span></p><small>'+new Date(t.time).toLocaleString()+' · Amount '+dollars(t.amountCents)+' · '+t.leverage+'×</small></article>';
  }

  function render(){
    q('#bot-activation').hidden=state.unlocked;
    q('#paper-bot-workspace').hidden=!state.unlocked;
    q('#paper-status').textContent=state.running?'Running':'Stopped';
    q('#paper-status').classList.toggle('running',state.running);
    q('#paper-pair').textContent=state.settings.pair;
    q('#paper-trades').textContent=state.trades;
    q('#paper-win-rate').textContent=(state.trades?state.wins/state.trades*100:0).toFixed(1)+'%';
    q('#paper-profit').textContent=(state.profitCents>=0?'+':'')+dollars(state.profitCents);
    q('#paper-profit').className=state.profitCents>=0?'positive':'negative';
    q('#paper-balance').textContent=dollars(state.balanceCents);
    q('#paper-start').disabled=state.running||!ready;
    q('#paper-stop').disabled=!state.running;
    q('#paper-reset').disabled=state.running;
    q('#paper-settings').querySelectorAll('input,select,button').forEach(el=>el.disabled=state.running);
    q('#paper-history').innerHTML=state.history.length?state.history.map(row).join(''):'<p class="transfer-caption">No trades yet.</p>';
    q('#paper-last-trade').innerHTML=state.history[0]?row(state.history[0]):'';
    q('#paper-log-count').textContent=state.logs.length+' entries';
    q('#paper-log').replaceChildren();
    for(const l of state.logs){
      const p=document.createElement('p');
      p.textContent='['+new Date(l.time).toLocaleTimeString()+'] '+l.text;
      q('#paper-log').append(p);
    }
    q('#paper-log').scrollTop=q('#paper-log').scrollHeight;
    if(!state.running){
      q('#paper-countdown').textContent='Not running';
      q('#paper-progress').value=0;
    }
  }

  function fill(){
    q('#bot-asset').value=state.settings.pair;
    q('#bot-amount').value=(state.settings.amountCents/100).toFixed(2);
    q('#bot-interval').value=state.settings.interval;
    q('#bot-leverage').value=state.settings.leverage;
  }

  function stop(message='Bot stopped.'){
    if(timer)clearInterval(timer);
    timer=null;
    state.running=false;
    if(state.unlocked)log(message);
    save();
    if(page.isConnected){
      render();
      q('#paper-feedback').textContent=message;
    }
  }

  function tick(){
    if(!page.isConnected){stop();return;}
    const now=Date.now(),elapsed=(now-startAt)/(state.settings.interval*1000),nextPhase=Math.min(4,Math.floor(elapsed*5));
    if(nextPhase>phase){
      phase=nextPhase;
      log(['Market scan…','Trend analysis…','Liquidity check…','Candlestick review…','Executing trade…'][phase]);
      render();
    }
    q('#paper-countdown').textContent=Math.max(0,Math.ceil((due-now)/1000))+'s / '+state.settings.interval+'s';
    q('#paper-progress').value=Math.min(100,elapsed*100);
    
    if(now>=due){
      try{
        const trade=generatePaperTrade(state,now);
        log(trade.side+' '+trade.pair+' closed: '+(trade.profitCents>=0?'+':'')+dollars(trade.profitCents)+' · '+(trade.win?'WIN':'LOSS'));
        save();
        startAt=now;
        due=now+state.settings.interval*1000;
        phase=-1;
        render();
      }catch(e){
        stop(e.message);
        q('#paper-feedback').textContent=e.message;
      }
    }
  }

  q('#paper-settings').onsubmit=e=>{
    e.preventDefault();
    try{
      if(state.running)throw Error('Stop the bot before changing settings.');
      state.settings=validateBotSettings({
        pair:q('#bot-asset').value,
        amount:q('#bot-amount').value,
        interval:q('#bot-interval').value,
        leverage:q('#bot-leverage').value
      });
      save();
      render();
      q('#bot-settings-feedback').textContent='Settings saved.';
    }catch(e){
      q('#bot-settings-feedback').textContent=e.message;
    }
  };

  q('#paper-start').onclick=()=>{
    try{
      if(!ready||!state.unlocked)throw Error('Activate the bot first.');
      state.settings=validateBotSettings({
        pair:q('#bot-asset').value,
        amount:q('#bot-amount').value,
        interval:q('#bot-interval').value,
        leverage:q('#bot-leverage').value
      });
      if(state.balanceCents<state.settings.amountCents)throw Error('Insufficient funds for this trade amount.');
      state.running=true;
      startAt=Date.now();
      due=startAt+state.settings.interval*1000;
      phase=-1;
      log('Bot initialized. '+state.settings.pair+' · '+dollars(state.settings.amountCents)+' per trade.');
      q('#paper-feedback').textContent='Running trades.';
      save();
      render();
      tick();
      timer=setInterval(tick,1000);
    }catch(e){
      q('#paper-feedback').textContent=e.message;
    }
  };

  q('#paper-stop').onclick=()=>stop();
  
  q('#paper-reset').onclick=()=>{
    if(state.running)return;
    const settings=state.settings;
    state=freshPaperBot();
    state.unlocked=true;
    state.settings=settings;
    log('Account reset to $10,000.');
    save();
    render();
  };

  if(options.preview){
    try{state=restorePaperBot(localStorage.getItem(storageKey));}catch{}
    state.unlocked = true; // Ensure it stays unlocked
    fill();
    render();
  }else{
    Promise.resolve(options.getAccounts?.()).then(async accounts=>{
      const user=await accounts?.user();
      if(!user)throw Error('Please sign in to activate a bot.');
      if(!page.isConnected)return;
      storageKey=paperStorageKey(user.id);
      try{state=restorePaperBot(localStorage.getItem(storageKey));}catch{}
      state.unlocked = true; // Ensure it stays unlocked
      ready=true;
      fill();
      render();
    }).catch(e=>{
      // If not signed in, show error in the workspace feedback instead of passkey
      q('#paper-feedback').textContent=e.message;
    });
  }

  const onPageHide=()=>stop();
  const observer=new MutationObserver(()=>{
    if(!page.isConnected){
      stop('Bot stopped when leaving the page.');
      window.removeEventListener('pagehide',onPageHide);
      observer.disconnect();
    }
  });
  
  observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('pagehide',onPageHide,{once:true});
  window.scrollTo(0,0);
}