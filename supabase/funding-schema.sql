create schema if not exists finance;
revoke all on schema finance from public,anon,authenticated;
create table public.funding_routes(asset text not null,network text not null,network_label text not null,decimals integer not null check(decimals between 0 and 18),address text,memo text,enabled boolean not null default false,deposit_fee numeric(38,18) not null default 0 check(deposit_fee>=0),primary key(asset,network),check(not enabled or length(address)>10));
insert into public.funding_routes(asset,network,network_label,decimals) values ('BTC','bitcoin','Bitcoin',8),
('ETH','ethereum','Ethereum',18),
('ETH','arbitrum','Arbitrum One',18),
('ETH','optimism','Optimism',18),
('ETH','base','Base',18),
('USDT','tron','TRON (TRC-20)',6),
('USDT','ethereum','Ethereum (ERC-20)',6),
('USDT','solana','Solana (SPL)',6),
('USDT','avalanche_c','Avalanche C-Chain',6),
('USDC','ethereum','Ethereum (ERC-20)',6),
('USDC','base','Base',6),
('USDC','arbitrum','Arbitrum One',6),
('USDC','optimism','Optimism',6),
('USDC','polygon','Polygon PoS',6),
('USDC','solana','Solana (SPL)',6),
('USDC','avalanche_c','Avalanche C-Chain',6),
('BNB','bsc','BNB Smart Chain (BEP-20)',18),
('SOL','solana','Solana',9),
('XRP','xrpl','XRP Ledger',6),
('DOGE','dogecoin','Dogecoin',8),
('ADA','cardano','Cardano',6),
('TRX','tron','TRON (TRC-20)',6),
('AVAX','avalanche_c','Avalanche C-Chain',18),
('LINK','ethereum','Ethereum (ERC-20)',18),
('LTC','litecoin','Litecoin',8),
('DOT','polkadot','Polkadot',10),
('BCH','bitcoincash','Bitcoin Cash',8);
create table public.wallet_balances(user_id uuid not null references auth.users on delete cascade,asset text not null,available numeric(38,18) not null default 0 check(available>=0),reserved numeric(38,18) not null default 0 check(reserved>=0),primary key(user_id,asset));
create table public.funding_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('deposit','simulation')),asset text not null,network text not null,amount numeric(38,18) not null check(amount>0 and amount<=1000000000000),fee numeric(38,18) not null default 0,address text,memo text,transaction_hash text,transfer_index integer not null default 0 check(transfer_index>=0),status text not null default 'awaiting_payment' check(status in ('awaiting_payment','pending_review','confirmed','rejected','held','cancelled')),cancel_requested boolean not null default false,created_at timestamptz not null default now(),review_note text,foreign key(asset,network) references public.funding_routes(asset,network));
create index funding_requests_user_created on public.funding_requests(user_id,created_at desc);
create unique index funding_transaction_once on public.funding_requests(network,transaction_hash,transfer_index) where kind='deposit' and transaction_hash is not null and status in ('pending_review','confirmed');
create table public.wallet_ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,asset text not null,request_id uuid not null references public.funding_requests,action text not null check(action in ('deposit_credit','simulation_hold','simulation_release')),available_delta numeric(38,18) not null,reserved_delta numeric(38,18) not null,created_at timestamptz not null default now(),unique(request_id,action));
create index wallet_ledger_user_created on public.wallet_ledger(user_id,created_at desc);
alter table public.funding_routes enable row level security;
alter table public.wallet_balances enable row level security;
alter table public.funding_requests enable row level security;
alter table public.wallet_ledger enable row level security;
revoke all on public.funding_routes,public.wallet_balances,public.funding_requests,public.wallet_ledger from anon,authenticated;
grant select on public.funding_routes,public.wallet_balances,public.funding_requests,public.wallet_ledger to authenticated;
grant insert(id,user_id,kind,asset,network,amount) on public.funding_requests to authenticated;
grant update(transaction_hash,transfer_index,cancel_requested) on public.funding_requests to authenticated;
create policy routes_read on public.funding_routes for select to authenticated using(true);
create policy wallet_owner on public.wallet_balances for select to authenticated using(user_id=(select auth.uid()));
create policy ledger_owner on public.wallet_ledger for select to authenticated using(user_id=(select auth.uid()));
create policy requests_owner_read on public.funding_requests for select to authenticated using(user_id=(select auth.uid()));
create policy requests_owner_insert on public.funding_requests for insert to authenticated with check(user_id=(select auth.uid()));
create policy requests_owner_update on public.funding_requests for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function finance.guard_request() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.funding_routes; begin
-- Operator SQL runs separately through finance.confirm_deposit; browser writes require a live session.
if current_setting('role',true) in ('authenticated','anon') then
 if auth.uid() is null or new.user_id<>auth.uid() or not exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid()) then raise exception 'A current signed-in session is required'; end if;
