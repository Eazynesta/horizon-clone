const PAIRS={BTC:'XBTUSDT',ETH:'ETHUSDT',BNB:'BNBUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};
module.exports=async function(req,res){
 if(req.method!=='GET'){res.statusCode=405;return res.end();}
 const url=new URL(req.url,'http://localhost'),symbol=url.searchParams.get('symbol')?.replace('/USDT',''),interval=Number(url.searchParams.get('interval'));
 if(!PAIRS[symbol]||![60,240,1440,10080].includes(interval)){res.statusCode=400;return res.end('Invalid market or interval');}
 try{const upstream=await fetch('https://api.kraken.com/0/public/OHLC?pair='+PAIRS[symbol]+'&interval='+interval,{signal:AbortSignal.timeout(8000)});if(!upstream.ok)throw Error();const body=await upstream.json();if(body.error?.length)throw Error();const rows=Object.entries(body.result).find(([key])=>key!=='last')?.[1];if(!Array.isArray(rows))throw Error();res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','public, s-maxage=15, stale-while-revalidate=30');res.end(JSON.stringify({candles:rows.slice(-120).map(c=>({time:Number(c[0]),open:Number(c[1]),high:Number(c[2]),low:Number(c[3]),close:Number(c[4])}))}));}catch{res.statusCode=502;res.end('Market history unavailable');}
};
