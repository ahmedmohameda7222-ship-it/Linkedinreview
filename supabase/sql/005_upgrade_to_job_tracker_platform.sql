-- Run this file once if you already deployed the older LinkedIn-only tracker schema.
-- For a fresh project, run 001_schema.sql and 002_rls_policies.sql instead.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists notification_email text;
alter table public.profiles add column if not exists cv_file_url text;
alter table public.profiles add column if not exists email_notifications_enabled boolean not null default true;
update public.profiles set notification_email = coalesce(notification_email, '') where notification_email is null;

alter table public.companies add column if not exists job_title text;
alter table public.companies add column if not exists recruiter_name text;
alter table public.companies add column if not exists recruiter_email text;
alter table public.companies add column if not exists application_url text;
alter table public.companies add column if not exists status text not null default 'Applied';
alter table public.companies add column if not exists applied_at timestamptz;
alter table public.companies add column if not exists notes text;

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null default 'CV',
  slug text not null unique,
  target_type text not null default 'linkedin',
  active boolean not null default true,
  first_human_click_at timestamptz,
  first_click_notification_sent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.tracking_links (user_id, company_id, source, slug, target_type, active, created_at, updated_at)
select c.user_id, c.id, 'CV', regexp_replace(lower(c.slug), '[^a-z0-9]', '', 'g'), 'linkedin', coalesce(c.active, true), c.created_at, c.updated_at
from public.companies c
where c.slug is not null
  and not exists (select 1 from public.tracking_links tl where tl.company_id = c.id);

alter table public.clicks add column if not exists tracking_link_id uuid references public.tracking_links(id) on delete cascade;
alter table public.clicks add column if not exists browser text;
alter table public.clicks add column if not exists device_type text;
alter table public.clicks add column if not exists os text;
alter table public.clicks add column if not exists is_bot boolean not null default false;
alter table public.clicks add column if not exists is_duplicate boolean not null default false;
alter table public.clicks add column if not exists click_type text not null default 'unknown';

update public.clicks c
set tracking_link_id = tl.id
from public.tracking_links tl
where c.company_id = tl.company_id and c.tracking_link_id is null;

create table if not exists public.cv_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  tracking_link_id uuid references public.tracking_links(id) on delete cascade,
  event_type text not null,
  slug text not null,
  ip_hash text,
  user_agent text,
  country text,
  browser text,
  device_type text,
  os text,
  is_bot boolean not null default false,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  follow_up_at timestamptz not null,
  follow_up_done boolean not null default false,
  follow_up_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Remove legacy columns that made new application inserts fail in the old schema.
alter table public.companies drop column if exists slug;
alter table public.companies drop column if exists target_url;
alter table public.companies drop column if exists active;

-- Re-run 002_rls_policies.sql after this migration so policies and RPC functions are replaced.
