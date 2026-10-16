create table public.kyc_submissions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique default gen_random_uuid(),
 full_name text not null default '' check(char_length(full_name)<=160),
 date_of_birth date,
 country text not null default '' check(country='' or country ~ '^[A-Z]{2}$'),
 document_type text not null default 'passport' check(document_type in ('passport','national_id','drivers_license')),
 document_front_path text,
 document_back_path text,
 selfie_path text,
 consent_at timestamptz,
 status text not null default 'draft' check(status in ('draft','pending','verified','rejected')),
 review_note text not null default '' check(char_length(review_note)<=1000),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.kyc_submissions enable row level security;
revoke all on public.kyc_submissions from public,anon,authenticated;
grant select on public.kyc_submissions to authenticated;
grant insert(user_id) on public.kyc_submissions to authenticated;
grant update(full_name,date_of_birth,country,document_type,document_front_path,document_back_path,selfie_path,consent_at,status) on public.kyc_submissions to authenticated;
grant delete on public.kyc_submissions to authenticated;
create policy "Read own KYC" on public.kyc_submissions for select to authenticated using ((select auth.uid())=user_id);
create policy "Start own KYC" on public.kyc_submissions for insert to authenticated with check ((select auth.uid())=user_id and status='draft');
create policy "Edit unfinished own KYC" on public.kyc_submissions for update to authenticated using ((select auth.uid())=user_id and status in ('draft','rejected')) with check ((select auth.uid())=user_id and status in ('draft','pending'));
create policy "Remove unfinished own KYC" on public.kyc_submissions for delete to authenticated using ((select auth.uid())=user_id and status in ('draft','rejected'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('kyc-documents','kyc-documents',false,6291456,array['image/jpeg','image/png']);
create policy "Upload own unfinished KYC files" on storage.objects for insert to authenticated with check (
 bucket_id='kyc-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists (select 1 from public.kyc_submissions s where s.user_id=(select auth.uid()) and s.id::text=(storage.foldername(name))[2] and s.status in ('draft','rejected'))
);
create policy "Read own KYC files" on storage.objects for select to authenticated using (
 bucket_id='kyc-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy "Remove own unfinished KYC files" on storage.objects for delete to authenticated using (
 bucket_id='kyc-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists (select 1 from public.kyc_submissions s where s.user_id=(select auth.uid()) and s.id::text=(storage.foldername(name))[2] and s.status in ('draft','rejected'))
);
create function public.validate_kyc_submission() returns trigger language plpgsql security invoker set search_path='' as $$
declare file_path text;
begin
 new.updated_at=now();
 if new.status='pending' then
  if char_length(trim(new.full_name))<2 or new.date_of_birth is null or new.date_of_birth>current_date-interval '18 years' or new.date_of_birth<date '1900-01-01' or new.country='' or new.consent_at is null or new.document_front_path is null or new.selfie_path is null or (new.document_type<>'passport' and new.document_back_path is null) then
   raise exception 'Complete your details, required photos and consent before submitting.';
  end if;
  foreach file_path in array array[new.document_front_path,new.document_back_path,new.selfie_path] loop
   if file_path is not null and (file_path not like new.user_id::text||'/'||new.id::text||'/%' or not exists(select 1 from storage.objects o where o.bucket_id='kyc-documents' and o.name=file_path and (o.metadata->>'size')::bigint between 1 and 6291456 and o.metadata->>'mimetype' in ('image/jpeg','image/png'))) then
    raise exception 'Upload each required photo successfully before submitting.';
   end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.validate_kyc_submission() from public,anon,authenticated;
create trigger validate_kyc_submission before update on public.kyc_submissions for each row execute function public.validate_kyc_submission();
