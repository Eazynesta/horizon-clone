alter table public.finance_admin_commands add column expected_available numeric(38,18);
grant insert(expected_available) on public.finance_admin_commands to authenticated;
alter table public.finance_admin_commands drop constraint finance_admin_commands_action_check;
alter table public.finance_admin_commands add constraint finance_admin_commands_action_check check(action in ('approve_deposit','reject_deposit','start_withdrawal','pay_withdrawal','reject_withdrawal','adjust_balance','set_available_balance'));
create or replace function finance.process_admin_command() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.funding_requests;d integer;delta numeric;current_available numeric;begin
if auth.uid() is null or not finance.is_admin() then raise exception 'Finance administrator access required';end if;new.actor_id:=auth.uid();
if new.action in ('adjust_balance','set_available_balance') then
 if new.account_id is null or new.asset is null or new.amount is null or (new.action='adjust_balance' and new.amount=0) or (new.action='set_available_balance' and new.amount<0) or abs(new.amount)>1000000000000 then raise exception 'Account, asset and nonzero signed adjustment required';end if;
 select max(decimals) into d from public.funding_routes where asset=new.asset;
 if d is null or new.amount<>trunc(new.amount,d) then raise exception 'Unsupported asset or precision';end if;
 insert into public.wallet_balances(user_id,asset) values(new.account_id,new.asset) on conflict do nothing;
 select available into strict current_available from public.wallet_balances where user_id=new.account_id and asset=new.asset for update;
 if new.action='set_available_balance' then
  if new.expected_available is null or current_available<>new.expected_available then raise exception 'Balance changed since this cell was loaded. Refresh and review before saving.';end if;
  delta:=new.amount-current_available;
 else delta:=new.amount;end if;
 if delta=0 then raise exception 'The new balance is unchanged';end if;
 update public.wallet_balances set available=available+delta where user_id=new.account_id and asset=new.asset and available+delta>=0;
 if not found then raise exception 'Adjustment exceeds available balance';end if;
 insert into public.wallet_ledger(user_id,asset,command_id,action,available_delta,reserved_delta) values(new.account_id,new.asset,new.id,'balance_adjustment',delta,0);new.result_status:='applied';return new;
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

create function finance.accounts_page(search text,page_offset integer) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare rows jsonb;total bigint;begin
if auth.uid() is null or not finance.is_admin() then raise exception 'Finance administrator access required';end if;
if search is null or length(search)>254 or page_offset is null or page_offset<0 or page_offset>1000000 then raise exception 'Invalid account search or page';end if;
select count(*) into total from auth.users u left join public.profiles p on p.id=u.id where coalesce(u.email,'') ilike '%'||search||'%' or concat_ws(' ',p.first_name,p.last_name) ilike '%'||search||'%';
select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select u.id,u.email,p.first_name,p.last_name,u.created_at,u.email_confirmed_at,coalesce((select jsonb_agg(jsonb_build_object('asset',b.asset,'available',b.available::text,'reserved',b.reserved::text) order by b.asset) from public.wallet_balances b where b.user_id=u.id),'[]'::jsonb) balances from auth.users u left join public.profiles p on p.id=u.id where coalesce(u.email,'') ilike '%'||search||'%' or concat_ws(' ',p.first_name,p.last_name) ilike '%'||search||'%' order by u.created_at desc,u.id limit 25 offset page_offset)x;
return jsonb_build_object('accounts',rows,'total',total);end $$;
revoke all on function finance.accounts_page(text,integer) from public,anon;
grant execute on function finance.accounts_page(text,integer) to authenticated;
create function public.finance_accounts_page(search text default '',page_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$ select finance.accounts_page(search,page_offset); $$;
revoke all on function public.finance_accounts_page(text,integer) from public,anon;
grant execute on function public.finance_accounts_page(text,integer) to authenticated;
notify pgrst,'reload schema';
