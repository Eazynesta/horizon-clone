export const MARKET_ASSETS=[
  {
    "symbol": "YFI",
    "name": "yearn.finance",
    "color": "#1973e9",
    "mark": "Y",
    "trending": true
  },
  {
    "symbol": "MKR",
    "name": "Maker",
    "color": "#18b99c",
    "mark": "M"
  },
  {
    "symbol": "EGLD",
    "name": "MultiversX",
    "color": "#111827",
    "mark": "X",
    "trending": true
  },
  {
    "symbol": "BTC",
    "name": "Bitcoin",
    "color": "#f7931a",
    "mark": "₿",
    "icon": "btc",
    "trending": true
  },
  {
    "symbol": "KSM",
    "name": "Kusama",
    "color": "#22222a",
    "mark": "K",
    "trending": true
  },
  {
    "symbol": "ZEC",
    "name": "Zcash",
    "color": "#e5a52b",
    "mark": "Z",
    "trending": true
  },
  {
    "symbol": "ETH",
    "name": "Ethereum",
    "color": "#627eea",
    "mark": "◆",
    "icon": "eth",
    "trending": true
  },
  {
    "symbol": "BCH",
    "name": "Bitcoin Cash",
    "color": "#8dc351",
    "mark": "₿"
  },
  {
    "symbol": "DYDX",
    "name": "dYdX",
    "color": "#302d62",
    "mark": "X"
  },
  {
    "symbol": "LRC",
    "name": "Loopring",
    "color": "#1db9ee",
    "mark": "◇"
  },
  {
    "symbol": "KAVA",
    "name": "Kava",
    "color": "#f4434d",
    "mark": "K"
  },
  {
    "symbol": "WOO",
    "name": "WOO",
    "color": "#182433",
    "mark": "W"
  },
  {
    "symbol": "SOL",
    "name": "Solana",
    "color": "#8064f6",
    "mark": "≋",
    "icon": "sol"
  },
  {
    "symbol": "BNB",
    "name": "BNB",
    "color": "#f3ba2f",
    "mark": "◇",
    "icon": "bnb"
  },
  {
    "symbol": "XRP",
    "name": "Ripple",
    "color": "#23292f",
    "mark": "X",
    "icon": "xrp"
  },
  {
    "symbol": "DOGE",
    "name": "Dogecoin",
    "icon": "doge",
    "color": "#c2a633",
    "mark": "Ð"
  },
  {
    "symbol": "ADA",
    "name": "Cardano",
    "icon": "ada",
    "color": "#226ed0",
    "mark": "A"
  },
  {
    "symbol": "TRX",
    "name": "TRON",
    "icon": "trx",
    "color": "#e7243a",
    "mark": "T"
  }
];
const values=new Map(),histories=new Map(),listeners=new Set(),instruments=new Map();let subscribed='';let socket,retry,watchdog,attempt=0,lastMessage=0,status='Connecting',pending=new Set(),queue=[],active=0;
export const overviewAssets=()=>MARKET_ASSETS.map(a=>({...a,...values.get(a.symbol),history:histories.get(a.symbol)||[]}));
export const overviewState=()=>({assets:overviewAssets(),status});
const notify=()=>{const state=overviewState();for(const listener of listeners)listener(state);};
function pump(){while(active<2&&queue.length&&listeners.size){const symbol=queue.shift(),a=overviewAssets().find(a=>a.symbol===symbol);active++;fetch('/api/market-data?symbol='+encodeURIComponent(a.pair)+'&interval=60').then(r=>{if(!r.ok)throw Error();return r.json();}).then(body=>{histories.set(symbol,body.candles.slice(-25));notify();}).catch(()=>{values.set(symbol,{...values.get(symbol),historyError:true});notify();}).finally(()=>{active--;pump();});}}
export function requestHistory(symbol){const a=overviewAssets().find(a=>a.symbol===symbol);if(!a?.pair||pending.has(symbol))return;pending.add(symbol);queue.push(symbol);pump();}
function connect(){if(!listeners.size)return;status=attempt?'Reconnecting · prices may be stale':'Connecting';notify();lastMessage=Date.now();socket=new WebSocket('wss://ws.kraken.com/v2');socket.onopen=()=>{subscribed='';instruments.clear();socket.send(JSON.stringify({method:'subscribe',params:{channel:'instrument',snapshot:true}}));};socket.onmessage=event=>{lastMessage=Date.now();let m;try{m=JSON.parse(event.data);}catch{return;}
if(m.channel==='instrument'&&m.data?.pairs){if(m.type==='snapshot')instruments.clear();for(const p of m.data.pairs)instruments.set(p.symbol,p);const pairs=[...instruments.values()].filter(p=>p.status==='online');const selected=[];for(const a of MARKET_ASSETS){const p=pairs.find(p=>p.symbol===a.symbol+'/USDT')||pairs.find(p=>p.symbol===a.symbol+'/USD');if(p){values.set(a.symbol,{...values.get(a.symbol),pair:p.symbol,quote:p.symbol.split('/')[1],available:true});selected.push(p.symbol);}else values.set(a.symbol,{available:false});}const signature=selected.join(',');if(selected.length&&signature!==subscribed){if(subscribed)socket.send(JSON.stringify({method:'unsubscribe',params:{channel:'ticker',symbol:subscribed.split(',')}}));subscribed=signature;socket.send(JSON.stringify({method:'subscribe',params:{channel:'ticker',symbol:selected,snapshot:true}}));}notify();}
if(m.channel==='ticker'&&Array.isArray(m.data)){attempt=0;status='Live';for(const t of m.data){const a=overviewAssets().find(a=>a.pair===t.symbol);if(!a)continue;values.set(a.symbol,{...values.get(a.symbol),price:t.last,change:t.change_pct,high:t.high,low:t.low,volume:t.volume*t.vwap,updatedAt:Date.now()});const history=histories.get(a.symbol);if(history?.length){const hour=Math.floor(Date.now()/3600000)*3600,last=history.at(-1);if(last.time===hour)last.close=t.last;else if(last.time<hour)history.push({time:hour,close:t.last});histories.set(a.symbol,history.slice(-25));}}notify();}
if(m.success===false){status='Some market data unavailable';notify();}};socket.onerror=()=>socket.close();socket.onclose=()=>{if(!listeners.size)return;status='Reconnecting · prices may be stale';notify();retry=setTimeout(connect,Math.min(30000,1000*2**Math.min(attempt++,5)));};}
export function subscribeOverview(listener){listeners.add(listener);listener(overviewState());if(listeners.size===1){connect();watchdog=setInterval(()=>{if(socket&&Date.now()-lastMessage>20000)socket.close();},5000);}return()=>{listeners.delete(listener);if(!listeners.size){clearTimeout(retry);clearInterval(watchdog);socket.onclose=null;socket.onmessage=null;socket.close();queue=[];pending=new Set(histories.keys());status='Connecting';}};}
export function bindOverview(root,listener){const marker=root.firstElementChild;let timer,latest;const stop=subscribeOverview(state=>{latest=state;if(!timer)timer=setTimeout(()=>{timer=null;if(marker.isConnected)listener(latest);},250);});const cleanup=()=>{stop();clearTimeout(timer);observer.disconnect();window.removeEventListener('pagehide',cleanup);};const observer=new MutationObserver(()=>{if(!marker.isConnected)cleanup();});observer.observe(root,{childList:true});window.addEventListener('pagehide',cleanup,{once:true});return cleanup;}
