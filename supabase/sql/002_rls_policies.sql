alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.tracking_links enable row level security;
alter table public.clicks enable row level security;
alter table public.cv_events enable row level security;
alter table public.timeline_events enable row level security;
alter table public.reminders enable row level security;

-- Profiles: each authenticated user can manage only their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete to authenticated using (auth.uid() = user_id);

-- Companies/applications.
drop policy if exists companies_select_own on public.companies;
create policy companies_select_own on public.companies for select to authenticated using (auth.uid() = user_id);
drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own on public.companies for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists companies_delete_own on public.companies;
create policy companies_delete_own on public.companies for delete to authenticated using (auth.uid() = user_id);

-- Tracking links.
drop policy if exists tracking_links_select_own on public.tracking_links;
create policy tracking_links_select_own on public.tracking_links for select to authenticated using (auth.uid() = user_id);
drop policy if exists tracking_links_insert_own on public.tracking_links;
create policy tracking_links_insert_own on public.tracking_links for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists tracking_links_update_own on public.tracking_links;
create policy tracking_links_update_own on public.tracking_links for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tracking_links_delete_own on public.tracking_links;
create policy tracking_links_delete_own on public.tracking_links for delete to authenticated using (auth.uid() = user_id);

-- Clicks and CV events are read-only to dashboard users. Public inserts happen through SECURITY DEFINER RPCs.
drop policy if exists clicks_select_own on public.clicks;
create policy clicks_select_own on public.clicks for select to authenticated using (auth.uid() = user_id);
drop policy if exists cv_events_select_own on public.cv_events;
create policy cv_events_select_own on public.cv_events for select to authenticated using (auth.uid() = user_id);

-- Timeline.
drop policy if exists timeline_events_select_own on public.timeline_events;
create policy timeline_events_select_own on public.timeline_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists timeline_events_insert_own on public.timeline_events;
create policy timeline_events_insert_own on public.timeline_events for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists timeline_events_update_own on public.timeline_events;
create policy timeline_events_update_own on public.timeline_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists timeline_events_delete_own on public.timeline_events;
create policy timeline_events_delete_own on public.timeline_events for delete to authenticated using (auth.uid() = user_id);

-- Reminders.
drop policy if exists reminders_select_own on public.reminders;
create policy reminders_select_own on public.reminders for select to authenticated using (auth.uid() = user_id);
drop policy if exists reminders_insert_own on public.reminders;
create policy reminders_insert_own on public.reminders for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists reminders_update_own on public.reminders;
create policy reminders_update_own on public.reminders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reminders_delete_own on public.reminders;
create policy reminders_delete_own on public.reminders for delete to authenticated using (auth.uid() = user_id);

