begin;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','funding-rollback@example.invalid'),('10000000-0000-4000-8000-000000000002','other-rollback@example.invalid');
insert into auth.sessions(id,user_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
update public.funding_routes set enabled=true,address='1BoatSLRHtKNngkdXEeobR76b53LETtpyT',deposit_fee=0.0001 where asset='BTC' and network='bitcoin';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
insert into public.funding_requests(id,user_id,kind,asset,network,amount) values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','deposit','BTC','bitcoin',1);
update public.funding_requests set transaction_hash=repeat('a',64) where id='30000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.wallet_balances)<>0 then raise exception 'Reporting credited funds';end if;
 begin update public.wallet_balances set available=100;raise exception 'Balance privilege failed';exception when insufficient_privilege then null;end;
 begin insert into public.funding_requests(user_id,kind,asset,network,amount) values('10000000-0000-4000-8000-000000000002','deposit','BTC','bitcoin',1);raise exception 'Ownership guard failed';exception when raise_exception then if sqlerrm='Ownership guard failed' then raise;end if;end;
end $$;
reset role;
select finance.confirm_deposit('30000000-0000-4000-8000-000000000001',1,'Test-only chain verification evidence');
do $$begin
 begin perform finance.confirm_deposit('30000000-0000-4000-8000-000000000001',1,'Repeated credit forbidden');raise exception 'Duplicate credit allowed';exception when raise_exception then if sqlerrm='Duplicate credit allowed' then raise;end if;end;
end $$;
set local role authenticated;
insert into public.funding_requests(id,user_id,kind,asset,network,amount) values('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','simulation','BTC','bitcoin',0.5);
do $$begin
 if (select available from public.wallet_balances where asset='BTC')<>0.4999 or (select reserved from public.wallet_balances where asset='BTC')<>0.5 then raise exception 'Hold incorrect';end if;
 begin insert into public.funding_requests(user_id,kind,asset,network,amount) values('10000000-0000-4000-8000-000000000001','simulation','BTC','bitcoin',0.6);raise exception 'Overspend allowed';exception when raise_exception then if sqlerrm='Overspend allowed' then raise;end if;end;
end $$;
update public.funding_requests set cancel_requested=true where id='30000000-0000-4000-8000-000000000002';
do $$begin
 if (select available from public.wallet_balances where asset='BTC')<>0.9999 or (select reserved from public.wallet_balances where asset='BTC')<>0 then raise exception 'Refund incorrect';end if;
 begin update public.funding_requests set cancel_requested=true where id='30000000-0000-4000-8000-000000000002';raise exception 'Double refund allowed';exception when raise_exception then if sqlerrm='Double refund allowed' then raise;end if;end;
 insert into public.funding_requests(id,user_id,kind,asset,network,amount) values('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','deposit','BTC','bitcoin',1);
 begin update public.funding_requests set transaction_hash=repeat('a',64) where id='30000000-0000-4000-8000-000000000003';raise exception 'Duplicate transaction allowed';exception when unique_violation then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin if exists(select 1 from public.wallet_balances) or exists(select 1 from public.funding_requests) or exists(select 1 from public.wallet_ledger) then raise exception 'Cross-user read allowed';end if;end $$;
reset role;
select 'PASS: owner isolation, no direct credits, one-time credit, duplicate hash rejection, insufficient balance, hold and cancellation' as result;
rollback;