end if;
if tg_op='INSERT' then
 select * into strict r from public.funding_routes where asset=new.asset and network=new.network;
 if new.amount<>trunc(new.amount,r.decimals) then raise exception 'Amount exceeds asset precision'; end if;
 new.fee:=0;new.transaction_hash:=null;new.cancel_requested:=false;
 if new.kind='deposit' then
  if not r.enabled or r.address is null then raise exception 'Deposits are not configured for this network'; end if;
  if new.amount<=r.deposit_fee then raise exception 'Amount must exceed the deposit charge'; end if;
  new.address:=r.address;new.memo:=r.memo;new.fee:=r.deposit_fee;new.status:='awaiting_payment';
 else
  update public.wallet_balances set available=available-new.amount,reserved=reserved+new.amount where user_id=new.user_id and asset=new.asset and available>=new.amount;
  if not found then raise exception 'Insufficient available balance'; end if;
  new.status:='held';
 end if;
else
 if current_setting('role',true) not in ('authenticated','anon') then return new; end if;
 if old.kind='deposit' then
  if old.status<>'awaiting_payment' or new.cancel_requested then raise exception 'This deposit cannot be edited'; end if;
  new.transaction_hash:=trim(new.transaction_hash);
  if old.network='solana' then
   if new.transaction_hash !~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$' then raise exception 'Invalid Solana transaction signature'; end if;
  else
   new.transaction_hash:=lower(regexp_replace(new.transaction_hash,'^0x','','i'));
   if new.transaction_hash !~ '^[0-9a-f]{64}$' then raise exception 'Enter the full transaction hash'; end if;
  end if;
  if new.transaction_hash is null then raise exception 'A transaction hash is required'; end if;
  new.status:='pending_review';
 else
  if old.status<>'held' or not new.cancel_requested then raise exception 'Only a held simulation can be cancelled'; end if;
  update public.wallet_balances set available=available+old.amount,reserved=reserved-old.amount where user_id=old.user_id and asset=old.asset and reserved>=old.amount;
  if not found then raise exception 'Balance hold is inconsistent'; end if;
  new.status:='cancelled';
 end if;
end if; return new;end $$;
revoke all on function finance.guard_request() from public,anon,authenticated;
create trigger guard_funding_request before insert or update on public.funding_requests for each row execute function finance.guard_request();
create function finance.audit_simulation() returns trigger language plpgsql security definer set search_path='' as $$ begin
if new.kind='simulation' and tg_op='INSERT' then insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(new.user_id,new.asset,new.id,'simulation_hold',-new.amount,new.amount);
elsif new.kind='simulation' and new.status='cancelled' and old.status='held' then insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(new.user_id,new.asset,new.id,'simulation_release',new.amount,-new.amount);end if;return new;end $$;
revoke all on function finance.audit_simulation() from public,anon,authenticated;
create trigger audit_simulation after insert or update on public.funding_requests for each row execute function finance.audit_simulation();
create function finance.confirm_deposit(request uuid,verified_amount numeric,note text) returns void language plpgsql security invoker set search_path='' as $$
declare r public.funding_requests;d integer;begin
 select * into strict r from public.funding_requests where id=request for update;
 if r.kind<>'deposit' or r.status<>'pending_review' then raise exception 'Deposit is not pending review';end if;
 select decimals into d from public.funding_routes where asset=r.asset and network=r.network;
 if verified_amount is null or verified_amount<=r.fee or verified_amount>1000000000000 or verified_amount<>trunc(verified_amount,d) or length(trim(note))<5 then raise exception 'Verified amount and review evidence required';end if;
 insert into public.wallet_balances(user_id,asset,available) values(r.user_id,r.asset,verified_amount-r.fee) on conflict(user_id,asset) do update set available=public.wallet_balances.available+excluded.available;
 insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(r.user_id,r.asset,r.id,'deposit_credit',verified_amount-r.fee,0);
 update public.funding_requests set amount=verified_amount,status='confirmed',review_note=note where id=r.id;
end $$;
revoke all on function finance.confirm_deposit(uuid,numeric,text) from public,anon,authenticated;
grant usage on schema finance to service_role;
grant execute on function finance.confirm_deposit(uuid,numeric,text) to service_role;
grant all on public.funding_routes,public.wallet_balances,public.funding_requests,public.wallet_ledger to service_role;
