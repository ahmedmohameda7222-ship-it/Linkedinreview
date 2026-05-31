-- Professional dashboard/CV tracking upgrade.
-- Run after 001_schema.sql and 002_rls_policies.sql.

create table if not exists public.cv_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_file_name text not null,
  stored_file_path text not null,
  public_url text,
  file_size bigint not null default 0,
  mime_type text not null default 'application/pdf',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cv_files_pdf_check check (mime_type = 'application/pdf'),
  constraint cv_files_size_check check (file_size > 0 and file_size <= 10485760)
);

alter table public.cv_files enable row level security;

drop policy if exists cv_files_select_own on public.cv_files;
create policy cv_files_select_own on public.cv_files for select to authenticated using (auth.uid() = user_id);
drop policy if exists cv_files_insert_own on public.cv_files;
create policy cv_files_insert_own on public.cv_files for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists cv_files_update_own on public.cv_files;
create policy cv_files_update_own on public.cv_files for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists cv_files_delete_own on public.cv_files;
create policy cv_files_delete_own on public.cv_files for delete to authenticated using (auth.uid() = user_id);

create index if not exists cv_files_user_id_idx on public.cv_files(user_id);
create index if not exists cv_files_active_idx on public.cv_files(active);

drop trigger if exists cv_files_set_updated_at on public.cv_files;
create trigger cv_files_set_updated_at before update on public.cv_files for each row execute function public.set_updated_at();

alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies
  add constraint companies_status_check check (status in ('Not applied', 'Applied', 'Viewed LinkedIn', 'Downloaded CV', 'Opened CV', 'Interview', 'Rejected', 'Offer', 'Archived', 'Link Opened'));

alter table public.tracking_links add column if not exists destination_url text;
alter table public.tracking_links drop constraint if exists tracking_links_slug_format_check;
alter table public.tracking_links
  add constraint tracking_links_slug_format_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$');
alter table public.tracking_links drop constraint if exists tracking_links_target_type_check;
alter table public.tracking_links
  add constraint tracking_links_target_type_check check (target_type in ('linkedin', 'cv', 'cv_download', 'cv_view'));

alter table public.cv_events add column if not exists cv_file_id uuid references public.cv_files(id) on delete set null;
alter table public.cv_events drop constraint if exists cv_events_type_check;
alter table public.cv_events
  add constraint cv_events_type_check check (event_type in ('link_opened', 'view', 'download'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-files', 'cv-files', true, 10485760, array['application/pdf'])
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

drop policy if exists cv_storage_select_own on storage.objects;
create policy cv_storage_select_own on storage.objects for select to authenticated
using (bucket_id = 'cv-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists cv_storage_insert_own on storage.objects;
create policy cv_storage_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'cv-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists cv_storage_update_own on storage.objects;
create policy cv_storage_update_own on storage.objects for update to authenticated
using (bucket_id = 'cv-files' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'cv-files' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.track_cv_event_and_get_payload(
  p_slug text,
  p_event_type text,
  p_user_agent text default null,
  p_ip_hash text default null,
  p_country text default null,
  p_browser text default null,
  p_device_type text default null,
  p_os text default null,
  p_is_bot boolean default false
)
returns table(status text, linkedin_url text, cv_file_url text, full_name text, company_name text, job_title text, user_id uuid, company_id uuid, tracking_link_id uuid, cv_file_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.tracking_links%rowtype;
  v_profile public.profiles%rowtype;
  v_company public.companies%rowtype;
  v_cv_file public.cv_files%rowtype;
  v_duplicate boolean := false;
  v_file_url text;
begin
  if p_event_type not in ('link_opened', 'view', 'download') then
    return query select 'invalid_event'::text, null::text, null::text, null::text, null::text, null::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_link from public.tracking_links where slug = lower(trim(p_slug)) limit 1;
  if v_link.id is null then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if v_link.active is not true then
    return query select 'inactive'::text, null::text, null::text, null::text, null::text, null::text, v_link.user_id, v_link.company_id, v_link.id, null::uuid;
    return;
  end if;

  select * into v_profile from public.profiles p where p.user_id = v_link.user_id limit 1;
  select * into v_company from public.companies where id = v_link.company_id limit 1;
  select * into v_cv_file from public.cv_files f where f.user_id = v_link.user_id and f.active is true order by f.created_at desc limit 1;
  v_file_url := coalesce(v_cv_file.public_url, v_profile.cv_file_url);

  if p_ip_hash is not null and p_user_agent is not null then
    select exists(
      select 1 from public.cv_events e
      where e.tracking_link_id = v_link.id
        and e.event_type = p_event_type
        and e.ip_hash = p_ip_hash
        and coalesce(e.user_agent, '') = coalesce(p_user_agent, '')
        and e.created_at > timezone('utc', now()) - interval '30 seconds'
    ) into v_duplicate;
  end if;

  insert into public.cv_events (
    user_id, company_id, tracking_link_id, cv_file_id, event_type, slug, ip_hash, user_agent, country, browser, device_type, os, is_bot, is_duplicate
  ) values (
    v_link.user_id,
    v_link.company_id,
    v_link.id,
    v_cv_file.id,
    p_event_type,
    v_link.slug,
    left(nullif(p_ip_hash, ''), 128),
    left(nullif(p_user_agent, ''), 1000),
    left(nullif(p_country, ''), 80),
    left(nullif(p_browser, ''), 80),
    left(nullif(p_device_type, ''), 80),
    left(nullif(p_os, ''), 80),
    coalesce(p_is_bot, false),
    v_duplicate
  );

  insert into public.timeline_events (user_id, company_id, event_type, title, description, metadata)
  values (
    v_link.user_id,
    v_link.company_id,
    case when p_event_type = 'link_opened' then 'cv_link_opened' when p_event_type = 'view' then 'cv_viewed' else 'cv_downloaded' end,
    case when p_event_type = 'link_opened' then 'CV link opened' when p_event_type = 'view' then 'CV viewed online' else 'CV downloaded' end,
    concat('CV event classified as ', case when v_duplicate then 'duplicate' when coalesce(p_is_bot, false) then 'bot' else 'human/unknown' end, '.'),
    jsonb_build_object('slug', v_link.slug, 'event_type', p_event_type, 'is_duplicate', v_duplicate, 'is_bot', coalesce(p_is_bot, false), 'cv_file_id', v_cv_file.id)
  );

  if p_event_type = 'view' and v_company.status in ('Not applied', 'Applied', 'Link Opened') then
    update public.companies set status = 'Opened CV' where id = v_company.id;
  elsif p_event_type = 'download' and v_company.status in ('Not applied', 'Applied', 'Link Opened', 'Opened CV') then
    update public.companies set status = 'Downloaded CV' where id = v_company.id;
  end if;

  return query select 'ok'::text, v_profile.linkedin_url, v_file_url, v_profile.full_name, v_company.name, v_company.job_title, v_link.user_id, v_link.company_id, v_link.id, v_cv_file.id;
end;
$$;

revoke all on function public.track_cv_event_and_get_payload(text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.track_cv_event_and_get_payload(text, text, text, text, text, text, text, text, boolean) to anon, authenticated;
