
-- Manual finance workflow. No blockchain transfers are executed by this application.
alter table public.funding_requests drop constraint funding_requests_kind_check;
alter table public.funding_requests add constraint funding_requests_kind_check check(kind in ('deposit','simulation','withdrawal'));
alter table public.funding_requests drop constraint funding_requests_status_check;
alter table public.funding_requests add constraint funding_requests_status_check check(status in ('awaiting_payment','pending_review','confirmed','rejected','held','cancelled','processing','paid'));
alter table public.funding_requests add column reviewed_by uuid references auth.users,add column reviewed_at timestamptz,add column processing_by uuid references auth.users,add column payout_hash text,add column network_fee numeric(38,18) check(network_fee>=0);
create index funding_reviewed_by on public.funding_requests(reviewed_by);
create index funding_processing_by on public.funding_requests(processing_by);
create unique index funding_payout_once on public.funding_requests(network,payout_hash) where kind='withdrawal' and payout_hash is not null and status='paid';
create table public.finance_admin_memberships(user_id uuid primary key references auth.users on delete cascade,created_at timestamptz not null default now());
alter table public.finance_admin_memberships enable row level security;
revoke all on public.finance_admin_memberships from public,anon,authenticated;
grant select on public.finance_admin_memberships to authenticated;
create policy membership_self on public.finance_admin_memberships for select to authenticated using(user_id=(select auth.uid()));
create function finance.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.finance_admin_memberships where user_id=auth.uid()) and exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())); $$;
revoke all on function finance.is_admin() from public,anon;
grant usage on schema finance to authenticated;
grant execute on function finance.is_admin() to authenticated;
create policy finance_admin_requests on public.funding_requests for select to authenticated using((select finance.is_admin()));
create policy finance_admin_balances on public.wallet_balances for select to authenticated using((select finance.is_admin()));
create policy finance_admin_ledger on public.wallet_ledger for select to authenticated using((select finance.is_admin()));
grant insert(address,memo) on public.funding_requests to authenticated;
create table public.finance_admin_commands(id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users,action text not null check(action in ('approve_deposit','reject_deposit','start_withdrawal','pay_withdrawal','reject_withdrawal','adjust_balance')),request_id uuid references public.funding_requests,account_id uuid references auth.users,asset text,amount numeric(38,18),note text not null check(length(trim(note)) between 5 and 2000),payout_hash text,network_fee numeric(38,18) check(network_fee>=0),created_at timestamptz not null default now(),result_status text);
create index finance_commands_actor on public.finance_admin_commands(actor_id);
create index finance_commands_request on public.finance_admin_commands(request_id);
create index finance_commands_account on public.finance_admin_commands(account_id);
alter table public.finance_admin_commands enable row level security;
revoke all on public.finance_admin_commands from public,anon,authenticated;
grant select on public.finance_admin_commands to authenticated;
grant insert(id,action,request_id,account_id,asset,amount,note,payout_hash,network_fee) on public.finance_admin_commands to authenticated;
create policy commands_admin_read on public.finance_admin_commands for select to authenticated using((select finance.is_admin()));
create policy commands_admin_insert on public.finance_admin_commands for insert to authenticated with check((select finance.is_admin()) and actor_id=(select auth.uid()));
alter table public.wallet_ledger alter column request_id drop not null;
alter table public.wallet_ledger add column command_id uuid references public.finance_admin_commands deferrable initially deferred;
create unique index wallet_ledger_command_once on public.wallet_ledger(command_id) where command_id is not null;
alter table public.wallet_ledger add constraint ledger_source_required check(request_id is not null or command_id is not null);
alter table public.wallet_ledger drop constraint wallet_ledger_action_check;
alter table public.wallet_ledger add constraint wallet_ledger_action_check check(action in ('deposit_credit','simulation_hold','simulation_release','withdrawal_hold','withdrawal_release','withdrawal_paid','balance_adjustment'));
create function finance.normal_hash(network text,value text) returns text language plpgsql immutable security invoker set search_path='' as $$ declare h text:=trim(value);begin if h is null then raise exception 'Transaction hash required';end if;if network='solana' then if h !~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$' then raise exception 'Invalid Solana signature';end if;else h:=lower(regexp_replace(h,'^0x','','i'));if h !~ '^[0-9a-f]{64}$' then raise exception 'Enter the full transaction hash';end if;end if;return h;end $$;
revoke all on function finance.normal_hash(text,text) from public,anon,authenticated;
create or replace function finance.guard_request() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.funding_routes;internal_admin boolean:=pg_trigger_depth()>1 and finance.is_admin();begin
if current_setting('role',true) in ('authenticated','anon') then
 if auth.uid() is null or (new.user_id<>auth.uid() and not internal_admin) or not exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception 'A current signed-in session is required';end if;
