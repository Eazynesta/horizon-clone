import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradingService,positiveDecimal} from '../dist/trading-service.mjs';
import {tradeHTML} from '../dist/trade.mjs';
import {realBotsHTML} from '../dist/real-bots.mjs';

test('real trading uses authenticated Supabase RPCs with a fresh session check for writes',async()=>{
  const calls=[];
  const service=createTradingService(async()=>({
    user:async options=>{calls.push(options);return {id:'account'};},
    client:{rpc:async(name,args)=>{calls.push([name,args]);return {data:{enabled:true}};}}
  }));
  const order={pair:'PAXG/USD',type:'market',side:'buy',amount:'0.01',requestId:'intent'};
  const command={action:'start',requestId:'strategy-intent'};
  await service.account();
  await service.placeOrder(order);
  await service.bot();
  await service.botCommand(command);
  assert.deepEqual(calls,[
    {fresh:false},['real_trading_account',undefined],
    {fresh:true},['real_trading_place_order',{p_order:order}],
    {fresh:false},['real_trading_bot',undefined],
    {fresh:true},['real_trading_bot_command',{p_command:command}]
  ]);
});

test('missing RPCs and signed-out sessions fail without reporting a successful order',async()=>{
  let requests=0;
  const client={rpc:async()=>{requests++;return {error:{code:'PGRST202'}};}};
  await assert.rejects(createTradingService(async()=>({user:async()=>null,client})).account(),/Sign in/);
  assert.equal(requests,0);
  await assert.rejects(createTradingService(async()=>({user:async()=>({id:'account'}),client})).account(),/not connected/);
  assert.equal(requests,1);
});

test('real trading controls start disabled and public Trade remains a preview',()=>{
  assert.match(tradeHTML({real:true}),/id="trade-submit"[^>]+disabled/);
  assert.match(tradeHTML(),/Order preview/);
  assert.doesNotMatch(tradeHTML(),/Refresh account/);
  assert.match(realBotsHTML(),/id="real-bot-start"[^>]+disabled/);
  assert.match(realBotsHTML(),/id="real-bot-stop"[^>]+disabled/);
  assert.doesNotMatch(realBotsHTML(),/SIMULATED|\$10,000/);
  for(const amount of ['0','0.0','-1','1e8','Infinity',''])assert.equal(positiveDecimal(amount),false);
  assert.equal(positiveDecimal('0.000001'),true);
});
