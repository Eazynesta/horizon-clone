export function createTradingService(getAccounts){
  async function rpc(name,args,write=false){
    const accounts=await getAccounts();
    if(!await accounts.user({fresh:write}))throw Error('Sign in to access real trading.');
    const {data,error}=await accounts.client.rpc(name,args);
    if(error){
      if(error.code==='PGRST202')throw Error('Trading service is not connected.');
      throw Error(write?'Request status could not be confirmed. Refresh before continuing.':'Unable to load trading data.');
    }
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Trading service returned an invalid response.');
    return data;
  }
  return {
    account:()=>rpc('real_trading_account'),
    placeOrder:order=>rpc('real_trading_place_order',{p_order:order},true),
    bot:()=>rpc('real_trading_bot'),
    botCommand:command=>rpc('real_trading_bot_command',{p_command:command},true)
  };
}

export const positiveDecimal=value=>/^\d+(\.\d+)?$/.test(value)&&/[1-9]/.test(value);