end if;
if tg_op='UPDATE' and (internal_admin or current_setting('role',true) not in ('authenticated','anon')) then return new;end if;
if tg_op='INSERT' then
 select * into strict r from public.funding_routes where asset=new.asset and network=new.network;
 if new.amount<>trunc(new.amount,r.decimals) then raise exception 'Amount exceeds asset precision';end if;
 new.fee:=0;new.transaction_hash:=null;new.cancel_requested:=false;
 if new.kind='deposit' then
  if not r.enabled or r.address is null then raise exception 'Deposits are not configured for this network';end if;
  if new.amount<=r.deposit_fee then raise exception 'Amount must exceed the deposit charge';end if;
  new.address:=r.address;new.memo:=r.memo;new.fee:=r.deposit_fee;new.status:='awaiting_payment';
 elsif new.kind='withdrawal' then
  if not r.enabled then raise exception 'Withdrawals are unavailable on this route';end if;
  new.address:=trim(new.address);new.memo:=nullif(trim(new.memo),'');
  if new.address is null or length(new.address) not between 25 and 180 then raise exception 'A valid withdrawal address is required';end if;
  if new.network in ('ethereum','bsc','arbitrum','base','optimism','polygon','avalanche_c') and (new.address !~ '^0x[0-9a-fA-F]{40}$' or new.address ~* '^0x0{40}$') then raise exception 'Invalid EVM destination';end if;
  if new.memo is not null and length(new.memo)>128 then raise exception 'Memo is too long';end if;
  if new.network='xrpl' and new.memo is not null and (new.memo !~ '^[0-9]{1,10}$' or new.memo::numeric>4294967295) then raise exception 'Invalid XRP destination tag';end if;
  update public.wallet_balances set available=available-new.amount,reserved=reserved+new.amount where user_id=new.user_id and asset=new.asset and available>=new.amount;
  if not found then raise exception 'Insufficient available balance';end if;
  new.status:='pending_review';
 else raise exception 'New legacy simulations are disabled';
 end if;
else
 if old.kind='deposit' then
  if old.status<>'awaiting_payment' or new.cancel_requested then raise exception 'This deposit cannot be edited';end if;
  new.transaction_hash:=finance.normal_hash(old.network,new.transaction_hash);new.status:='pending_review';
 else
  if not ((old.kind='withdrawal' and old.status='pending_review') or (old.kind='simulation' and old.status='held')) or not new.cancel_requested then raise exception 'Only a request awaiting review can be cancelled';end if;
  if new.transaction_hash is distinct from old.transaction_hash or new.transfer_index<>old.transfer_index then raise exception 'Transaction details cannot be edited';end if;
  update public.wallet_balances set available=available+old.amount,reserved=reserved-old.amount where user_id=old.user_id and asset=old.asset and reserved>=old.amount;
  if not found then raise exception 'Balance hold is inconsistent';end if;new.status:='cancelled';
 end if;
end if;return new;end $$;
create or replace function finance.audit_simulation() returns trigger language plpgsql security definer set search_path='' as $$ begin
if new.kind='withdrawal' and tg_op='INSERT' then insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(new.user_id,new.asset,new.id,'withdrawal_hold',-new.amount,new.amount);
elsif new.kind in ('withdrawal','simulation') and new.status in ('cancelled','rejected') and old.status in ('pending_review','processing','held') then insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(new.user_id,new.asset,new.id,case when new.kind='simulation' then 'simulation_release' else 'withdrawal_release' end,new.amount,-new.amount);
end if;return new;end $$;
create function finance.process_admin_command() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.funding_requests;d integer;delta numeric;begin
if auth.uid() is null or not finance.is_admin() then raise exception 'Finance administrator access required';end if;new.actor_id:=auth.uid();
if new.action='adjust_balance' then
 if new.account_id is null or new.asset is null or new.amount is null or new.amount=0 or abs(new.amount)>1000000000000 then raise exception 'Account, asset and nonzero signed adjustment required';end if;
 select max(decimals) into d from public.funding_routes where asset=new.asset;
 if d is null or new.amount<>trunc(new.amount,d) then raise exception 'Unsupported asset or precision';end if;
 insert into public.wallet_balances(user_id,asset) values(new.account_id,new.asset) on conflict do nothing;
 update public.wallet_balances set available=available+new.amount where user_id=new.account_id and asset=new.asset and available+new.amount>=0;
 if not found then raise exception 'Adjustment exceeds available balance';end if;
 insert into public.wallet_ledger(user_id,asset,command_id,action,available_delta,reserved_delta) values(new.account_id,new.asset,new.id,'balance_adjustment',new.amount,0);new.result_status:='applied';return new;
