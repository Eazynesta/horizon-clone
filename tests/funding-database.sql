begin;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','funding-rollback@example.invalid'),('10000000-0000-4000-8000-000000000002','admin-rollback@example.invalid'),('10000000-0000-4000-8000-000000000003','outsider-rollback@example.invalid');
insert into auth.sessions(id,user_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003');
insert into public.finance_admin_memberships(user_id) values('10000000-0000-4000-8000-000000000002');
update public.funding_routes set enabled=true,deposit_fee=0 where asset='BTC' and network='bitcoin';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
insert into public.funding_requests(id,user_id,kind,asset,network,amount) values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','deposit','BTC','bitcoin',1);
update public.funding_requests set transaction_hash=repeat('a',64) where id='30000000-0000-4000-8000-000000000001';
do $$begin
 if exists(select 1 from public.wallet_balances) then raise exception 'Reporting must not credit';end if;
 begin update public.wallet_balances set available=100;raise exception 'Direct balance editing allowed';exception when insufficient_privilege then null;end;
 begin insert into public.finance_admin_memberships(user_id) values(auth.uid());raise exception 'Self promotion allowed';exception when insufficient_privilege then null;end;
 begin perform public.finance_account_directory('');raise exception 'Directory leaked';exception when raise_exception then if sqlerrm='Directory leaked' then raise;end if;end;
 begin insert into public.finance_admin_commands(action,request_id,amount,note) values('approve_deposit','30000000-0000-4000-8000-000000000001',1,'Non-admin attempt');raise exception 'Non-admin approval allowed';exception when raise_exception then if sqlerrm='Non-admin approval allowed' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.finance_admin_commands(action,request_id,amount,note) values('approve_deposit','30000000-0000-4000-8000-000000000001',1,'Synthetic rollback chain verification');
do $$begin
 if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>1 then raise exception 'Credit incorrect';end if;
 begin insert into public.finance_admin_commands(action,request_id,amount,note) values('approve_deposit','30000000-0000-4000-8000-000000000001',1,'Repeated approval forbidden');raise exception 'Double credit allowed';exception when raise_exception then if sqlerrm='Double credit allowed' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.funding_requests(id,user_id,kind,asset,network,amount,address) values('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','withdrawal','BTC','bitcoin',0.5,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
do $$begin
 if (select available from public.wallet_balances where asset='BTC')<>0.5 or (select reserved from public.wallet_balances where asset='BTC')<>0.5 then raise exception 'Hold incorrect';end if;
 begin insert into public.funding_requests(user_id,kind,asset,network,amount,address) values(auth.uid(),'withdrawal','BTC','bitcoin',0.6,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT');raise exception 'Overspend allowed';exception when raise_exception then if sqlerrm='Overspend allowed' then raise;end if;end;
end $$;
update public.funding_requests set cancel_requested=true where id='30000000-0000-4000-8000-000000000002';
do $$begin
 if (select available from public.wallet_balances where asset='BTC')<>1 or (select reserved from public.wallet_balances where asset='BTC')<>0 then raise exception 'Cancellation incorrect';end if;
 begin update public.funding_requests set cancel_requested=true where id='30000000-0000-4000-8000-000000000002';raise exception 'Double refund allowed';exception when raise_exception then if sqlerrm='Double refund allowed' then raise;end if;end;
end $$;
insert into public.funding_requests(id,user_id,kind,asset,network,amount,address) values('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','withdrawal','BTC','bitcoin',0.4,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.finance_admin_commands(action,request_id,note) values('start_withdrawal','30000000-0000-4000-8000-000000000003','Synthetic payout processing lock');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 begin update public.funding_requests set cancel_requested=true where id='30000000-0000-4000-8000-000000000003';raise exception 'Processing cancellation allowed';exception when raise_exception then if sqlerrm='Processing cancellation allowed' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.finance_admin_commands(action,request_id,note,payout_hash,network_fee) values('pay_withdrawal','30000000-0000-4000-8000-000000000003','Synthetic payout recorded after external verification',repeat('b',64),0.00001);
do $$begin
 if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0.6 or (select reserved from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0 then raise exception 'Paid balance incorrect';end if;
 begin insert into public.finance_admin_commands(action,request_id,note,payout_hash,network_fee) values('pay_withdrawal','30000000-0000-4000-8000-000000000003','Repeated payout blocked',repeat('b',64),0.00001);raise exception 'Double payout allowed';exception when raise_exception then if sqlerrm='Double payout allowed' then raise;end if;end;
end $$;
insert into public.finance_admin_commands(action,account_id,asset,amount,note) values('adjust_balance','10000000-0000-4000-8000-000000000001','BTC',0.1,'Synthetic audited correction');
set constraints all immediate;
do $$begin
 if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0.7 then raise exception 'Adjustment incorrect';end if;
 begin insert into public.finance_admin_commands(action,account_id,asset,amount,note) values('adjust_balance','10000000-0000-4000-8000-000000000001','BTC',-1,'Excessive debit blocked');raise exception 'Negative balance allowed';exception when raise_exception then if sqlerrm='Negative balance allowed' then raise;end if;end;
 if (select sum(available_delta) from public.wallet_ledger where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0.7 or (select sum(reserved_delta) from public.wallet_ledger where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0 then raise exception 'Ledger mismatch';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.funding_requests(id,user_id,kind,asset,network,amount,address) values('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','withdrawal','BTC','bitcoin',0.2,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.finance_admin_commands(action,request_id,note) values('reject_withdrawal','30000000-0000-4000-8000-000000000004','Synthetic rejection before any funds were sent');
do $$begin if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0.7 or (select reserved from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0 then raise exception 'Rejection did not release hold';end if;end $$;
set constraints all deferred;
insert into public.finance_admin_commands(action,account_id,asset,amount,expected_available,note) values('set_available_balance','10000000-0000-4000-8000-000000000001','BTC',0.8,0.7,'Synthetic table balance edit');
do $$declare page jsonb;begin
if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0.8 then raise exception 'Cell edit not applied';end if;
begin insert into public.finance_admin_commands(action,account_id,asset,amount,expected_available,note) values('set_available_balance','10000000-0000-4000-8000-000000000001','BTC',0.9,0.7,'Synthetic stale cell write');raise exception 'Stale balance overwrite allowed';exception when raise_exception then if sqlerrm='Stale balance overwrite allowed' then raise;end if;end;
page:=public.finance_accounts_page('outsider-rollback@example.invalid',0);if (page->>'total')::integer<>1 or jsonb_array_length(page->'accounts'->0->'balances')<>0 then raise exception 'Zero-balance registered account missing';end if;
end $$;
insert into public.finance_admin_commands(action,account_id,asset,amount,expected_available,note) values('set_available_balance','10000000-0000-4000-8000-000000000001','BTC',0,0.8,'Synthetic zero balance cell edit');
do $$begin if (select available from public.wallet_balances where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0 or (select sum(available_delta) from public.wallet_ledger where user_id='10000000-0000-4000-8000-000000000001' and asset='BTC')<>0 then raise exception 'Zero target or ledger incorrect';end if;end $$;
set constraints all immediate;
reset role;
delete from auth.sessions where id='20000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin if finance.is_admin() then raise exception 'Revoked session retained admin rights';end if;begin perform public.finance_account_directory('');raise exception 'Revoked session read directory';exception when raise_exception then if sqlerrm='Revoked session read directory' then raise;end if;end;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","session_id":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin if exists(select 1 from public.wallet_balances) or exists(select 1 from public.funding_requests) or exists(select 1 from public.wallet_ledger) or exists(select 1 from public.finance_admin_commands) then raise exception 'Cross-account data leaked';end if;begin perform public.finance_accounts_page('',0);raise exception 'Non-admin read account table';exception when raise_exception then if sqlerrm='Non-admin read account table' then raise;end if;end;end $$;
reset role;
select 'PASS: admin isolation, one-time deposit credit, withdrawal holds/cancel/processing/payment, audited balance correction, no negative balance or cross-account leaks' as result;
rollback;