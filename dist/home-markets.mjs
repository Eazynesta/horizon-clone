import {bindOverview} from './market-overview.mjs';
import {money,percentage} from './dashboard.mjs';
export function mountHomeMarkets(root){
 const ticker=root.querySelector('#home-live-ticker');if(!ticker)return;
 ticker.innerHTML=['BTC','ETH','BNB','SOL','XRP'].map(s=>'<span><strong>'+s+'/USDT</strong> <span data-home-price="'+s+'">—</span> <span data-home-change="'+s+'">—</span></span>').join('');
 return bindOverview(root,({assets,status})=>{
 const bySymbol=new Map(assets.map(a=>[a.symbol,a]));
 for(const el of root.querySelectorAll('[data-home-price]'))el.textContent=money(bySymbol.get(el.dataset.homePrice)?.price);
 for(const el of root.querySelectorAll('[data-home-change]')){const change=bySymbol.get(el.dataset.homeChange)?.change;el.textContent=percentage(change);el.classList.toggle('positive',change>=0);el.classList.toggle('negative',change<0);}
 for(const row of root.querySelectorAll('[data-home-market]')){const a=bySymbol.get(row.dataset.homeMarket);row.querySelector('[data-home-pair]').textContent=a?.pair||(a?.available===false?'Market unavailable':'Connecting…');for(const el of row.querySelectorAll('[data-home-field]'))el.textContent=el.dataset.homeField==='change'?percentage(a?.change):money(a?.[el.dataset.homeField]);}
 const volume=assets.filter(a=>a.quote==='USDT'&&Number.isFinite(a.volume));root.querySelector('[data-home-volume]').textContent=volume.length?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(volume.reduce((sum,a)=>sum+a.volume,0))+' USDT':'—';root.querySelector('[data-home-count]').textContent=assets.filter(a=>a.available).length||'—';root.querySelector('#home-market-status').textContent='Source: Kraken · '+status+' · Quote currencies shown per pair';
 });
}
