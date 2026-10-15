export const ASSETS = [
  { symbol:'YFI', name:'yearn.finance', price:8564.35, change:1.02, volume:'444.56 M', color:'#1973e9', mark:'Y', trending:true },
  { symbol:'MKR', name:'Maker', price:1837.36, change:-3.19, volume:'93.57 M', color:'#18b99c', mark:'M', trending:true },
  { symbol:'EGLD', name:'MultiversX', price:41.95, change:1.15, volume:'1.87 B', color:'#111827', mark:'X', trending:true },
  { symbol:'BTC', name:'Bitcoin', price:82290.57, change:3.10, volume:'1.81 B', color:'#f7931a', mark:'₿', icon:'btc', trending:true },
  { symbol:'KSM', name:'Kusama', price:31.91, change:-2.03, volume:'1.45 B', color:'#22222a', mark:'K', trending:true },
  { symbol:'ZEC', name:'Zcash', price:1155.38, change:-1.93, volume:'1.18 B', color:'#e5a52b', mark:'Z', trending:true },
  { symbol:'ETH', name:'Ethereum', price:2423.23, change:-2.01, volume:'1.15 B', color:'#627eea', mark:'◆', icon:'eth' },
  { symbol:'BCH', name:'Bitcoin Cash', price:277.20, change:2.70, volume:'827.12 M', color:'#8dc351', mark:'₿' },
  { symbol:'DYDX', name:'dYdX', price:1.58, change:1.91, volume:'138.31 M', color:'#302d62', mark:'X' },
  { symbol:'LRC', name:'Loopring', price:0.220225, change:1.55, volume:'75.20 M', color:'#1db9ee', mark:'◇' },
  { symbol:'KAVA', name:'Kava', price:0.519271, change:-1.90, volume:'63.14 M', color:'#f4434d', mark:'K' },
  { symbol:'WOO', name:'WOO', price:0.277333, change:-1.47, volume:'53.92 M', color:'#182433', mark:'W' },
  { symbol:'SOL', name:'Solana', price:105.55, change:1.21, volume:'2.81 B', color:'#8064f6', mark:'≋', icon:'sol' },
  { symbol:'BNB', name:'BNB', price:731.25, change:0.09, volume:'1.12 B', color:'#f3ba2f', mark:'◇', icon:'bnb' },
  { symbol:'XRP', name:'Ripple', price:1.3356, change:0.30, volume:'1.32 B', color:'#23292f', mark:'X', icon:'xrp' }
];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => '$' + value.toLocaleString('en-US', { minimumFractionDigits:value < 1 ? 6 : 2, maximumFractionDigits:value < 1 ? 6 : 2 });
export const percentage = value => (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
export const filterAssets = query => ASSETS.filter(a => (a.symbol + ' ' + a.name).toLowerCase().includes(query.trim().toLowerCase()));
export const gainers = () => ASSETS.filter(a => a.change > 0).sort((a,b) => b.change-a.change).slice(0,4);
export const losers = () => ASSETS.filter(a => a.change < 0).sort((a,b) => a.change-b.change).slice(0,4);
const paths = {
  dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  trade:'M3 17l6-6 4 4 8-10 M15 5h6v6',
  markets:'M3 3v18h18 M7 15v-5 M12 17V6 M17 17v-8',
  deposit:'M6 18L18 6 M7 6h11v11',
  withdraw:'M18 6L6 18 M6 7v11h11',
  bots:'M12 3v3 M8 3h8 M4 9h16v12H4z M1 13h3 M20 13h3 M8 13v3 M16 13v3',
  search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  wallet:'M20 7H5a2 2 0 0 1 0-4h13v4 M3 5v14a2 2 0 0 0 2 2h15V7 M20 11h-5v6h5 M17 14h.01',
  shield:'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6',
  bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  user:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-4a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v4',
  logout:'M9 3H3v18h6 M8 12h13 M16 7l5 5-5 5',
  arrow:'M4 12h16 M14 6l6 6-6 6',
  volume:'M2 12h5l3-9 4 18 3-9h5',
  down:'M3 7l6 6 4-4 8 10 M15 19h6v-6',
  bolt:'M13 2L3 14h8l-1 8 11-13h-8z',
  app:'M6 3l14 9L6 21z',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 2h6l1 4 4 1 2 5-3 3v4l-5 3-3-3H7l-4-4 1-4-2-4 4-3z',
  close:'M5 5l14 14 M19 5L5 19'
};
export function icon(name, extra='') { return `<svg class="ui-icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.markets}"/></svg>`; }
function coin(asset) {
  return asset.icon ? `<img class="coin-icon" alt="" src="/assets/${asset.icon}@2x.png">` : `<span class="coin-icon coin-letter" style="--coin:${asset.color}" aria-hidden="true">${asset.mark}</span>`;
}
function chart(asset) {
  let seed = [...asset.symbol].reduce((sum,c)=>sum+c.charCodeAt(0),0);
  const points = Array.from({length:26},(_,i) => { seed=(seed*1664525+1013904223)>>>0; const noise=(seed%21)-10; const trend=asset.change>0?60-i*1.5:20+i*1.5; return `${i*20},${Math.max(6,Math.min(76,trend+noise))}`; }).join(' ');
  return `<svg class="asset-sparkline ${asset.change>=0?'positive':'negative'}" viewBox="0 0 500 84" preserveAspectRatio="none" role="img" aria-label="Illustrative ${asset.symbol} price trend"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function assetCard(a) {
  return `<button class="asset-card" data-asset="${a.symbol}" aria-label="View ${a.name} market"><div class="asset-card-top">${coin(a)}<span class="asset-identity"><strong>${a.symbol}</strong><span>${a.name}</span></span><span class="change-badge ${a.change>=0?'positive':'negative'}">${percentage(a.change)}</span></div>${chart(a)}<div class="asset-card-bottom"><strong>${money(a.price)}</strong><span>Vol: $${a.volume}</span></div></button>`;
}
function ranking(title, assets, negative=false) {
  return `<section class="ranking-panel"><h2>${icon(negative?'down':'trade',negative?'negative':'positive')}${title} <span>(24h)</span></h2><ol>${assets.map((a,i)=>`<li><button data-asset="${a.symbol}"><span class="rank">${i+1}</span>${coin(a)}<span class="rank-identity"><strong>${a.symbol}</strong><small>${money(a.price)}</small></span><strong class="${negative?'negative':'positive'}">${percentage(a.change)}</strong></button></li>`).join('')}</ol></section>`;
}
export function dashboardHTML({firstName='there',preview=false,view='dashboard'}={}) {
  const top=gainers()[0],bottom=losers()[0];
  const nav=[['dashboard','Dashboard'],['trade','Trade'],['markets','Markets'],['deposit','Deposit'],['withdraw','Withdraw'],['bots','Bots']];
  return `<div class="exchange-dashboard">
    <header class="exchange-header"><a class="exchange-logo" href="#/" aria-label="Aurexmarkets Exchange home"><img src="/assets/aurex-logo.png" alt="Aurexmarkets Exchange"></a>
      <nav class="exchange-nav" aria-label="Exchange navigation">${nav.map(([id,label])=>`<button data-nav="${id}" class="exchange-nav-item ${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('')}</nav>
      <label class="market-search">${icon('search')}<input id="market-search" type="search" placeholder="Search markets..." aria-label="Search markets" maxlength="60"></label>
      <div class="header-tools"><button class="get-app" data-action="app" aria-label="Get App">${icon('app')}<span>Get App</span></button><button class="header-balance" data-action="balance">${icon('wallet')}<span>$0.00</span></button><button class="icon-button security-icon" data-action="security" aria-label="Account security">${icon('shield')}</button><button class="icon-button notification-button" data-action="notifications" aria-label="Notifications">${icon('bell')}<span class="notification-dot"></span></button><a class="icon-button" href="${preview?'#/login':'#/account'}" aria-label="Profile settings">${icon('user')}</a><button class="icon-button logout-button" data-action="${preview?'signin':'logout'}" aria-label="${preview?'Sign in':'Sign out'}">${icon('logout')}</button></div>
    </header>
    <main>
      <section class="dashboard-welcome"><div class="welcome-heading"><div><h1>${view==='markets'?'Explore the markets':`Welcome back, ${escapeHTML(firstName)}`}</h1><p>Here's the latest market overview.</p></div><div class="welcome-actions"><button class="secondary-button" data-nav="markets">${icon('markets')} Markets</button><button class="primary-button" data-nav="trade">${icon('bolt')} Trade Now</button></div></div>
      <div class="summary-grid"><article class="summary-card"><p>${icon('wallet')} Total Balance</p><strong class="summary-number">$0.00</strong></article><article class="summary-card"><p>${icon('volume')} 24h Volume</p><strong class="summary-number">$304.63 B</strong></article><article class="summary-card"><p>${icon('trade','positive')} Top Gainer</p><strong class="summary-asset">${top.symbol} <span class="positive">${percentage(top.change)}</span></strong></article><article class="summary-card"><p>${icon('down','negative')} Top Loser</p><strong class="summary-asset">${bottom.symbol} <span class="negative">${percentage(bottom.change)}</span></strong></article></div></section>
      <div class="dashboard-ticker" aria-label="Sample market ticker">${['BTC','BNB','SOL','XRP','ETH'].map(symbol=>{const a=ASSETS.find(a=>a.symbol===symbol);return `<button data-asset="${a.symbol}">${coin(a)}<strong>${a.symbol}/USDT</strong><span>${money(a.price)}</span><span class="${a.change>=0?'positive':'negative'}">${percentage(a.change)}</span></button>`;}).join('')}</div>
      <div class="dashboard-content"><div class="dashboard-disclosure"><span class="sample-dot"></span>${preview?'Dashboard preview':'Market overview'} · Sample market data. Trading and money transfers are not enabled.</div><section aria-labelledby="assets-title"><div class="section-heading"><h2 id="assets-title">${view==='markets'?'All Markets':'Trending Assets'}</h2><button class="view-all" id="view-all">View All ${icon('arrow')}</button></div><div class="asset-grid" id="asset-grid">${ASSETS.filter(a=>view==='markets'||a.trending).map(assetCard).join('')}</div><p id="search-empty" class="empty-market" hidden>No markets found. Try a name or symbol such as BTC.</p></section>
      <div class="ranking-grid">${ranking('Top Gainers',gainers())}${ranking('Top Losers',losers(),true)}</div>
      <footer class="dashboard-footer"><a href="#/">Aurexmarkets Exchange</a><span>Market data is illustrative. Account details are stored securely in your profile.</span><a href="${preview?'#/login':'#/account'}">Account settings ${icon('arrow')}</a></footer></div>
    </main><dialog class="market-dialog" id="market-dialog" aria-labelledby="market-dialog-title"><button class="dialog-close icon-button" aria-label="Close dialog">${icon('close')}</button><div id="dialog-content"></div></dialog>
  </div>`;
}
export function mountDashboard(root, options) {
  root.innerHTML=dashboardHTML(options);
  if(options.mainHTML) root.querySelector('main').innerHTML=options.mainHTML;
  const dialog=root.querySelector('#market-dialog');
  let lastFocus;
  function showDialog(title,content) {
    lastFocus=document.activeElement;
    root.querySelector('#dialog-content').innerHTML=`<p class="eyebrow">AUREXMARKETS EXCHANGE</p><h2 id="market-dialog-title">${escapeHTML(title)}</h2>${content}`;
    dialog.showModal();
  }
  const close=()=>{dialog.close();lastFocus?.focus();};
  dialog.querySelector('.dialog-close').onclick=close;
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('close',()=>lastFocus?.focus());
  function showAsset(symbol) {
    const a=ASSETS.find(a=>a.symbol===symbol); if(!a)return;
    showDialog(a.symbol+'/USDT',`<div class="asset-modal-heading">${coin(a)}<div><p>${a.name}</p><strong>${money(a.price)}</strong></div><span class="change-badge ${a.change>=0?'positive':'negative'}">${percentage(a.change)}</span></div>${chart(a)}<dl class="market-facts"><dt>24h change</dt><dd class="${a.change>=0?'positive':'negative'}">${percentage(a.change)}</dd><dt>24h volume</dt><dd>$${a.volume}</dd><dt>Quote currency</dt><dd>USDT</dd></dl><p class="dialog-explanation">This is an illustrative market preview. Order execution is not connected, and no funds can be deposited or traded.</p>`);
  }
  root.onclick = async e=>{
    const asset=e.target.closest('[data-asset]');if(asset){showAsset(asset.dataset.asset);return;}
    const nav=e.target.closest('[data-nav]');
    if(nav) {
      const page=nav.dataset.nav;
      if(['dashboard','markets','deposit','withdraw','bots'].includes(page)) {
        if(['deposit','withdraw','bots'].includes(page)) { location.hash='/'+page+(options.preview?'-preview':''); return; }
        if(options.preview && options.mainHTML) { location.hash='/dashboard-preview'; return; }
        if(options.preview) { options.view=page; mountDashboard(root,options); }
        else location.hash='/'+page;
      } else if(page==='trade') showDialog('Trading workspace','<p class="dialog-explanation">Choose a market to view its price snapshot. Trading and order execution are not enabled yet.</p><div class="market-shortcuts">'+ASSETS.slice(0,6).map(a=>`<button class="secondary-button" data-asset="${a.symbol}">${a.symbol}/USDT</button>`).join('')+'</div>');
      else if(page==='bots')showDialog('Trading bots','<p class="dialog-explanation">Automated trading is not connected. No bots are running on your account.</p>');
      else showDialog(page==='deposit'?'Deposits':'Withdrawals','<p class="dialog-explanation">Money transfers are not enabled. No wallet address or payment instructions are available, and no funds will be moved.</p>');
      return;
    }
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='logout'){const b=e.target.closest('button');b.disabled=true;try{await options.onLogout();}catch{b.disabled=false;showDialog('Unable to sign out','<p class="dialog-explanation">Check your connection and try again.</p>');}}
    if(action==='signin')location.hash='/login';
    if(action==='security')location.hash=options.preview?'/login':'/account';
    if(action==='notifications')showDialog('Notifications','<div class="notification-item">'+icon('shield','positive')+'<div><strong>Welcome to Aurexmarkets Exchange</strong><p>Manage your personal details and account security from your profile.</p></div></div>');
    if(action==='balance')showDialog('Account balance','<p class="dialog-explanation">No funded wallet is connected. Trading, deposits, and withdrawals are not enabled.</p>');
    if(action==='app')showDialog('Aurexmarkets on mobile','<p class="dialog-explanation">The native app is not available yet. You can use this responsive website on your phone.</p>');
  };
  if(options.mainHTML) {
    root.querySelector('#market-search').addEventListener('keydown', e=>{
      if(e.key!=='Enter')return; e.preventDefault();
      const assets=filterAssets(e.target.value);
      showDialog('Markets',assets.length?'<div class="market-shortcuts">'+assets.map(a=>`<button class="secondary-button" data-asset="${a.symbol}">${a.symbol}/USDT</button>`).join('')+'</div>':'<p class="dialog-explanation">No markets found. Try another name or symbol.</p>');
    });
    return;
  }
  let all=options.view==='markets';
  function filter() {
    const query=root.querySelector('#market-search').value;
    const assets=filterAssets(query).filter(a=>query||all||a.trending);
    root.querySelector('#asset-grid').innerHTML=assets.map(assetCard).join('');
    root.querySelector('#search-empty').hidden=assets.length>0;
    root.querySelector('#assets-title').textContent=query?'Search Results':all?'All Markets':'Trending Assets';
    root.querySelector('#view-all').hidden=!!query;
  }
  root.querySelector('#market-search').addEventListener('input',filter);
  root.querySelector('#view-all').onclick=()=>{all=!all;filter();root.querySelector('#view-all').innerHTML=(all?'Show Trending':'View All')+' '+icon('arrow');};
}
