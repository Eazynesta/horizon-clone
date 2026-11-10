begin;

alter table public.finance_admin_memberships
  add column if not exists granted_by uuid;

create or replace function finance.grant_admin(account_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_id uuid;
  confirmed_at timestamptz;
  normalized_email text := lower(btrim(account_email));
begin
  if actor_id is null or not finance.is_admin() then
    raise exception 'Finance administrator access required' using errcode = '42501';
  end if;

  if normalized_email is null or length(normalized_email) > 254
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+$' then
    raise exception 'Enter a valid account email.';
  end if;

  begin
    select u.id, u.email_confirmed_at into strict target_id, confirmed_at
    from auth.users u
    where lower(u.email) = normalized_email
    for share;
  exception
    when no_data_found or too_many_rows then
      raise exception 'Enter the verified email of a single registered account.';
  end;

  if confirmed_at is null then
    raise exception 'This account must verify its email before receiving admin access.';
  end if;

  insert into public.finance_admin_memberships(user_id, granted_by)
  values (target_id, actor_id)
  on conflict (user_id) do nothing;
  return found;
end;
$$;

revoke all on function finance.grant_admin(text) from public, anon, authenticated;
grant execute on function finance.grant_admin(text) to authenticated;

create or replace function public.finance_grant_admin(account_email text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select finance.grant_admin(account_email); $$;

revoke all on function public.finance_grant_admin(text) from public, anon, authenticated;
grant execute on function public.finance_grant_admin(text) to authenticated;
notify pgrst, 'reload schema';

commit;
