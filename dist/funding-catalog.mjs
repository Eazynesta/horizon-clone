import validator from './vendor/address-validator-0.5.26.mjs';
export const NETWORKS={bitcoin:{label:'Bitcoin',validator:'btc'},ethereum:{label:'Ethereum',validator:'eth',evm:true},arbitrum:{label:'Arbitrum One',validator:'eth',evm:true},optimism:{label:'Optimism',validator:'eth',evm:true},base:{label:'Base',validator:'eth',evm:true},tron:{label:'TRON (TRC-20)',validator:'trx'},solana:{label:'Solana',validator:'sol',memoLabel:'Memo'},bsc:{label:'BNB Smart Chain (BEP-20)',validator:'eth',evm:true},polygon:{label:'Polygon PoS',validator:'eth',evm:true},avalanche_c:{label:'Avalanche C-Chain',validator:'eth',evm:true},xrpl:{label:'XRP Ledger',validator:'xrp',memoLabel:'Destination tag'},dogecoin:{label:'Dogecoin',validator:'doge'},cardano:{label:'Cardano',validator:'ada'},litecoin:{label:'Litecoin',validator:'ltc'},polkadot:{label:'Polkadot',validator:'dot'},bitcoincash:{label:'Bitcoin Cash',validator:'bch'}};
export const FUNDING_ASSETS={
 BTC:{name:'Bitcoin',decimals:8,icon:'btc',networks:['bitcoin']},
 ETH:{name:'Ethereum',decimals:18,icon:'eth',networks:['ethereum','arbitrum','optimism','base']},
 USDT:{name:'Tether USDt',decimals:6,mark:'₮',networks:['tron','bsc','ethereum','solana','avalanche_c']},
 USDC:{name:'USD Coin',decimals:6,mark:'$',networks:['ethereum','bsc','base','arbitrum','optimism','polygon','solana','avalanche_c']},
 BNB:{name:'BNB',decimals:18,icon:'bnb',networks:['bsc']},
 SOL:{name:'Solana',decimals:9,icon:'sol',networks:['solana']},
 XRP:{name:'XRP',decimals:6,icon:'xrp',networks:['xrpl']},
 DOGE:{name:'Dogecoin',decimals:8,icon:'doge',networks:['dogecoin']},
 ADA:{name:'Cardano',decimals:6,icon:'ada',networks:['cardano']},
 TRX:{name:'TRON',decimals:6,icon:'trx',networks:['tron']},
 AVAX:{name:'Avalanche',decimals:18,mark:'A',networks:['avalanche_c']},
 LINK:{name:'Chainlink',decimals:18,mark:'L',networks:['ethereum']},
 LTC:{name:'Litecoin',decimals:8,mark:'Ł',networks:['litecoin']},
 DOT:{name:'Polkadot',decimals:10,mark:'●',networks:['polkadot']},
 BCH:{name:'Bitcoin Cash',decimals:8,mark:'₿',networks:['bitcoincash']}
};
export function networkLabel(asset,network){const label=NETWORKS[network]?.label||network;return network==='ethereum'&&['USDT','USDC','LINK'].includes(asset)?'Ethereum (ERC-20)':network==='solana'&&['USDT','USDC'].includes(asset)?'Solana (SPL)':label;}
export function assertRoute(asset,network){if(!FUNDING_ASSETS[asset]?.networks.includes(network))throw Error('Choose a supported cryptocurrency and network.');}
export function toUnits(value,asset,{allowZero=false}={}){const decimals=FUNDING_ASSETS[asset]?.decimals;if(decimals===undefined)throw Error('Unsupported asset.');const text=String(value).trim();if(!/^\d+(\.\d+)?$/.test(text))throw Error('Enter an amount using digits and a decimal point.');const [whole,rawFraction='']=text.split('.');const fraction=rawFraction.replace(/0+$/,'');if(fraction.length>decimals)throw Error(asset+' supports up to '+decimals+' decimal places.');if(whole.length>13)throw Error('Amount is too large.');const units=BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0')||'0');if(units>1000000000000n*10n**BigInt(decimals)||(!allowZero&&units===0n))throw Error('Enter a positive amount no greater than 1 trillion '+asset+'.');return units;}
export function fromUnits(units,asset){const decimals=FUNDING_ASSETS[asset].decimals,scale=10n**BigInt(decimals),whole=units/scale,fraction=(units%scale).toString().padStart(decimals,'0').replace(/0+$/,'');return whole.toString()+(fraction?'.'+fraction:'');}
export function transferQuote(amount,fee,asset){const gross=toUnits(amount,asset),charge=toUnits(fee,asset,{allowZero:true});if(gross<=charge)throw Error('The amount must exceed the configured deposit charge.');return {amount:fromUnits(gross,asset),fee:fromUnits(charge,asset),receive:fromUnits(gross-charge,asset)};}
export function validateMemo(network,memo=''){const value=String(memo).trim();if(value.length>128)throw Error('Memo must be 128 characters or fewer.');if(network==='xrpl'&&value&&(!/^\d+$/.test(value)||BigInt(value)>4294967295n))throw Error('XRP destination tag must be an integer from 0 to 4294967295.');return value;}
export function validateAddress(network,address){const value=String(address||'').trim(),n=NETWORKS[network];if(!n)throw Error('Unsupported network.');let valid=false;try{valid=validator.validate(value,n.validator,'prod');}catch{}if(n.evm&&/^0x0{40}$/i.test(value))valid=false;if(!valid)throw Error('Enter a valid mainnet '+n.label+' address.');return value;}
export function normalizeTransaction(network,hash){const text=String(hash||'').trim();if(network==='solana'){if(!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(text))throw Error('Enter the Solana transaction signature.');return text;}const normalized=text.replace(/^0x/i,'').toLowerCase();if(!/^[0-9a-f]{64}$/.test(normalized))throw Error('Enter the complete 64-character transaction hash.');return normalized;}

export const TOKEN_CONTRACTS={USDT:{bsc:{address:'0x55d398326f99059fF775485246999027B3197955',label:'Binance-Peg USDT (BSC-USD)'},ethereum:{address:'0xdAC17F958D2ee523a2206206994597C13D831ec7',label:'Tether USDt'},tron:{address:'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',label:'Tether USDt'}},USDC:{bsc:{address:'0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',label:'Binance-Peg USDC'},ethereum:{address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',label:'USD Coin'}}};
