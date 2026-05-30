create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  notification_email text,
  linkedin_url text,
  cv_file_url text,
  email_notifications_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_linkedin_url_check check (linkedin_url is null or linkedin_url = '' or linkedin_url ~* '^https://www\.linkedin\.com/in/.+'),
  constraint profiles_cv_file_url_check check (cv_file_url is null or cv_file_url = '' or cv_file_url ~* '^https?://.+')
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  job_title text,
  recruiter_name text,
  recruiter_email text,
  application_url text,
  status text not null default 'Applied',
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint companies_name_length_check check (char_length(trim(name)) between 2 and 120),
  constraint companies_status_check check (status in ('Applied', 'Link Opened', 'Interview', 'Rejected', 'Offer', 'Archived')),
  constraint companies_application_url_check check (application_url is null or application_url = '' or application_url ~* '^https?://.+')
);

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null,
  slug text not null unique,
  target_type text not null default 'linkedin',
  active boolean not null default true,
  first_human_click_at timestamptz,
  first_click_notification_sent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tracking_links_source_check check (source in ('CV', 'Cover Letter', 'Email', 'Email Signature', 'LinkedIn Message', 'Portfolio', 'Other')),
  constraint tracking_links_slug_format_check check (slug ~ '^[a-z0-9]{6,12}$'),
  constraint tracking_links_target_type_check check (target_type in ('linkedin', 'cv'))
);

create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tracking_link_id uuid not null references public.tracking_links(id) on delete cascade,
  clicked_at timestamptz not null default timezone('utc', now()),
  referrer text,
  user_agent text,
  ip_hash text,
  country text,
  browser text,
  device_type text,
  os text,
  is_bot boolean not null default false,
  is_duplicate boolean not null default false,
  click_type text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now()),
  constraint clicks_click_type_check check (click_type in ('human', 'bot', 'duplicate', 'unknown'))
);

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
  created_at timestamptz not null default timezone('utc', now()),
  constraint cv_events_type_check check (event_type in ('view', 'download'))
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

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists companies_status_idx on public.companies(status);
create index if not exists tracking_links_user_id_idx on public.tracking_links(user_id);
create index if not exists tracking_links_company_id_idx on public.tracking_links(company_id);
create index if not exists tracking_links_slug_idx on public.tracking_links(slug);
create index if not exists tracking_links_active_idx on public.tracking_links(active);
create index if not exists clicks_user_id_idx on public.clicks(user_id);
create index if not exists clicks_company_id_idx on public.clicks(company_id);
create index if not exists clicks_tracking_link_id_idx on public.clicks(tracking_link_id);
create index if not exists clicks_clicked_at_idx on public.clicks(clicked_at desc);
create index if not exists cv_events_user_id_idx on public.cv_events(user_id);
create index if not exists cv_events_tracking_link_id_idx on public.cv_events(tracking_link_id);
create index if not exists cv_events_created_at_idx on public.cv_events(created_at desc);
create index if not exists timeline_events_company_id_idx on public.timeline_events(company_id);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_follow_up_at_idx on public.reminders(follow_up_at);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();

drop trigger if exists tracking_links_set_updated_at on public.tracking_links;
create trigger tracking_links_set_updated_at before update on public.tracking_links for each row execute function public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at before update on public.reminders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, notification_email, linkedin_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'linkedin_url', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
