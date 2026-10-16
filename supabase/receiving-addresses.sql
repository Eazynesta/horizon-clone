insert into public.funding_routes(asset,network,network_label,decimals) values ('USDT','bsc','BNB Smart Chain (BEP-20)',6),('USDC','bsc','BNB Smart Chain (BEP-20)',6) on conflict(asset,network) do nothing;
update public.funding_routes set address='TVE8KKwSreVmq8C15quVzo7Pzr2ty4J2Mf',enabled=false where asset='USDT' and network='tron';
update public.funding_routes set address='0xba49a3c8a2ccec31a520d1bdb4053c416858df55',enabled=false where asset='USDT' and network='bsc';
update public.funding_routes set address='0xba49a3c8a2ccec31a520d1bdb4053c416858df55',enabled=false where asset='USDT' and network='ethereum';
update public.funding_routes set address='0xba49a3c8a2ccec31a520d1bdb4053c416858df55',enabled=false where asset='USDC' and network='bsc';
update public.funding_routes set address='0xba49a3c8a2ccec31a520d1bdb4053c416858df55',enabled=false where asset='USDC' and network='ethereum';
update public.funding_routes set address='3Jo7vER18q7F1VdQWDqDgwzFS3uTkWmShp',enabled=false where asset='BTC' and network='bitcoin';
update public.funding_routes set address='0xba49a3c8a2ccec31a520d1bdb4053c416858df55',enabled=false where asset='ETH' and network='ethereum';