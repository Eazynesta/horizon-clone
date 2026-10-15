-- Run once in the NEW Horizon project's SQL Editor.
-- Identities, passwords, verification, and sessions remain in Supabase Auth.
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  phone text not null default '' check (phone = '' or phone ~ '^\+[1-9][0-9]{6,14}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update (first_name, last_name, phone) on public.profiles to authenticated;
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "Create own profile" on public.profiles;
create policy "Create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
drop policy if exists "Edit own profile" on public.profiles;
create policy "Edit own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
commit;

-- Verify: RLS must be true and all three policies must be present.
select relrowsecurity from pg_class where oid = 'public.profiles'::regclass;
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'profiles';
