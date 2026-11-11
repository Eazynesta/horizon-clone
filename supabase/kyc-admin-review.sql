begin;

alter table public.kyc_submissions
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists kyc_pending_queue
  on public.kyc_submissions (consent_at, id) where status = 'pending';

drop policy if exists "Admins read pending KYC" on public.kyc_submissions;
create policy "Admins read pending KYC" on public.kyc_submissions
  for select to authenticated
  using (status = 'pending' and user_id <> (select auth.uid()) and (select finance.is_admin()));

drop policy if exists "Admins read submitted KYC photos" on storage.objects;
create policy "Admins read submitted KYC photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents' and (select finance.is_admin())
    and exists (
      select 1 from public.kyc_submissions s
      where s.status = 'pending' and s.user_id <> (select auth.uid())
        and s.user_id::text = (storage.foldername(name))[1]
        and s.id::text = (storage.foldername(name))[2]
        and name in (s.document_front_path, s.document_back_path, s.selfie_path)
    )
  );

create or replace function finance.approve_kyc(submission_id uuid, submission_version timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not finance.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  update public.kyc_submissions
  set status = 'verified', reviewed_at = now(), reviewed_by = auth.uid(),
      review_note = ''
  where id = submission_id and status = 'pending' and user_id <> auth.uid()
    and updated_at = submission_version;

  if not found then
    raise exception 'This submission is no longer available for approval. Refresh the queue.';
  end if;
end;
$$;

create or replace function public.approve_kyc(submission_id uuid, submission_version timestamptz)
returns void language sql security invoker set search_path = '' as $$
  select finance.approve_kyc(submission_id, submission_version);
$$;

revoke all on function finance.approve_kyc(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.approve_kyc(uuid, timestamptz) from public, anon, authenticated;
grant execute on function finance.approve_kyc(uuid, timestamptz) to authenticated;
grant execute on function public.approve_kyc(uuid, timestamptz) to authenticated;

commit;