end if;
select * into strict r from public.funding_requests where id=new.request_id for update;
new.account_id:=r.user_id;new.asset:=r.asset;
if new.action='approve_deposit' then
 perform finance.confirm_deposit(r.id,new.amount,new.note);new.result_status:='confirmed';
elsif new.action='reject_deposit' then
 if r.kind<>'deposit' or r.status<>'pending_review' then raise exception 'Deposit is not pending review';end if;
 update public.funding_requests set status='rejected',review_note=new.note where id=r.id;new.result_status:='rejected';
elsif new.action='start_withdrawal' then
 if r.kind<>'withdrawal' or r.status<>'pending_review' then raise exception 'Withdrawal is not pending review';end if;
 update public.funding_requests set status='processing',processing_by=auth.uid(),review_note=new.note where id=r.id;new.result_status:='processing';
elsif new.action='pay_withdrawal' then
 if r.kind<>'withdrawal' or r.status<>'processing' or r.processing_by<>auth.uid() then raise exception 'Start processing this withdrawal before recording payment';end if;
 new.payout_hash:=finance.normal_hash(r.network,new.payout_hash);
 if new.network_fee is null then raise exception 'Record the actual sending-wallet network fee';end if;
 update public.wallet_balances set reserved=reserved-r.amount where user_id=r.user_id and asset=r.asset and reserved>=r.amount;
 if not found then raise exception 'Balance hold is inconsistent';end if;
 insert into public.wallet_ledger(user_id,asset,request_id,action,available_delta,reserved_delta) values(r.user_id,r.asset,r.id,'withdrawal_paid',0,-r.amount);
 update public.funding_requests set status='paid',payout_hash=new.payout_hash,network_fee=new.network_fee,review_note=new.note where id=r.id;new.result_status:='paid';
elsif new.action='reject_withdrawal' then
 if r.kind<>'withdrawal' or r.status not in ('pending_review','processing') or (r.status='processing' and r.processing_by<>auth.uid()) then raise exception 'This withdrawal cannot be rejected by this administrator';end if;
 update public.wallet_balances set available=available+r.amount,reserved=reserved-r.amount where user_id=r.user_id and asset=r.asset and reserved>=r.amount;
 if not found then raise exception 'Balance hold is inconsistent';end if;
 update public.funding_requests set status='rejected',review_note=new.note where id=r.id;new.result_status:='rejected';
else raise exception 'Unsupported admin action';end if;
update public.funding_requests set reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;return new;end $$;
revoke all on function finance.process_admin_command() from public,anon,authenticated;
create trigger process_admin_command before insert on public.finance_admin_commands for each row execute function finance.process_admin_command();
create function finance.account_directory(query text) returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
if auth.uid() is null or not finance.is_admin() then raise exception 'Finance administrator access required';end if;
if length(query)>254 then raise exception 'Search query too long';end if;
return coalesce((select jsonb_agg(x) from (select u.id,u.email,p.first_name,p.last_name,u.created_at from auth.users u left join public.profiles p on p.id=u.id where coalesce(u.email,'') ilike '%'||query||'%' or concat_ws(' ',p.first_name,p.last_name) ilike '%'||query||'%' order by u.created_at desc limit 100)x),'[]'::jsonb);end $$;
revoke all on function finance.account_directory(text) from public,anon;
grant execute on function finance.account_directory(text) to authenticated;
create function public.finance_account_directory(query text default '') returns jsonb language sql stable security invoker set search_path='' as $$ select finance.account_directory(query); $$;
revoke all on function public.finance_account_directory(text) from public,anon;
grant execute on function public.finance_account_directory(text) to authenticated;
-- Grant only the existing, verified owner account named in the conversation.
insert into public.finance_admin_memberships(user_id) select id from auth.users where lower(email)='nestaamwangi@gmail.com' and email_confirmed_at is not null on conflict do nothing;

drop policy finance_admin_requests on public.funding_requests;
drop policy finance_admin_balances on public.wallet_balances;
drop policy finance_admin_ledger on public.wallet_ledger;
alter policy requests_owner_read on public.funding_requests using(user_id=(select auth.uid()) or (select finance.is_admin()));
alter policy wallet_owner on public.wallet_balances using(user_id=(select auth.uid()) or (select finance.is_admin()));
alter policy ledger_owner on public.wallet_ledger using(user_id=(select auth.uid()) or (select finance.is_admin()));
create index funding_requests_route on public.funding_requests(asset,network);
