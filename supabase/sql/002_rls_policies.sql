alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.clicks enable row level security;

-- Profiles: each authenticated user can manage only their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- Companies: each authenticated user can manage only their own tracking links.
drop policy if exists companies_select_own on public.companies;
create policy companies_select_own
on public.companies
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own
on public.companies
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own
on public.companies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists companies_delete_own on public.companies;
create policy companies_delete_own
on public.companies
for delete
to authenticated
using (auth.uid() = user_id);

-- Clicks: dashboard users can read only their own click events. Direct client inserts are intentionally not allowed.
drop policy if exists clicks_select_own on public.clicks;
create policy clicks_select_own
on public.clicks
for select
to authenticated
using (auth.uid() = user_id);

-- Safe public click recording and target lookup.
-- Public callers only receive a status and the target URL for a valid active slug.
-- They cannot list companies, profiles, or clicks through table policies.
create or replace function public.track_click_and_get_target(
  p_slug text,
  p_referrer text default null,
  p_user_agent text default null,
  p_ip_hash text default null,
  p_country text default null,
  p_device text default null
)
returns table(status text, target_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_user_id uuid;
  v_active boolean;
  v_target_url text;
begin
  select c.id, c.user_id, c.active, p.linkedin_url
  into v_company_id, v_user_id, v_active, v_target_url
  from public.companies c
  left join public.profiles p on p.user_id = c.user_id
  where c.slug = lower(trim(p_slug))
  limit 1;

  if v_company_id is null then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  if v_active is not true then
    return query select 'inactive'::text, null::text;
    return;
  end if;

  if v_target_url is null or length(trim(v_target_url)) = 0 then
    return query select 'missing_target'::text, null::text;
    return;
  end if;

  insert into public.clicks (
    user_id,
    company_id,
    clicked_at,
    referrer,
    user_agent,
    ip_hash,
    country,
    device
  ) values (
    v_user_id,
    v_company_id,
    timezone('utc', now()),
    left(nullif(p_referrer, ''), 1000),
    left(nullif(p_user_agent, ''), 1000),
    left(nullif(p_ip_hash, ''), 128),
    left(nullif(p_country, ''), 80),
    left(nullif(p_device, ''), 120)
  );

  return query select 'ok'::text, v_target_url::text;
end;
$$;

revoke all on function public.track_click_and_get_target(text, text, text, text, text, text) from public;
grant execute on function public.track_click_and_get_target(text, text, text, text, text, text) to anon, authenticated;
