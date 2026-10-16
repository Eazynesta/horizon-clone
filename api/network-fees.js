'use strict';
const RPC={ethereum:'https://ethereum-rpc.publicnode.com',bsc:'https://bsc-dataseed.bnbchain.org'};
const ASSETS={bitcoin:['BTC'],ethereum:['ETH','USDT','USDC','LINK'],bsc:['BNB','USDT','USDC'],tron:['TRX','USDT']};
const cache=new Map();
async function json(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Provider unavailable');return r.json();}
const positive=value=>{const n=Number(value);if(!Number.isFinite(n)||n<=0)throw Error('Invalid fee data');return n;};
async function quote(asset,network){
 const result={asset,network,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),estimatedNative:null,estimatedUsd:null};
 if(network==='bitcoin'){
  const rate=await Promise.any([json('https://mempool.space/api/v1/fees/recommended').then(b=>({rate:positive(b.halfHourFee),source:'mempool.space'})),json('https://blockstream.info/api/fee-estimates').then(b=>({rate:positive(b['3']),source:'Blockstream Esplora'}))]);
  Object.assign(result,{source:rate.source,rate:rate.rate,rateUnit:'sat/vB',nativeAsset:'BTC',estimatedNative:Math.ceil(rate.rate*140)/1e8,assumption:'Illustration: 140 vB transaction. Your wallet determines the actual size and fee.'});
 }else if(RPC[network]){
  const body=await json(RPC[network],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_gasPrice',params:[]})});
  if(!/^0x[0-9a-f]+$/i.test(body.result||''))throw Error('Invalid RPC response');const wei=positive(BigInt(body.result));
  const native=network==='ethereum'?'ETH':'BNB',isNative=asset===native;
  Object.assign(result,{source:network==='ethereum'?'PublicNode Ethereum RPC':'BNB Chain RPC',rate:wei/1e9,rateUnit:'Gwei / gas',nativeAsset:native,estimatedNative:isNative?wei*21000/1e18:null,assumption:isNative?'Illustration: 21,000 gas for a standard native-coin transfer. Contract interactions can cost more.':'Token transfers require a wallet-specific gas estimate. Gas is paid in '+native+', separately from '+asset+'.'});
 }else{
  const body=await json('https://api.trongrid.io/wallet/getchainparameters',{method:'POST'}),params=body.chainParameter;
  const energy=positive(params?.find(p=>p.key==='getEnergyFee')?.value),bandwidth=positive(params?.find(p=>p.key==='getTransactionFee')?.value);
  Object.assign(result,{source:'TRON Grid chain parameters',rate:energy/1e6,rateUnit:'TRX / energy',bandwidthRate:bandwidth/1e6,nativeAsset:'TRX',assumption:'Energy and bandwidth depend on the sending wallet and transaction. Total cost is confirmed by your wallet.'});
 }
 // Fiat conversion is informational and never deducted from a deposit or balance hold.
 if(result.estimatedNative!==null){try{const pair=result.nativeAsset==='BTC'?'XBTUSD':result.nativeAsset+'USD',body=await json('https://api.kraken.com/0/public/Ticker?pair='+pair);if(body.error?.length)throw Error();const price=positive(Object.values(body.result||{})[0]?.c?.[0]);result.estimatedUsd=result.estimatedNative*price;result.usdSource='Kraken '+pair;}catch{}}
 return result;
}
module.exports=async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}));}const url=new URL(req.url,'http://localhost'),asset=url.searchParams.get('asset'),network=url.searchParams.get('network');if(!ASSETS[network]?.includes(asset)){res.statusCode=400;return res.end(JSON.stringify({error:'Fee estimate unavailable for this asset/network'}));}try{const key=asset+':'+network,entry=cache.get(key);let result;if(entry&&Date.now()<Date.parse(entry.expiresAt))result=entry;else{result=await quote(asset,network);cache.set(key,result);}res.end(JSON.stringify(result));}catch{res.statusCode=502;res.end(JSON.stringify({error:'Live network fee unavailable. Check your sending wallet.'}));}};
module.exports.quote=quote;
