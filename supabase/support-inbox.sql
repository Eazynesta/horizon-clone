begin;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.support_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  admin_id uuid default auth.uid() references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index support_requests_owner_time on public.support_requests(user_id, created_at desc, id);
create index support_requests_time on public.support_requests(created_at desc, id);
create index support_replies_request_time on public.support_replies(request_id, created_at, id);

alter table public.support_requests enable row level security;
alter table public.support_replies enable row level security;
revoke all on public.support_requests, public.support_replies from public, anon, authenticated;
grant select on public.support_requests, public.support_replies to authenticated;
grant insert(body) on public.support_requests to authenticated;
grant insert(request_id, body) on public.support_replies to authenticated;

create policy support_request_read on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select finance.is_admin()));
create policy support_request_send on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy support_reply_read on public.support_replies for select to authenticated
  using (exists (select 1 from public.support_requests r where r.id = request_id));
create policy support_reply_send on public.support_replies for insert to authenticated
  with check (admin_id = (select auth.uid()) and (select finance.is_admin()));

commit;
