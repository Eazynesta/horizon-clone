begin;

drop policy if exists "Admins read registered profiles" on public.profiles;
create policy "Admins read registered profiles" on public.profiles
  for select to authenticated using ((select finance.is_admin()));

alter policy "Admins read pending KYC" on public.kyc_submissions
  using (
    status in ('pending','verified','rejected') and consent_at is not null
    and user_id <> (select auth.uid()) and (select finance.is_admin())
  );

alter policy "Admins read submitted KYC photos" on storage.objects
  using (
    bucket_id = 'kyc-documents' and (select finance.is_admin())
    and exists (
      select 1 from public.kyc_submissions s
      where s.status in ('pending','verified','rejected') and s.consent_at is not null
        and s.user_id <> (select auth.uid())
        and s.user_id::text = (storage.foldername(name))[1]
        and s.id::text = (storage.foldername(name))[2]
        and name in (s.document_front_path, s.document_back_path, s.selfie_path)
    )
  );

commit;