create or replace function public.track_profile_click_and_get_target(
  p_slug text,
  p_referrer text default null,
  p_user_agent text default null,
  p_ip_hash text default null,
  p_country text default null,
  p_browser text default null,
  p_device_type text default null,
  p_os text default null,
  p_is_bot boolean default false
)
returns table(status text, target_url text, user_id uuid, company_id uuid, tracking_link_id uuid, should_notify boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.tracking_links%rowtype;
  v_company public.companies%rowtype;
  v_target_url text;
  v_duplicate boolean := false;
  v_click_type text := 'unknown';
  v_should_notify boolean := false;
begin
  select * into v_link from public.tracking_links where slug = lower(trim(p_slug)) limit 1;

  if v_link.id is null then
    return query select 'not_found'::text, null::text, null::uuid, null::uuid, null::uuid, false::boolean;
    return;
  end if;

  if v_link.active is not true then
    return query select 'inactive'::text, null::text, v_link.user_id, v_link.company_id, v_link.id, false::boolean;
    return;
  end if;

  select * into v_company from public.companies where id = v_link.company_id limit 1;
  select linkedin_url into v_target_url from public.profiles where user_id = v_link.user_id limit 1;

  if v_target_url is null or length(trim(v_target_url)) = 0 then
    return query select 'missing_target'::text, null::text, v_link.user_id, v_link.company_id, v_link.id, false::boolean;
    return;
  end if;

  if p_ip_hash is not null and p_user_agent is not null then
    select exists(
      select 1 from public.clicks c
      where c.tracking_link_id = v_link.id
        and c.ip_hash = p_ip_hash
        and coalesce(c.user_agent, '') = coalesce(p_user_agent, '')
        and c.clicked_at > timezone('utc', now()) - interval '30 seconds'
    ) into v_duplicate;
  end if;

  if v_duplicate then
    v_click_type := 'duplicate';
  elsif coalesce(p_is_bot, false) then
    v_click_type := 'bot';
  elsif p_user_agent is null or length(trim(p_user_agent)) = 0 then
    v_click_type := 'unknown';
  else
    v_click_type := 'human';
  end if;

  insert into public.clicks (
    user_id, company_id, tracking_link_id, clicked_at, referrer, user_agent, ip_hash, country, browser, device_type, os, is_bot, is_duplicate, click_type
  ) values (
    v_link.user_id,
    v_link.company_id,
    v_link.id,
    timezone('utc', now()),
    left(nullif(p_referrer, ''), 1000),
    left(nullif(p_user_agent, ''), 1000),
    left(nullif(p_ip_hash, ''), 128),
    left(nullif(p_country, ''), 80),
    left(nullif(p_browser, ''), 80),
    left(nullif(p_device_type, ''), 80),
    left(nullif(p_os, ''), 80),
    coalesce(p_is_bot, false),
    v_duplicate,
    v_click_type
  );

  insert into public.timeline_events (user_id, company_id, event_type, title, description, metadata)
  values (
    v_link.user_id,
    v_link.company_id,
    'link_clicked',
    'LinkedIn link clicked',
    concat(v_link.source, ' link classified as ', v_click_type, '.'),
    jsonb_build_object('slug', v_link.slug, 'source', v_link.source, 'click_type', v_click_type)
  );

  if v_click_type = 'human' then
    if v_link.first_human_click_at is null then
      update public.tracking_links set first_human_click_at = timezone('utc', now()) where id = v_link.id;
      v_should_notify := true;
    end if;

    if v_company.status = 'Applied' then
      update public.companies set status = 'Link Opened' where id = v_company.id;
      insert into public.timeline_events (user_id, company_id, event_type, title, description, metadata)
      values (v_link.user_id, v_company.id, 'status_changed', 'Status changed', 'Applied → Link Opened', jsonb_build_object('from', 'Applied', 'to', 'Link Opened', 'automatic', true));
    end if;
  end if;

  return query select 'ok'::text, v_target_url::text, v_link.user_id, v_link.company_id, v_link.id, v_should_notify;
end;
$$;

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
returns table(status text, linkedin_url text, cv_file_url text, full_name text, company_name text, job_title text, user_id uuid, company_id uuid, tracking_link_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.tracking_links%rowtype;
  v_profile public.profiles%rowtype;
  v_company public.companies%rowtype;
  v_duplicate boolean := false;
begin
  if p_event_type not in ('view', 'download') then
    return query select 'invalid_event'::text, null::text, null::text, null::text, null::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_link from public.tracking_links where slug = lower(trim(p_slug)) limit 1;

  if v_link.id is null then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if v_link.active is not true then
    return query select 'inactive'::text, null::text, null::text, null::text, null::text, null::text, v_link.user_id, v_link.company_id, v_link.id;
    return;
  end if;

  select * into v_profile from public.profiles where user_id = v_link.user_id limit 1;
  select * into v_company from public.companies where id = v_link.company_id limit 1;

  if v_profile.linkedin_url is null or length(trim(v_profile.linkedin_url)) = 0 then
    return query select 'missing_target'::text, null::text, v_profile.cv_file_url, v_profile.full_name, v_company.name, v_company.job_title, v_link.user_id, v_link.company_id, v_link.id;
    return;
  end if;

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
    user_id, company_id, tracking_link_id, event_type, slug, ip_hash, user_agent, country, browser, device_type, os, is_bot, is_duplicate
  ) values (
    v_link.user_id,
    v_link.company_id,
    v_link.id,
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
    case when p_event_type = 'view' then 'cv_viewed' else 'cv_downloaded' end,
    case when p_event_type = 'view' then 'CV page viewed' else 'CV downloaded' end,
    concat('CV event classified as ', case when v_duplicate then 'duplicate' when coalesce(p_is_bot, false) then 'bot' else 'human/unknown' end, '.'),
    jsonb_build_object('slug', v_link.slug, 'event_type', p_event_type, 'is_duplicate', v_duplicate, 'is_bot', coalesce(p_is_bot, false))
  );

  return query select 'ok'::text, v_profile.linkedin_url, v_profile.cv_file_url, v_profile.full_name, v_company.name, v_company.job_title, v_link.user_id, v_link.company_id, v_link.id;
end;
$$;

create or replace function public.mark_first_click_notification_sent(p_tracking_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tracking_links
  set first_click_notification_sent = true
  where id = p_tracking_link_id;
  return found;
end;
$$;

revoke all on function public.track_profile_click_and_get_target(text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.track_profile_click_and_get_target(text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

revoke all on function public.track_cv_event_and_get_payload(text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.track_cv_event_and_get_payload(text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

revoke all on function public.mark_first_click_notification_sent(uuid) from public;
grant execute on function public.mark_first_click_notification_sent(uuid) to service_role;
